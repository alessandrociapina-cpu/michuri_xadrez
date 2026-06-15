import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';
import type { Key } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';

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
  /** Setas/marcações desenhadas no tabuleiro (ex.: melhor lance do motor). */
  shapes?: DrawShape[];
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
  shapes,
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
      coordinates: false, // usamos coordenadas próprias, na margem (mais legíveis)
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
    // Setas do motor (ex.: melhor lance). Usamos autoShapes: camada própria que
    // não interfere no arrastar das peças nem nas marcações do usuário.
    api.setAutoShapes(shapes ?? []);
  }, [fen, orientation, movableColor, dests, lastMove, check, viewOnly, shapes, syncSignal]);

  // Coordenadas próprias, na margem do tabuleiro (alto contraste, fora das casas).
  const files = orientation === 'white'
    ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  const ranks = orientation === 'white'
    ? ['8', '7', '6', '5', '4', '3', '2', '1']
    : ['1', '2', '3', '4', '5', '6', '7', '8'];

  return (
    <div className="board-outer">
      <div className="coord-ranks" aria-hidden="true">
        {ranks.map((r) => (
          <span key={r}>{r}</span>
        ))}
      </div>
      <div className="board-frame">
        <div ref={elRef} className="cg-host" />
      </div>
      <div className="coord-files" aria-hidden="true">
        {files.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
    </div>
  );
}
