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
): Promise<Response> {
  const ctrl = new AbortController();
  const aoAbortar = () => ctrl.abort();
  signal?.addEventListener('abort', aoAbortar, { once: true });
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers: Record<string, string> = { Accept: accept };
  const token = getToken();
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

/** Baixa o PGN de uma partida da base de mestres (texto PGN). */
export async function buscarPgnMestre(id: string, signal?: AbortSignal): Promise<string> {
  const r = await requisitar(`https://explorer.lichess.org/masters/pgn/${id}`, signal, 'application/x-chess-pgn');
  const txt = (await r.text()).trim();
  if (!txt) throw new LichessErro('status', 'PGN vazio retornado pelo Lichess.');
  return txt;
}
