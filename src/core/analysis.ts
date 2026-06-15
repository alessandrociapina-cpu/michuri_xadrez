import { Chess } from './chess';
import { sanParaPtBr } from './notation';
import { detectarAbertura } from './openingDetect';
import type { Engine } from './engine';

// Análise de partida com o Stockfish. Estratégia (estilo Lichess):
//   1) Reproduzimos a partida e guardamos o FEN de cada posição (0..N).
//   2) Avaliamos CADA posição uma vez. A avaliação da posição k (perspectiva de
//      quem tem a vez) é, ao mesmo tempo, "o melhor que o jogador da vez podia
//      conseguir" ANTES do lance k e, negada, "o que sobrou" DEPOIS do lance
//      k-1. Assim, uma única varredura basta para medir a perda de cada lance.
//   3) Classificamos cada lance pela perda em centésimos de peão (centipawns) e
//      calculamos a precisão (%) de cada lado.

export type Classe =
  | 'livro'
  | 'brilhante'
  | 'melhor'
  | 'bom'
  | 'ok'
  | 'impreciso'
  | 'erro'
  | 'errograve';

export type LanceAnalisado = {
  /** Índice 0-based do meio-lance. */
  ply: number;
  /** Número do lance cheio (1, 1, 2, 2, …). */
  numero: number;
  cor: 'white' | 'black';
  san: string;
  ptbr: string;
  /** FEN depois de aplicado o lance (para navegar). */
  fenDepois: string;
  /** Melhor lance do motor naquela posição, em SAN PT-BR. */
  melhorPtbr?: string;
  /** Avaliação (cp, perspectiva das BRANCAS) antes e depois do lance. */
  avalAntesBrancas: number;
  avalDepoisBrancas: number;
  /** Perda do lance, em cp, na perspectiva de quem moveu (≥ 0). */
  perda: number;
  classe: Classe;
  /** Havia mate forçado em jogo nesta posição. */
  mate: boolean;
};

export type ContagemClasse = Record<Classe, number>;

export type Relatorio = {
  lances: LanceAnalisado[];
  precisao: { white: number; black: number };
  contagem: { white: ContagemClasse; black: ContagemClasse };
  movetimeMs: number;
};

const VALOR: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Converte cp/mate do motor numa pontuação única em cp (mate = valor enorme). */
function paraCp(cp?: number, mate?: number): number {
  if (mate !== undefined) {
    const GRANDE = 100000;
    // mate > 0: vamos dar mate; mate < 0: vamos levar. Lances até o mate reduzem
    // levemente a magnitude (mate em 1 vale mais que mate em 8).
    return mate > 0 ? GRANDE - mate * 100 : -GRANDE - mate * 100;
  }
  return cp ?? 0;
}

/** Probabilidade de vitória (0–100) a partir do cp — fórmula do Lichess. */
function winPct(cp: number): number {
  const v = 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
  return 50 + 50 * v;
}

/** Precisão (0–100) de um lance a partir da queda de win% de quem moveu. */
function precisaoLance(wpAntes: number, wpDepois: number): number {
  const queda = Math.max(0, wpAntes - wpDepois);
  const acc = 103.1668 * Math.exp(-0.04354 * queda) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

/** Soma do material (em peões) de um lado, a partir do campo de peças do FEN. */
function material(fen: string, cor: 'white' | 'black'): number {
  const placement = fen.split(' ')[0];
  let soma = 0;
  for (const ch of placement) {
    const low = ch.toLowerCase();
    if (VALOR[low] === undefined) continue;
    const ehBranca = ch !== low;
    if ((cor === 'white') === ehBranca) soma += VALOR[low];
  }
  return soma;
}

function uciParaPtbr(fen: string, uci?: string): string | undefined {
  if (!uci || uci.length < 4) return undefined;
  const c = new Chess(fen);
  try {
    const m = c.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4) : undefined,
    });
    return m ? sanParaPtBr(m.san) : undefined;
  } catch {
    return undefined;
  }
}

function classePorPerda(perda: number): Classe {
  if (perda <= 10) return 'melhor';
  if (perda <= 35) return 'bom';
  if (perda <= 80) return 'ok';
  if (perda <= 150) return 'impreciso';
  if (perda <= 300) return 'erro';
  return 'errograve';
}

function contagemVazia(): ContagemClasse {
  return {
    livro: 0,
    brilhante: 0,
    melhor: 0,
    bom: 0,
    ok: 0,
    impreciso: 0,
    erro: 0,
    errograve: 0,
  };
}

/** Quantos miados um lance merece: bom = 1, brilhante = 2, o resto = 0. */
export function miadosDe(classe: Classe): number {
  if (classe === 'brilhante') return 2;
  if (classe === 'melhor' || classe === 'bom') return 1;
  return 0;
}

/**
 * Analisa a partida (lista de SAN) com o motor. Devolve null se for cancelada via
 * `deveAbortar`. `onProgresso(feito, total)` reporta o andamento.
 */
export async function analisarPartida(
  sans: string[],
  eng: Engine,
  movetimeMs: number,
  onProgresso?: (feito: number, total: number) => void,
  deveAbortar?: () => boolean,
): Promise<Relatorio | null> {
  await eng.pronto;

  // Reproduz a partida e coleta os FENs de cada posição.
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  const lances: { san: string; cor: 'white' | 'black' }[] = [];
  for (const s of sans) {
    let m;
    try {
      m = chess.move(s);
    } catch {
      break;
    }
    if (!m) break;
    lances.push({ san: m.san, cor: m.color === 'w' ? 'white' : 'black' });
    fens.push(chess.fen());
  }
  const N = lances.length;
  if (N === 0) return null;

  // Avalia cada posição 0..N (perspectiva de quem tem a vez).
  const total = N + 1;
  const evalVez: number[] = new Array(total).fill(0);
  const melhorUci: (string | undefined)[] = new Array(total).fill(undefined);
  const ehMate: boolean[] = new Array(total).fill(false);
  for (let k = 0; k < total; k++) {
    if (deveAbortar?.()) return null;
    const r = await eng.analyze(fens[k], movetimeMs);
    evalVez[k] = paraCp(r.cp, r.mate);
    melhorUci[k] = r.best;
    ehMate[k] = r.mate !== undefined;
    onProgresso?.(k + 1, total);
  }

  // Brancas têm a vez nas posições de índice par (a partida começa nelas).
  const evalBrancas = (k: number) => (k % 2 === 0 ? evalVez[k] : -evalVez[k]);

  const abertura = detectarAbertura(sans);
  const lancesNaTeoria = abertura ? abertura.lancesNaTeoria : 0;

  const resultado: LanceAnalisado[] = [];
  const contagem = { white: contagemVazia(), black: contagemVazia() };
  const somaPrec = { white: 0, black: 0 };
  const qtd = { white: 0, black: 0 };

  for (let k = 0; k < N; k++) {
    const mover = lances[k].cor;
    // Melhor que o jogador da vez podia obter (perspectiva dele) = eval da posição.
    const melhorMover = evalVez[k];
    // Eval realizada após o lance jogado (perspectiva dele) = -eval da posição seguinte.
    const realMover = -evalVez[k + 1];
    const perda = Math.max(0, melhorMover - realMover);

    let classe: Classe;
    if (k < lancesNaTeoria) {
      classe = 'livro';
    } else {
      classe = classePorPerda(perda);
      // Brilhante: lance quase perfeito que SACRIFICA material e segue ganhando.
      // Detectamos o sacrifício comparando o material de quem moveu antes do
      // lance e depois da resposta do adversário (duas posições à frente).
      if (classe === 'melhor' && realMover >= 50 && k + 2 <= N) {
        const antes = material(fens[k], mover);
        const depois = material(fens[k + 2], mover);
        if (antes - depois >= 2) classe = 'brilhante';
      }
    }

    contagem[mover][classe] += 1;

    const wpAntes = winPct(melhorMover);
    const wpDepois = winPct(realMover);
    somaPrec[mover] += precisaoLance(wpAntes, wpDepois);
    qtd[mover] += 1;

    resultado.push({
      ply: k,
      numero: Math.floor(k / 2) + 1,
      cor: mover,
      san: lances[k].san,
      ptbr: sanParaPtBr(lances[k].san),
      fenDepois: fens[k + 1],
      melhorPtbr: uciParaPtbr(fens[k], melhorUci[k]),
      avalAntesBrancas: evalBrancas(k),
      avalDepoisBrancas: evalBrancas(k + 1),
      perda,
      classe,
      mate: ehMate[k] || ehMate[k + 1],
    });
  }

  return {
    lances: resultado,
    precisao: {
      white: qtd.white ? somaPrec.white / qtd.white : 100,
      black: qtd.black ? somaPrec.black / qtd.black : 100,
    },
    contagem,
    movetimeMs,
  };
}

// ---- Rótulos e símbolos para a UI ----
export const ROTULO_CLASSE: Record<Classe, string> = {
  brilhante: 'Brilhante',
  melhor: 'Melhor',
  bom: 'Bom',
  livro: 'Teoria',
  ok: 'Ok',
  impreciso: 'Imprecisão',
  erro: 'Erro',
  errograve: 'Erro grave',
};

export const SIMBOLO_CLASSE: Record<Classe, string> = {
  brilhante: '!!',
  melhor: '★',
  bom: '!',
  livro: '📖',
  ok: '',
  impreciso: '?!',
  erro: '?',
  errograve: '??',
};
