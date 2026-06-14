# Michuri Xadrez

App de xadrez **PWA** (instalável e offline) com dois módulos construídos sobre uma
base comum, em **português do Brasil**:

1. **Jogar contra o motor** — três níveis de dificuldade (básico / intermediário /
   profissional), calibrados por Elo e tempo de cálculo.
2. **Estudar aberturas e gambitos** — árvore anotada com a *ideia* e a *consequência*
   de cada lance, mais um **modo treino** em que você joga a teoria no tabuleiro e o
   motor avalia os seus desvios.

## Pilha técnica

- **Vite + React + TypeScript** (estrito).
- **chess.js** — regras, validação, lances legais e FEN/PGN. É a *fonte da verdade*
  do estado.
- **chessground** (tabuleiro do Lichess) com o conjunto de peças aberto **cburnett**.
- **stockfish.js 10** (build single-thread, ~2,2 MB) rodando em **Web Worker** via
  UCI. Auto-hospedado em [`public/engine/`](public/engine) — sem CDN, sem depender
  de COOP/COEP.
- **vite-plugin-pwa** — instalável, abre offline e faz *precache* do `.wasm`.

## A ponte entre os módulos

Como os dois módulos consomem o mesmo núcleo (`src/core`), a árvore de aberturas
serve aos dois:

- **Jogar**: enquanto a partida segue a teoria, o nome da abertura aparece em tempo
  real (`src/core/openingDetect.ts`).
- **Estudo / Treino**: o botão *“analisar com o motor”* mostra o que aconteceria ao
  sair da teoria — a mesma avaliação usada na tela de jogo.

## Estrutura

```
src/
  core/
    chess.ts          # utilitários chess.js -> chessground (destinos, fim de jogo…)
    engine.ts         # wrapper do Stockfish + mapeamento dos níveis + análise
    notation.ts       # SAN inglês -> figurinas PT-BR (R/D/T/B/C)
    openingDetect.ts  # ponte: reconhece a abertura jogada na partida
  components/
    Board.tsx         # chessground ligado ao chess.js (COMPARTILHADO)
  features/
    play/Play.tsx     # "Jogar contra o motor"
    openings/
      data.ts         # árvore de aberturas (SAN + anotações)
      Trainer.tsx     # estudo + modo treino
```

## Níveis de dificuldade

| Nível         | Força                         | Tempo por lance |
|---------------|-------------------------------|-----------------|
| Básico        | `UCI_Elo` ≈ 1350              | 300 ms          |
| Intermediário | `UCI_Elo` ≈ 1900              | 700 ms          |
| Profissional  | força máxima (sem limitador)  | 2000 ms         |

> O Stockfish 10 satura o `UCI_Elo` perto de ~2850; por isso o nível profissional
> desliga o `UCI_LimitStrength` e usa mais tempo de cálculo para a força máxima.

## Rodando

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção (PWA) em dist/
npm run preview    # serve o build
```

## Notas sobre o Stockfish

Começamos com a **build single-thread**, que não exige `SharedArrayBuffer` nem os
cabeçalhos `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`. Para
buscar força máxima no nível profissional no futuro, dá para migrar para a build
multithread — aí será preciso servir o app com esses dois cabeçalhos (ver
comentários em [`vite.config.ts`](vite.config.ts)).
