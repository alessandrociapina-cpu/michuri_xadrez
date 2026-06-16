// Integração com a API pública do Lichess (Módulo 2 — análise em nuvem).
//
// Usamos apenas endpoints GRATUITOS e SEM TOKEN, que aceitam CORS e funcionam
// direto do navegador:
//   • Explorer de mestres  — estatísticas reais de partidas de GMs na posição.
//   • Cloud Eval           — avaliação do Stockfish na nuvem (quando a posição
//                            já está na base; caso contrário devolve 404).
//
// Tudo é "online-only": cada função recebe um AbortSignal e lança um LichessErro
// descritivo em caso de falha, para a UI mostrar a causa real (offline, CORS,
// limite de uso, etc.) em vez de uma mensagem genérica.

const EXPLORER = 'https://explorer.lichess.ovh/masters';
const CLOUD = 'https://lichess.org/api/cloud-eval';

export type TipoErro = 'offline' | 'limite' | 'bloqueio' | 'status' | 'timeout';

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

// Faz o fetch com timeout próprio + repasse do AbortSignal externo, traduzindo
// as falhas (rede/CORS/timeout/status) num LichessErro classificado.
async function buscarJson(url: string, signal?: AbortSignal, timeoutMs = 9000): Promise<unknown> {
  const ctrl = new AbortController();
  const aoAbortar = () => ctrl.abort();
  signal?.addEventListener('abort', aoAbortar, { once: true });
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let r: Response;
  try {
    r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
  } catch (e) {
    if (signal?.aborted) throw e; // cancelamento legítimo (troca de posição) — repassa
    if (ctrl.signal.aborted) throw new LichessErro('timeout', 'O Lichess demorou a responder.');
    // fetch só lança TypeError quando a requisição nem completa: offline, DNS,
    // CORS bloqueado pelo navegador, etc.
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
  if (r.status === 429) {
    throw new LichessErro('limite', 'Muitas consultas seguidas — aguarde alguns segundos.', 429);
  }
  if (r.status === 404) return null;
  if (!r.ok) throw new LichessErro('status', `O Lichess respondeu ${r.status}.`, r.status);
  return r.json();
}

export type ExplorerMove = {
  san: string;
  white: number;
  draws: number;
  black: number;
  jogos: number;
};

export type ExplorerGame = {
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
  const j = (await buscarJson(url, signal)) as {
    white?: number;
    draws?: number;
    black?: number;
    moves?: { san: string; white: number; draws: number; black: number }[];
    topGames?: {
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
    brancas: g.white?.name ?? '?',
    pretas: g.black?.name ?? '?',
    vencedor: g.winner ?? 'draw',
    ano: g.year,
  }));
  const totalJogos = (j.white ?? 0) + (j.draws ?? 0) + (j.black ?? 0);
  return { totalJogos, lances, partidas };
}

export type CloudEval = {
  /** Avaliação em cp na perspectiva das BRANCAS (ou mate). */
  cpBrancas?: number;
  mate?: number;
  depth: number;
  /** Variante principal em UCI. */
  pv: string[];
};

export async function buscarCloudEval(
  fen: string,
  signal?: AbortSignal,
): Promise<CloudEval | null> {
  const url = `${CLOUD}?fen=${encodeURIComponent(fen)}&multiPv=1`;
  const j = (await buscarJson(url, signal)) as {
    depth?: number;
    pvs?: { moves?: string; cp?: number; mate?: number }[];
  } | null;
  if (!j) return null; // 404: posição não está na base da nuvem
  const pv = j.pvs?.[0];
  if (!pv) return null;
  // O cp do cloud-eval vem na perspectiva de quem tem a vez; convertemos p/ brancas.
  const brancasVez = fen.split(' ')[1] === 'w';
  let cpBrancas: number | undefined;
  let mate: number | undefined;
  if (typeof pv.cp === 'number') cpBrancas = brancasVez ? pv.cp : -pv.cp;
  if (typeof pv.mate === 'number') mate = brancasVez ? pv.mate : -pv.mate;
  return {
    cpBrancas,
    mate,
    depth: j.depth ?? 0,
    pv: typeof pv.moves === 'string' ? pv.moves.split(/\s+/) : [],
  };
}
