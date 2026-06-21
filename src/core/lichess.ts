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

  // Posições-base possíveis (a vez de quem resolve). A principal é o FIM do
  // game.pgn — é o que o Lichess mostra (posição após o último lance do
  // adversário, com o jogador a mover, jogando solution[0]).
  const bases: { fen: string; lance?: [string, string] }[] = [];
  if (j.game?.pgn) {
    const fim = posFinalPgn(j.game.pgn);
    if (fim) bases.push(fim);
    if (j.puzzle.initialPly != null) {
      const ate = posAteN(j.game.pgn, j.puzzle.initialPly);
      if (ate) bases.push(ate);
    }
  }
  if (j.puzzle.fen) {
    const lm = j.puzzle.lastMove;
    bases.push({
      fen: j.puzzle.fen,
      lance: lm && lm.length >= 4 ? [lm.slice(0, 2), lm.slice(2, 4)] : undefined,
    });
  }

  const montado = montarPuzzle(bases, sol);
  if (!montado) {
    const diag = `sol0=${sol[0] ?? '-'} bases=${bases.map((b) => b.fen.split(' ')[1]).join(',') || '-'}`;
    throw new LichessErro('status', `Não foi possível montar este puzzle. [${diag}]`);
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

/** Posição e último lance ao fim do PGN (loadPgn robusto, com replay manual de reserva). */
function posFinalPgn(pgn: string): { fen: string; lance?: [string, string] } | null {
  let c = new Chess();
  let ok = false;
  try {
    c.loadPgn(pgn);
    ok = c.history().length > 0;
  } catch {
    ok = false;
  }
  if (!ok) {
    c = new Chess();
    for (const san of sanDoPgn(pgn)) {
      try {
        c.move(san);
      } catch {
        break;
      }
    }
  }
  const h = c.history({ verbose: true });
  if (h.length === 0) return null;
  const last = h[h.length - 1];
  return { fen: c.fen(), lance: [last.from, last.to] };
}

/** Posição após N meios-lances do PGN. */
function posAteN(pgn: string, n: number): { fen: string; lance?: [string, string] } | null {
  const c = new Chess();
  const sans = sanDoPgn(pgn);
  for (let i = 0; i < n && i < sans.length; i++) {
    try {
      c.move(sans[i]);
    } catch {
      break;
    }
  }
  const h = c.history({ verbose: true });
  const last = h[h.length - 1];
  return { fen: c.fen(), lance: last ? [last.from, last.to] : undefined };
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
 * Escolhe a montagem (posição + solução do jogador) em que TODA a solução é
 * legal, testando interpretações em ordem de preferência:
 *   1. o jogador joga solution[0] a partir do FIM do pgn (comportamento do site);
 *   2. "setup-first": aplica solution[0] (lance do adversário) e o jogador
 *      resolve solution[1..];
 *   3. "pós-setup": a base já é a posição do jogador, resolve solution[1..];
 *   4. o jogador joga solution[0] a partir de qualquer base.
 * A validação por legalidade garante que nunca mostramos um lance inexistente.
 */
function montarPuzzle(
  bases: { fen: string; lance?: [string, string] }[],
  sol: string[],
): { fen: string; solucao: string[]; lance?: [string, string] } | null {
  if (bases.length === 0) return null;
  const setup: [string, string] | undefined =
    sol[0] && sol[0].length >= 4 ? [sol[0].slice(0, 2), sol[0].slice(2, 4)] : undefined;
  const resto = sol.length > 1 ? sol.slice(1) : null;

  type T = { fen: string; solucao: string[]; lance?: [string, string] };
  const tuplas: T[] = [];

  // 1. solver-first a partir do fim do pgn (base[0]).
  tuplas.push({ fen: bases[0].fen, solucao: sol, lance: bases[0].lance });
  // 2. setup-first em cada base.
  if (resto) {
    for (const b of bases) {
      const ap = aplicarLinha(b.fen, [sol[0]]);
      if (ap) tuplas.push({ fen: ap, solucao: resto, lance: setup });
    }
  }
  // 3. pós-setup em cada base (descarta solution[0], já jogado).
  if (resto) {
    for (const b of bases) tuplas.push({ fen: b.fen, solucao: resto, lance: b.lance ?? setup });
  }
  // 4. solver-first em qualquer base.
  for (const b of bases) tuplas.push({ fen: b.fen, solucao: sol, lance: b.lance });

  for (const t of tuplas) {
    if (t.solucao.length > 0 && aplicarLinha(t.fen, t.solucao) !== null) return t;
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
