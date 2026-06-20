import { useEffect, useRef, type CSSProperties } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';
import type { Key } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';
import { useSettings, getSettings, PALETAS } from '../core/settings';
import { tocarMovimento } from '../core/somPecas';

// Tabuleiro COMPARTILHADO pelos módulos (Jogar, Aberturas, Análise). É só a
// camada de renderização (chessground); a fonte da verdade do estado continua
// sendo o chess.js, que nos entrega FEN, destinos legais e o último lance.

import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import './Board.css';

/** Data URI do padrão xadrez (2×2 casas) com as cores da paleta escolhida. */
function svgTabuleiro(light: string, dark: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2' shape-rendering='crispEdges'>` +
    `<rect width='2' height='2' fill='${light}'/>` +
    `<rect x='1' y='0' width='1' height='1' fill='${dark}'/>` +
    `<rect x='0' y='1' width='1' height='1' fill='${dark}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

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

  // Aparência (tabuleiro/peças) vem das preferências globais.
  const { tema, material } = useSettings();
  const paleta = PALETAS[tema];

  // Som ao mover: tocamos quando o "último lance" muda para um novo (cobre todos
  // os módulos automaticamente). Pulamos a 1ª renderização para não soar no load.
  const lastKey = lastMove ? lastMove.join('') : '';
  const prevLastRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevLastRef.current === null) {
      prevLastRef.current = lastKey;
      return;
    }
    if (lastKey && lastKey !== prevLastRef.current) {
      const s = getSettings();
      if (s.somMover) tocarMovimento(s.material);
    }
    prevLastRef.current = lastKey;
  }, [lastKey]);

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
        <div
          ref={elRef}
          className="cg-host"
          data-material={material}
          style={
            {
              '--board-bg': svgTabuleiro(paleta.light, paleta.dark),
              '--sq-light': paleta.light,
            } as CSSProperties
          }
        />
      </div>
      <div className="coord-files" aria-hidden="true">
        {files.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
    </div>
  );
}
