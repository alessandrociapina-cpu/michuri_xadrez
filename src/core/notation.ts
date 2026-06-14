// Notação em português do Brasil (figurinas): as peças trocam de letra em relação
// ao inglês usado pelo chess.js / SAN. Peão não tem letra.
//
//   K (King)   -> R (Rei)
//   Q (Queen)  -> D (Dama)
//   R (Rook)   -> T (Torre)
//   B (Bishop) -> B (Bispo)   [coincide com o inglês]
//   N (Knight) -> C (Cavalo)

const MAPA: Record<string, string> = {
  K: 'R',
  Q: 'D',
  R: 'T',
  B: 'B',
  N: 'C',
};

/**
 * Converte um lance em SAN (inglês, ex.: "Nf3", "Qxd5+", "O-O") para a notação
 * brasileira (ex.: "Cf3", "Dxd5+"). Mantém roques, capturas, xeques, mates e
 * promoções intactos; só troca a inicial da peça.
 */
export function sanParaPtBr(san: string): string {
  if (!san) return san;
  // Roques não têm letra de peça.
  if (san.startsWith('O-O')) return san;

  // A primeira letra maiúscula no início indica a peça. Promoções aparecem como
  // "=Q" no fim — também convertemos.
  let resultado = san;

  // Peça que se move (apenas no início da string).
  const inicial = resultado[0];
  if (MAPA[inicial]) {
    resultado = MAPA[inicial] + resultado.slice(1);
  }

  // Promoção: "e8=Q" -> "e8=D".
  resultado = resultado.replace(/=([KQRBN])/g, (_, p: string) => `=${MAPA[p] ?? p}`);

  return resultado;
}

/** Aplica a conversão a uma linha inteira de lances separados por espaço. */
export function linhaPtBr(sans: string[]): string {
  return sans.map(sanParaPtBr).join(' ');
}
