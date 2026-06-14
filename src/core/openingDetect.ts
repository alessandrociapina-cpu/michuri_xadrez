import { OPENINGS } from '../features/openings/data';

// A ponte entre os módulos: como Jogar e Aberturas consomem a mesma árvore,
// dá para identificar, em tempo real, qual abertura está sendo jogada na
// partida contra o motor.

export type AberturaDetectada = {
  name: string;
  eco: string;
  /** Quantos meios-lances da teoria a partida seguiu. */
  lancesNaTeoria: number;
  /** Total de meios-lances catalogados para essa abertura. */
  totalTeoria: number;
};

/**
 * Dado o histórico de lances em SAN (inglês, como o chess.js gera), devolve a
 * abertura conhecida que melhor casa com o início da partida. Critério: maior
 * prefixo de teoria seguido. Devolve undefined se nem o 1º lance bate.
 */
export function detectarAbertura(sanHistory: string[]): AberturaDetectada | undefined {
  if (sanHistory.length === 0) return undefined;

  let melhor: AberturaDetectada | undefined;

  for (const ab of OPENINGS) {
    let i = 0;
    const limite = Math.min(sanHistory.length, ab.plies.length);
    while (i < limite && ab.plies[i].san === sanHistory[i]) i++;

    // Só conta se ao menos o 1º lance bateu, e se a partida não divergiu antes
    // do fim do que catalogamos (i lances seguidos a partir do começo).
    if (i > 0 && (melhor === undefined || i > melhor.lancesNaTeoria)) {
      melhor = {
        name: ab.name,
        eco: ab.eco,
        lancesNaTeoria: i,
        totalTeoria: ab.plies.length,
      };
    }
  }

  return melhor;
}
