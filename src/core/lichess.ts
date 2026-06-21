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

  // FEN base = posição ANTES do lance que arma o puzzle. A API pode entregar o
  // FEN; senão, reconstruímos do PGN + initialPly.
  let fenBase = j.puzzle.fen;
  if (!fenBase && j.game?.pgn && j.puzzle.initialPly != null) {
    const c = new Chess();
    const moves = j.game.pgn.split(/\s+/).filter(Boolean);
    for (let i = 0; i < j.puzzle.initialPly && i < moves.length; i++) {
      try {
        c.move(moves[i]);
      } catch {
        break;
      }
    }
    fenBase = c.fen();
  }
  if (!fenBase) throw new LichessErro('status', 'Puzzle sem posição utilizável.');

  // CONVENÇÃO DO LICHESS: solution[0] é SEMPRE o lance do ADVERSÁRIO (o "setup"
  // que arma o problema) — nunca a resposta do jogador. Por isso a solução do
  // JOGADOR é sempre solution[1..]. Quanto à posição:
  //   • se o fen vem ANTES do setup, solution[0] é legal e o aplicamos;
  //   • se o fen já vem DEPOIS do setup (caso da API), solution[0] é ilegal
  //     (já foi jogado) e mantemos o fen como está.
  // Em ambos os casos chegamos à posição em que é a vez do jogador resolver.
  const sol = j.puzzle.solution ?? [];
  const chess = new Chess(fenBase);
  let lance: [string, string] | undefined;
  if (sol.length > 1) {
    const m0 = sol[0];
    lance = [m0.slice(0, 2), m0.slice(2, 4)]; // destaque do lance que armou o puzzle
    try {
      chess.move({
        from: m0.slice(0, 2),
        to: m0.slice(2, 4),
        promotion: m0.length > 4 ? m0.slice(4) : undefined,
      });
    } catch {
      /* setup já refletido no fen — não aplica */
    }
  } else {
    const lm = j.puzzle.lastMove;
    lance = lm && lm.length >= 4 ? [lm.slice(0, 2), lm.slice(2, 4)] : undefined;
  }
  const fenSolver = chess.fen();
  return {
    id: j.puzzle.id,
    fen: fenSolver,
    solucao: sol.length > 1 ? sol.slice(1) : sol,
    orientacao: fenSolver.split(' ')[1] === 'w' ? 'white' : 'black',
    lance,
    fonte: 'lichess',
    rating: j.puzzle.rating,
    temas: j.puzzle.themes,
  };
}

/** Baixa o PGN de uma partida da base de mestres (texto PGN). */
export async function buscarPgnMestre(id: string, signal?: AbortSignal): Promise<string> {
  const r = await requisitar(`https://explorer.lichess.org/masters/pgn/${id}`, signal, 'application/x-chess-pgn');
  const txt = (await r.text()).trim();
  if (!txt) throw new LichessErro('status', 'PGN vazio retornado pelo Lichess.');
  return txt;
}
