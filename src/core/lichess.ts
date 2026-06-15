// Integração com a API pública do Lichess (Módulo 2 — análise em nuvem).
//
// Usamos apenas endpoints GRATUITOS e SEM TOKEN, que aceitam CORS e funcionam
// direto do navegador:
//   • Explorer de mestres  — estatísticas reais de partidas de GMs na posição.
//   • Cloud Eval           — avaliação do Stockfish na nuvem (quando a posição
//                            já está na base; caso contrário devolve 404).
//
// Tudo é "online-only": cada função recebe um AbortSignal e lança em caso de
// rede indisponível, para a UI tratar (o app continua 100% funcional offline).

const EXPLORER = 'https://explorer.lichess.ovh/masters';
const CLOUD = 'https://lichess.org/api/cloud-eval';

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
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Lichess respondeu ${r.status}`);
  const j = await r.json();
  const lances: ExplorerMove[] = (j.moves ?? []).map(
    (m: { san: string; white: number; draws: number; black: number }) => ({
      san: m.san,
      white: m.white,
      draws: m.draws,
      black: m.black,
      jogos: (m.white ?? 0) + (m.draws ?? 0) + (m.black ?? 0),
    }),
  );
  const partidas: ExplorerGame[] = (j.topGames ?? []).map(
    (g: {
      winner?: 'white' | 'black';
      white?: { name?: string };
      black?: { name?: string };
      year?: number;
    }) => ({
      brancas: g.white?.name ?? '?',
      pretas: g.black?.name ?? '?',
      vencedor: g.winner ?? 'draw',
      ano: g.year,
    }),
  );
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
  const r = await fetch(url, { signal });
  if (r.status === 404) return null; // posição não está na base da nuvem
  if (!r.ok) throw new Error(`Lichess respondeu ${r.status}`);
  const j = await r.json();
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
