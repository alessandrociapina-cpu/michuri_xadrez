// Integração com a API pública do Lichess (Módulo 2 — base de dados online).
//
// Usamos só o Explorer de mestres, endpoint GRATUITO, SEM TOKEN e com CORS
// liberado — estatísticas reais de partidas de Grandes Mestres na posição. É
// "online-only": lança um LichessErro descritivo quando falha.
//
// IMPORTANTE: o host correto do explorer é "explorer.lichess.org". O antigo
// "explorer.lichess.ovh" foi descontinuado e passou a responder 401.
//
// Desde 2026 o explorer EXIGE autenticação: enviamos o token OAuth do usuário
// (ver lichessAuth.ts) no cabeçalho Authorization.
import { getToken } from './lichessAuth';
import { Chess } from './chess';
import type { Puzzle } from './puzzles';

const EXPLORER = 'https://explorer.lichess.org/masters';

export type TipoErro = 'offline' | 'limite' | 'recusado' | 'bloqueio' | 'status' | 'timeout';

export class LichessErro extends Error {
  tipo: TipoErro;
  status?: number;
  constructor(tipo: TipoErro, mensagem: string, status?: number) {
    super(mensagem);
    this.name = 'LichessErro';
    this.tipo = tipo;
    this.status = status;
  }
}

async function requisitar(
  url: string,
  signal?: AbortSignal,
  accept = 'application/json',
  timeoutMs = 9000,
  // Endpoints PÚBLICOS que declaram um escopo (ex.: /api/puzzle/next) rejeitam
  // (403) um token sem aquele escopo; chamamos esses de forma anônima (auth=false).
  auth = true,
): Promise<Response> {
  const ctrl = new AbortController();
  const aoAbortar = () => ctrl.abort();
  signal?.addEventListener('abort', aoAbortar, { once: true });
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers: Record<string, string> = { Accept: accept };
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  let r: Response;
  try {
    r = await fetch(url, { signal: ctrl.signal, headers });
  } catch (e) {
    if (signal?.aborted) throw e; // cancelamento legítimo (troca de posição)
    if (ctrl.signal.aborted) throw new LichessErro('timeout', 'O Lichess demorou a responder.');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new LichessErro('offline', 'Você está sem conexão com a internet.');
    }
    throw new LichessErro(
      'bloqueio',
      'Não foi possível acessar o Lichess (bloqueio do navegador/rede ou serviço fora do ar).',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', aoAbortar);
  }
  if (r.status === 401 || r.status === 403) {
    throw new LichessErro(
      'recusado',
      'O Lichess recusou o acesso (' +
        r.status +
        '). Entre novamente com sua conta do Lichess (o login pode ter expirado).',
      r.status,
    );
  }
  if (r.status === 429) {
    throw new LichessErro('limite', 'Muitas consultas seguidas — aguarde alguns segundos.', 429);
  }
  if (!r.ok) throw new LichessErro('status', `O Lichess respondeu ${r.status}.`, r.status);
  return r;
}

export type ExplorerMove = {
  san: string;
  white: number;
  draws: number;
  black: number;
  jogos: number;
};

export type ExplorerGame = {
  id: string;
  brancas: string;
  pretas: string;
  vencedor: 'white' | 'black' | 'draw';
  ano?: number;
};

export type ExplorerResultado = {
  totalJogos: number;
  lances: ExplorerMove[];
  partidas: ExplorerGame[];
};

export async function buscarExplorer(
  fen: string,
  signal?: AbortSignal,
): Promise<ExplorerResultado> {
  const url = `${EXPLORER}?fen=${encodeURIComponent(fen)}&moves=10&topGames=4`;
  const r = await requisitar(url, signal);
  const j = (await r.json()) as {
    white?: number;
    draws?: number;
    black?: number;
    moves?: { san: string; white: number; draws: number; black: number }[];
    topGames?: {
      id?: string;
      winner?: 'white' | 'black';
      white?: { name?: string };
      black?: { name?: string };
      year?: number;
    }[];
  } | null;
  if (!j) throw new LichessErro('status', 'Resposta vazia do Lichess.');
  const lances: ExplorerMove[] = (j.moves ?? []).map((m) => ({
    san: m.san,
    white: m.white,
    draws: m.draws,
    black: m.black,
    jogos: (m.white ?? 0) + (m.draws ?? 0) + (m.black ?? 0),
  }));
  const partidas: ExplorerGame[] = (j.topGames ?? []).map((g) => ({
    id: g.id ?? '',
    brancas: g.white?.name ?? '?',
    pretas: g.black?.name ?? '?',
    vencedor: g.winner ?? 'draw',
    ano: g.year,
  }));
  const totalJogos = (j.white ?? 0) + (j.draws ?? 0) + (j.black ?? 0);
  return { totalJogos, lances, partidas };
}

export type DificuldadePuzzle = 'easiest' | 'easier' | 'normal' | 'harder' | 'hardest';

/**
 * Busca um puzzle do Lichess (endpoint público /api/puzzle/next, com CORS).
 * Logado, retorna puzzles ainda não vistos. Aceita filtro de dificuldade.
 */
export async function buscarPuzzleLichess(
  dificuldade?: DificuldadePuzzle,
  signal?: AbortSignal,
): Promise<Puzzle> {
  const qs = dificuldade ? `?difficulty=${dificuldade}` : '';
  // Anônimo (auth=false): o puzzle é público e um token sem escopo puzzle:read
  // levaria a 403. Assim funciona logado ou não.
  const r = await requisitar(
    `https://lichess.org/api/puzzle/next${qs}`,
    signal,
    'application/json',
    9000,
    false,
  );
  const j = (await r.json()) as {
    game?: { pgn?: string };
    puzzle: {
      id: string;
      fen?: string;
      initialPly?: number;
      lastMove?: string;
      solution: string[];
      rating?: number;
      themes?: string[];
    };
  };

  const sol = j.puzzle.solution ?? [];
  if (sol.length === 0) throw new LichessErro('status', 'Puzzle sem solução.');

  // Montagem ROBUSTA: em vez de confiar numa única convenção (que variava e
  // gerava setas ilegais), montamos candidatos de posição inicial e escolhemos a
  // interpretação em que TODA a solução é legal. Assim a posição e os lances
  // mostrados são sempre consistentes.
  const candidatos: { fen: string; lance?: [string, string] }[] = [];
  // 1) Reconstrução canônica: game.pgn reproduzido até initialPly.
  if (j.game?.pgn && j.puzzle.initialPly != null) {
    const c = new Chess();
    for (const san of sanDoPgn(j.game.pgn).slice(0, j.puzzle.initialPly)) {
      try {
        c.move(san);
      } catch {
        break;
      }
    }
    const hist = c.history({ verbose: true });
    const last = hist[hist.length - 1];
    candidatos.push({
      fen: c.fen(),
      lance: last ? [last.from, last.to] : undefined,
    });
  }
  // 2) FEN entregue pela API.
  if (j.puzzle.fen) {
    const lm = j.puzzle.lastMove;
    candidatos.push({
      fen: j.puzzle.fen,
      lance: lm && lm.length >= 4 ? [lm.slice(0, 2), lm.slice(2, 4)] : undefined,
    });
  }

  const montado = montarPuzzle(candidatos, sol);
  if (!montado) {
    throw new LichessErro('status', 'Não foi possível montar este puzzle (dados inconsistentes).');
  }

  return {
    id: j.puzzle.id,
    fen: montado.fen,
    solucao: montado.solucao,
    orientacao: montado.fen.split(' ')[1] === 'w' ? 'white' : 'black',
    lance: montado.lance,
    fonte: 'lichess',
    rating: j.puzzle.rating,
    temas: j.puzzle.themes,
  };
}

/** Extrai os lances SAN de um PGN (descarta números, comentários e resultado). */
function sanDoPgn(pgn: string): string[] {
  return pgn
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Aplica uma sequência de lances UCI a uma FEN; devolve a FEN final ou null se algum for ilegal. */
function aplicarLinha(fen: string, ucis: string[]): string | null {
  const c = new Chess(fen);
  for (const u of ucis) {
    if (u.length < 4) return null;
    try {
      const m = c.move({
        from: u.slice(0, 2),
        to: u.slice(2, 4),
        promotion: u.length > 4 ? u.slice(4) : undefined,
      });
      if (!m) return null;
    } catch {
      return null;
    }
  }
  return c.fen();
}

/**
 * Escolhe, entre os candidatos de posição, a interpretação em que a solução é
 * totalmente legal. Preferimos a convenção do Lichess (solution[0] = lance do
 * ADVERSÁRIO; o jogador resolve solution[1..]); se não couber, tentamos a
 * convenção "o jogador joga solution[0]".
 */
function montarPuzzle(
  candidatos: { fen: string; lance?: [string, string] }[],
  sol: string[],
): { fen: string; solucao: string[]; lance?: [string, string] } | null {
  // Convenção do Lichess: solution[0] é SEMPRE o lance do adversário (o "setup"),
  // e o jogador resolve solution[1..]. Para cada candidato:
  //   • se solution[0] é legal nele, o candidato é PRÉ-setup → aplicamos o setup;
  //   • se solution[0] é ilegal (já foi jogado), o candidato JÁ é a posição do
  //     jogador (pós-setup) → usamos como está.
  // Em ambos, validamos que o restante da solução é totalmente legal.
  if (sol.length > 1) {
    const setupSquares: [string, string] = [sol[0].slice(0, 2), sol[0].slice(2, 4)];
    const resto = sol.slice(1);
    for (const cand of candidatos) {
      const aposSetup = aplicarLinha(cand.fen, [sol[0]]);
      if (aposSetup !== null) {
        if (aplicarLinha(aposSetup, resto) !== null) {
          return { fen: aposSetup, solucao: resto, lance: setupSquares };
        }
      } else if (aplicarLinha(cand.fen, resto) !== null) {
        return { fen: cand.fen, solucao: resto, lance: cand.lance ?? setupSquares };
      }
    }
  }
  // Fallback (dados atípicos): o jogador joga solution[0] direto.
  for (const cand of candidatos) {
    if (aplicarLinha(cand.fen, sol) !== null) {
      return { fen: cand.fen, solucao: sol, lance: cand.lance };
    }
  }
  return null;
}

/** Baixa o PGN de uma partida da base de mestres (texto PGN). */
export async function buscarPgnMestre(id: string, signal?: AbortSignal): Promise<string> {
  const r = await requisitar(`https://explorer.lichess.org/masters/pgn/${id}`, signal, 'application/x-chess-pgn');
  const txt = (await r.text()).trim();
  if (!txt) throw new LichessErro('status', 'PGN vazio retornado pelo Lichess.');
  return txt;
}
