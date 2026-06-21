import { Chess } from './chess';
import { sanParaPtBr } from './notation';
import type { Relatorio } from './analysis';

// Modelo unificado de puzzle, usado tanto pelos problemas do Lichess quanto pelos
// gerados a partir dos SEUS erros numa partida analisada.

export type Puzzle = {
  id: string;
  /** Posição inicial (é a vez de quem resolve). */
  fen: string;
  /** Solução em UCI; índices pares = quem resolve, ímpares = resposta forçada. */
  solucao: string[];
  /** Lado de quem resolve (orientação do tabuleiro). */
  orientacao: 'white' | 'black';
  /** Lance que armou o puzzle (para destacar), em [origem, destino]. */
  lance?: [string, string];
  fonte: 'lichess' | 'erro';
  rating?: number;
  temas?: string[];
  titulo?: string;
  contexto?: string;
};

/**
 * Gera puzzles a partir dos erros/erros graves de uma partida analisada: a
 * posição é a de ANTES do lance ruim, e a solução é o melhor lance do motor.
 */
export function gerarPuzzlesDeErros(relatorio: Relatorio): Puzzle[] {
  const puzzles: Puzzle[] = [];
  for (const l of relatorio.lances) {
    if (l.classe !== 'erro' && l.classe !== 'errograve') continue;
    if (!l.melhorUci || !l.fenAntes) continue;
    // Confere se o melhor lance é legal na posição (segurança).
    const c = new Chess(l.fenAntes);
    let ok = false;
    try {
      ok = !!c.move({
        from: l.melhorUci.slice(0, 2),
        to: l.melhorUci.slice(2, 4),
        promotion: l.melhorUci.length > 4 ? l.melhorUci.slice(4) : undefined,
      });
    } catch {
      ok = false;
    }
    if (!ok) continue;
    const pontos = l.cor === 'black' ? '...' : '.';
    puzzles.push({
      id: `erro-${l.ply}`,
      fen: l.fenAntes,
      solucao: [l.melhorUci],
      orientacao: l.cor,
      fonte: 'erro',
      titulo: `Lance ${l.numero}${pontos} — ${l.classe === 'errograve' ? 'erro grave' : 'erro'}`,
      contexto: `Na partida você jogou ${l.ptbr}. Encontre o melhor lance.`,
    });
  }
  return puzzles;
}

/** Converte uma sequência da solução (UCI) em texto PT-BR a partir de uma FEN. */
export function solucaoPtbr(fen: string, solucao: string[], max = 6): string {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const uci of solucao.slice(0, max)) {
    if (uci.length < 4) break;
    try {
      const m = c.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4) : undefined,
      });
      if (!m) break;
      out.push(sanParaPtBr(m.san));
    } catch {
      break;
    }
  }
  return out.join(' ');
}

// ---- Estatísticas simples (motivação), persistidas em localStorage ----
export type EstatPuzzle = { resolvidos: number; sequencia: number; recorde: number };

const CHAVE = 'michuri_puzzle_stats';

export function lerEstat(): EstatPuzzle {
  try {
    const j = JSON.parse(localStorage.getItem(CHAVE) || '{}');
    return { resolvidos: j.resolvidos || 0, sequencia: j.sequencia || 0, recorde: j.recorde || 0 };
  } catch {
    return { resolvidos: 0, sequencia: 0, recorde: 0 };
  }
}

/**
 * Atualiza as estatísticas:
 *  - resolvido: contabiliza em "resolvidos" (todo puzzle resolvido conta,
 *    mesmo que com erros);
 *  - limpo: resolvido SEM erros → aumenta a sequência (e o recorde).
 *  Se não foi resolvido (ex.: viu a solução), a sequência zera.
 */
export function registrarResultado(resolvido: boolean, limpo: boolean): EstatPuzzle {
  const e = lerEstat();
  if (resolvido) {
    e.resolvidos += 1;
    if (limpo) {
      e.sequencia += 1;
      e.recorde = Math.max(e.recorde, e.sequencia);
    } else {
      e.sequencia = 0;
    }
  } else {
    e.sequencia = 0;
  }
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e));
  } catch {
    /* storage indisponível */
  }
  return e;
}
