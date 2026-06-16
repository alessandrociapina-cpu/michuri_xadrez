// Integração com a API pública do Lichess (Módulo 2 — base de dados online).
//
// Usamos só o Explorer de mestres (explorer.lichess.ovh), endpoint GRATUITO,
// SEM TOKEN e com CORS liberado — estatísticas reais de partidas de Grandes
// Mestres na posição. É "online-only": lança um LichessErro descritivo quando
// falha, para a UI mostrar a causa real (offline, limite, recusa, etc.).

const EXPLORER = 'https://explorer.lichess.ovh/masters';

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

async function buscarJson(url: string, signal?: AbortSignal, timeoutMs = 9000): Promise<unknown> {
  const ctrl = new AbortController();
  const aoAbortar = () => ctrl.abort();
  signal?.addEventListener('abort', aoAbortar, { once: true });
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let r: Response;
  try {
    r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
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
        '). Costuma ser uma extensão do navegador, VPN ou a rede bloqueando o site — tente em outra rede ou numa aba anônima sem extensões.',
      r.status,
    );
  }
  if (r.status === 429) {
    throw new LichessErro('limite', 'Muitas consultas seguidas — aguarde alguns segundos.', 429);
  }
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
