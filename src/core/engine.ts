// Wrapper do Stockfish (build single-thread, stockfish.js 10) rodando em Web Worker
// e conversando via protocolo UCI. Os arquivos são auto-hospedados em /engine/
// (ver CLAUDE.md): nada de CDN, para não depender de rede nem de COOP/COEP.

export type Nivel = 'basico' | 'intermediario' | 'profissional';

type ConfigNivel = {
  /** Rótulo amigável para a UI. */
  rotulo: string;
  /** Elo-alvo quando limitamos a força. */
  elo: number;
  /** Tempo de cálculo por lance, em ms. */
  movetimeMs: number;
  /**
   * Se false, jogamos com força total (sem UCI_LimitStrength). O nível
   * profissional usa isto: o Stockfish 10 satura o UCI_Elo perto de ~2850, então
   * para "força máxima" desligamos o limitador e damos mais tempo de cálculo.
   */
  limitarForca: boolean;
};

export const NIVEIS: Record<Nivel, ConfigNivel> = {
  basico: { rotulo: 'Básico', elo: 1350, movetimeMs: 300, limitarForca: true },
  intermediario: { rotulo: 'Intermediário', elo: 1900, movetimeMs: 700, limitarForca: true },
  profissional: { rotulo: 'Profissional', elo: 3000, movetimeMs: 2000, limitarForca: false },
};

function suportaWasm(): boolean {
  try {
    if (typeof WebAssembly !== 'object') return false;
    // Módulo wasm mínimo válido — se o navegador o aceita, há suporte.
    const modulo = Uint8Array.of(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00);
    return WebAssembly.validate(modulo);
  } catch {
    return false;
  }
}

export class Engine {
  private w: Worker;
  private movetime = 700;
  private limitarForca = true;
  private elo = 1900;

  /** Resolve quando o motor terminou o handshake UCI e está pronto. */
  readonly pronto: Promise<void>;
  private resolvePronto!: () => void;

  /** Resolução do bestMove em andamento (se houver). */
  private resolveLance?: (uci: string) => void;

  /** Última avaliação reportada pelo motor (perspectiva de quem tem a vez). */
  private ultimoCp?: number;
  private ultimoMate?: number;

  constructor() {
    const arquivo = suportaWasm() ? '/engine/stockfish.wasm.js' : '/engine/stockfish.js';
    this.w = new Worker(arquivo);
    this.pronto = new Promise<void>((res) => {
      this.resolvePronto = res;
    });

    this.w.onmessage = (e: MessageEvent) => {
      const line: string = typeof e.data === 'string' ? e.data : (e.data?.data ?? '');
      if (!line) return;
      if (line === 'uciok') {
        // Opções base; a força é definida em setNivel.
        this.send('setoption name Threads value 1');
        this.send('isready');
      } else if (line === 'readyok') {
        this.resolvePronto();
      } else if (line.startsWith('info') && line.includes('score')) {
        // Ex.: "info depth 12 ... score cp 34 ..." ou "score mate -3".
        const mCp = line.match(/score cp (-?\d+)/);
        const mMate = line.match(/score mate (-?\d+)/);
        if (mCp) {
          this.ultimoCp = parseInt(mCp[1], 10);
          this.ultimoMate = undefined;
        } else if (mMate) {
          this.ultimoMate = parseInt(mMate[1], 10);
          this.ultimoCp = undefined;
        }
      } else if (line.startsWith('bestmove')) {
        const uci = line.split(' ')[1];
        const resolve = this.resolveLance;
        this.resolveLance = undefined;
        resolve?.(uci);
      }
    };

    this.send('uci');
  }

  /** Ajusta a força do motor para o nível escolhido. */
  setNivel(n: Nivel): void {
    const c = NIVEIS[n];
    this.movetime = c.movetimeMs;
    this.limitarForca = c.limitarForca;
    this.elo = c.elo;
    if (c.limitarForca) {
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${c.elo}`);
    } else {
      this.send('setoption name UCI_LimitStrength value false');
    }
  }

  /**
   * Melhor lance para a posição (FEN), em UCI. Garante que o motor já fez o
   * handshake antes de pedir o cálculo.
   */
  async bestMove(fen: string): Promise<string> {
    await this.pronto;
    return this.go(fen, this.movetime);
  }

  /**
   * Avalia uma posição: devolve o melhor lance (UCI) e a avaliação. A pontuação
   * `cp` vem em centésimos de peão, e `mate` em número de lances até o mate —
   * ambas na perspectiva de QUEM TEM A VEZ na posição dada.
   */
  async analyze(
    fen: string,
    movetimeMs = 900,
  ): Promise<{ best: string; cp?: number; mate?: number }> {
    await this.pronto;
    this.ultimoCp = undefined;
    this.ultimoMate = undefined;
    const best = await this.go(fen, movetimeMs);
    return { best, cp: this.ultimoCp, mate: this.ultimoMate };
  }

  private go(fen: string, movetimeMs: number): Promise<string> {
    return new Promise<string>((res) => {
      this.resolveLance = res;
      this.send(`position fen ${fen}`);
      this.send(`go movetime ${movetimeMs}`);
    });
  }

  /** Interrompe o cálculo em andamento (ex.: o jogador desistiu da vez). */
  stop(): void {
    this.send('stop');
  }

  /** Encerra o worker e libera recursos. */
  dispose(): void {
    try {
      this.send('quit');
    } catch {
      /* worker já pode estar encerrado */
    }
    this.w.terminate();
  }

  /** Snapshot da configuração atual, para a UI. */
  get configAtual(): { movetimeMs: number; elo: number; limitarForca: boolean } {
    return { movetimeMs: this.movetime, elo: this.elo, limitarForca: this.limitarForca };
  }

  private send(cmd: string): void {
    this.w.postMessage(cmd);
  }
}
