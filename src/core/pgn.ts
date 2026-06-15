import { Chess } from './chess';

// Exportação e importação de partidas em PGN. O chess.js é a fonte da verdade:
// ele gera o PGN (com cabeçalhos) e também o interpreta de volta para uma lista
// de lances em SAN, que é o formato que os dois módulos consomem.

export type CabecalhosPgn = Record<string, string>;

export type PartidaPgn = {
  /** Lances em SAN inglês (como o chess.js gera). */
  sans: string[];
  /** Cabeçalhos das sete tags + extras, se houver. */
  cabecalhos: CabecalhosPgn;
};

function dataPgnHoje(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/**
 * Monta o texto PGN a partir de uma lista de lances em SAN. Preenche cabeçalhos
 * padrão (Event, Site, Date…) quando não forem fornecidos.
 */
export function gerarPgn(sans: string[], cabecalhos: CabecalhosPgn = {}): string {
  const chess = new Chess();
  for (const s of sans) {
    try {
      chess.move(s);
    } catch {
      break; // lance inválido encerra a reconstrução
    }
  }

  const padrao: CabecalhosPgn = {
    Event: 'Xadrez do Michuri',
    Site: 'Xadrez do Michuri (PWA)',
    Date: dataPgnHoje(),
    Round: '-',
    White: 'Brancas',
    Black: 'Pretas',
    Result: resultadoPgn(chess),
  };
  const todos = { ...padrao, ...cabecalhos };
  for (const [k, v] of Object.entries(todos)) {
    if (v) chess.header(k, v);
  }

  return chess.pgn();
}

function resultadoPgn(chess: Chess): string {
  if (!chess.isGameOver()) return '*';
  if (chess.isCheckmate()) return chess.turn() === 'w' ? '0-1' : '1-0';
  return '1/2-1/2';
}

/**
 * Interpreta um texto PGN e devolve os lances em SAN + cabeçalhos. Lança um erro
 * com mensagem amigável (em PT-BR) se o texto não for um PGN válido.
 */
export function lerPgn(texto: string): PartidaPgn {
  const limpo = texto.trim();
  if (!limpo) {
    throw new Error('Cole um PGN para importar.');
  }

  const chess = new Chess();
  try {
    chess.loadPgn(limpo);
  } catch {
    throw new Error('PGN inválido — verifique se os lances estão corretos.');
  }

  const sans = chess.history();
  if (sans.length === 0) {
    throw new Error('Nenhum lance encontrado no PGN.');
  }

  // O chess.js devolve TODAS as tags possíveis, a maioria como null. Ficamos só
  // com as preenchidas.
  const brutos = chess.header() as Record<string, string | null>;
  const cabecalhos: CabecalhosPgn = {};
  for (const [k, v] of Object.entries(brutos)) {
    if (v != null && v !== '' && v !== '?' && v !== '????.??.??') cabecalhos[k] = v;
  }
  return { sans, cabecalhos };
}
