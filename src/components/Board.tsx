import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';
import type { Key } from 'chessground/types';

// Tabuleiro COMPARTILHADO pelos dois módulos (Jogar e Aberturas). É só a camada
// de renderização (chessground); a fonte da verdade do estado continua sendo o
// chess.js, que nos entrega FEN, destinos legais e o último lance.

import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import './Board.css';

export type BoardProps = {
  /** Posição atual em FEN. */
  fen: string;
  orientation?: 'white' | 'black';
  /** Cor que pode mover agora; undefined = tabuleiro só de leitura. */
  movableColor?: 'white' | 'black';
  /** Destinos legais por casa de origem (do chess.js). */
  dests?: Map<Key, Key[]>;
  /** Casas do último lance, para destaque. */
  lastMove?: [Key, Key];
  /** Sinaliza rei em xeque. */
  check?: boolean;
  /** Apenas visualização (sem arrastar peças). */
  viewOnly?: boolean;
  /**
   * Sinal para forçar a ressincronização do tabuleiro com o `fen` mesmo quando
   * o FEN não mudou (ex.: reverter um lance recusado no modo treino).
   */
  syncSignal?: number;
  /** Chamado quando o usuário completa um lance legal arrastando/clicando. */
  onMove?: (orig: Key, dest: Key) => void;
};

export function Board({
  fen,
  orientation = 'white',
  movableColor,
  dests,
  lastMove,
  check,
  viewOnly,
  syncSignal,
  onMove,
}: BoardProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<Api | null>(null);
  // Mantém o onMove mais recente sem recriar a config a cada render.
  const onMoveRef = useRef<typeof onMove>(onMove);
  onMoveRef.current = onMove;

  // Cria a instância uma única vez.
  useEffect(() => {
    if (!elRef.current) return;
    const config: Config = {
      fen,
      orientation,
      coordinates: true,
      viewOnly,
      turnColor: movableColor ?? 'white',
      check,
      lastMove,
      animation: { enabled: true, duration: 200 },
      highlight: { lastMove: true, check: true },
      draggable: { showGhost: true },
      movable: {
        free: false,
        color: movableColor,
        dests,
        showDests: true,
        events: {
          after: (orig, dest) => onMoveRef.current?.(orig, dest),
        },
      },
    };
    apiRef.current = Chessground(elRef.current, config);
    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // Só na montagem; as atualizações vão pelo efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza props -> chessground a cada mudança relevante.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.set({
      fen,
      orientation,
      viewOnly,
      turnColor: movableColor ?? 'white',
      check,
      lastMove,
      movable: {
        free: false,
        color: movableColor,
        dests,
        showDests: true,
      },
    });
  }, [fen, orientation, movableColor, dests, lastMove, check, viewOnly, syncSignal]);

  return (
    <div className="board-frame">
      <div ref={elRef} className="cg-host" />
    </div>
  );
}
