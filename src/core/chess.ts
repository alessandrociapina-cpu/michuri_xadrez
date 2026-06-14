import { Chess, type Square, type Move, type Color } from 'chess.js';
import type { Key } from 'chessground/types';

// chess.js é a FONTE DA VERDADE do estado: regras, validação, geração de lances
// legais e FEN/PGN. Os dois módulos (Jogar e Aberturas) constroem em cima destes
// utilitários, que traduzem o estado do chess.js para o formato que o chessground
// (tabuleiro) espera.

export { Chess };
export type { Square, Move, Color };

/** Cria uma nova partida vazia (posição inicial). */
export function novaPartida(): Chess {
  return new Chess();
}

/**
 * Mapa de lances legais no formato do chessground: para cada casa de origem, a
 * lista de casas de destino legais. O chessground usa isso para só permitir
 * arrastar peças para casas válidas.
 */
export function destinosLegais(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>();
  for (const move of chess.moves({ verbose: true }) as Move[]) {
    const from = move.from as Key;
    const arr = dests.get(from);
    if (arr) arr.push(move.to as Key);
    else dests.set(from, [move.to as Key]);
  }
  return dests;
}

/** Cor de quem joga a vez, no vocabulário do chessground. */
export function corDaVez(chess: Chess): 'white' | 'black' {
  return chess.turn() === 'w' ? 'white' : 'black';
}

/** Cor por extenso (chessground) a partir do código do chess.js. */
export function corChessground(c: Color): 'white' | 'black' {
  return c === 'w' ? 'white' : 'black';
}

/** As duas casas do último lance, para destacar no tabuleiro. */
export function ultimoLance(chess: Chess): [Key, Key] | undefined {
  const hist = chess.history({ verbose: true }) as Move[];
  const last = hist[hist.length - 1];
  return last ? [last.from as Key, last.to as Key] : undefined;
}

/** O rei está em xeque? Útil para sinalizar visualmente. */
export function emXeque(chess: Chess): boolean {
  return chess.inCheck();
}

export type ResultadoPartida = {
  acabou: boolean;
  /** Texto pronto para exibir ao usuário, em PT-BR. */
  motivo?: string;
  /** Vencedor, quando houver. */
  vencedor?: 'white' | 'black' | 'empate';
};

/** Avalia o fim de jogo e devolve um texto em português. */
export function avaliarFim(chess: Chess): ResultadoPartida {
  if (!chess.isGameOver()) return { acabou: false };

  if (chess.isCheckmate()) {
    // Quem está em xeque-mate é quem tem a vez; o vencedor é o outro lado.
    const vencedor = chess.turn() === 'w' ? 'black' : 'white';
    const nome = vencedor === 'white' ? 'Brancas' : 'Pretas';
    return { acabou: true, vencedor, motivo: `Xeque-mate — ${nome} vencem.` };
  }
  if (chess.isStalemate()) {
    return { acabou: true, vencedor: 'empate', motivo: 'Empate por afogamento (rei afogado).' };
  }
  if (chess.isInsufficientMaterial()) {
    return { acabou: true, vencedor: 'empate', motivo: 'Empate por material insuficiente.' };
  }
  if (chess.isThreefoldRepetition()) {
    return { acabou: true, vencedor: 'empate', motivo: 'Empate por tripla repetição.' };
  }
  if (chess.isDraw()) {
    return { acabou: true, vencedor: 'empate', motivo: 'Empate (regra dos 50 lances).' };
  }
  return { acabou: true, motivo: 'Fim de jogo.' };
}

/**
 * Aplica um lance em UCI (ex.: "e2e4", "e7e8q" em promoção) à instância do
 * chess.js. Devolve o Move resultante, ou null se for ilegal.
 */
export function aplicarUci(chess: Chess, uci: string): Move | null {
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci.length > 4 ? uci.slice(4) : undefined;
  try {
    return chess.move({ from, to, promotion });
  } catch {
    return null;
  }
}
