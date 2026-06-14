// Wrapper do Stockfish (build single-thread, stockfish.js 10) rodando em Web Worker
// e conversando via protocolo UCI. Os arquivos são auto-hospedados em /engine/
// (ver CLAUDE.md): nada de CDN, para não depender de rede nem de COOP/COEP.

export type Nivel = 'basico' | 'intermediario' | 'profissional';

type ConfigNivel = {
  /** Rótulo amigável para a UI. */
  rotulo: string;
  /**
   * Força via "Skill Level" (0–20). ESTA build do Stockfish (Multi-Variant,
   * 2019) NÃO expõe UCI_Elo/UCI_LimitStrength — só Skill Level. Quanto menor,
   * mais o motor "erra" de propósito.
   */
  skill: number;
  /** Elo aproximado correspondente, só para exibir ao usuário. */
  eloAprox: number;
  /** Tempo de cálculo por lance, em ms. */
  movetimeMs: number;
};

export const NIVEIS: Record<Nivel, ConfigNivel> = {
  basico: { rotulo: 'Básico', skill: 3, eloAprox: 1350, movetimeMs: 300 },
  intermediario: { rotulo: 'Intermediário', skill: 11, eloAprox: 1900, movetimeMs: 700 },
  profissional: { rotulo: 'Profissional', skill: 20, eloAprox: 2700, movetimeMs: 2000 },
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
  private skill = 11;

  /** Resolve quando o motor terminou o handshake UCI e está pronto. */
  readonly pronto: Promise<void>;
  private resolvePronto!: () => void;
  private rejeitarPronto!: (e: Error) => void;
  private prontoConcluido = false;

  /** Resolução/rejeição do bestMove em andamento (se houver). */
  private resolveLance?: (uci: string) => void;
  private rejeitaLance?: (e: Error) => void;

  /** Última avaliação reportada pelo motor (perspectiva de quem tem a vez). */
  private ultimoCp?: number;
  private ultimoMate?: number;

  /** Mensagem do último erro do worker, para diagnóstico na UI. */
  erro?: string;

  constructor() {
    // BASE_URL termina com "/" (ex.: "/michuri_xadrez/" em produção, "/" em dev).
    // Usar caminho relativo ao base garante que o worker — e o stockfish.wasm que
    // ele carrega ao lado — sejam encontrados também quando o app está numa subpasta.
    const base = import.meta.env.BASE_URL;
    const arquivo = suportaWasm() ? 'engine/stockfish.wasm.js' : 'engine/stockfish.js';
    const urlWorker = base + arquivo;
    try {
      this.w = new Worker(urlWorker);
    } catch (e) {
      // Falha imediata ao criar o worker (ex.: caminho/MIME inválido).
      this.w = undefined as unknown as Worker;
      this.erro = `Não foi possível iniciar o worker do motor (${urlWorker}): ${(e as Error).message}`;
      this.pronto = Promise.reject(new Error(this.erro));
      // Evita "unhandled rejection" caso ninguém aguarde de imediato.
      this.pronto.catch(() => {});
      return;
    }

    this.pronto = new Promise<void>((res, rej) => {
      this.resolvePronto = () => {
        this.prontoConcluido = true;
        res();
      };
      this.rejeitarPronto = rej;
    });
    // Evita "unhandled rejection" se o handshake falhar antes de alguém aguardar.
    this.pronto.catch(() => {});

    // Erros do worker (falha ao carregar o .wasm, exceção interna, etc.) não
    // podem ficar silenciosos — senão a UI fica "pensando" para sempre.
    this.w.onerror = (ev: ErrorEvent) => {
      const msg = ev.message || 'erro desconhecido no worker do motor';
      this.erro = `Falha no motor (${urlWorker}): ${msg}`;
      // Eslint/console: ajuda a diagnosticar no DevTools.
      console.error('[engine]', this.erro, ev);
      if (!this.prontoConcluido) this.rejeitarPronto?.(new Error(this.erro));
      const rej = this.rejeitaLance;
      this.resolveLance = undefined;
      this.rejeitaLance = undefined;
      rej?.(new Error(this.erro));
    };
    this.w.onmessageerror = () => {
      this.erro = 'Mensagem inválida recebida do worker do motor.';
      console.error('[engine]', this.erro);
    };

    this.w.onmessage = (e: MessageEvent) => {
      const raw: string = typeof e.data === 'string' ? e.data : (e.data?.data ?? '');
      const line = raw.trim();
      if (!line) return;
      if (line === 'uciok') {
        // NÃO enviar "setoption name Threads": apesar de a build anunciar
        // Threads (min 1, max 1), recebê-lo trava este worker single-thread e o
        // motor nunca mais responde (nem readyok). A força vem de setNivel.
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
        this.rejeitaLance = undefined;
        resolve?.(uci);
      }
    };

    this.send('uci');
  }

  /** Ajusta a força do motor para o nível escolhido. */
  setNivel(n: Nivel): void {
    const c = NIVEIS[n];
    this.movetime = c.movetimeMs;
    this.skill = c.skill;
    // Esta build usa "Skill Level" (0–20) para regular a força.
    this.send(`setoption name Skill Level value ${c.skill}`);
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
    return new Promise<string>((res, rej) => {
      // Watchdog: se o motor não responder em tempo hábil (ex.: worker travado
      // ou .wasm que não carregou), rejeitamos em vez de deixar a UI "pensando"
      // para sempre. Folga generosa por causa da 1ª compilação do wasm.
      const limite = movetimeMs + 15000;
      const timer = setTimeout(() => {
        if (this.resolveLance === envolver) {
          this.resolveLance = undefined;
          this.rejeitaLance = undefined;
          rej(
            new Error(
              this.erro ??
                `O motor não respondeu em ${Math.round(limite / 1000)}s. ` +
                  'Verifique se os arquivos em /engine/ estão acessíveis.',
            ),
          );
        }
      }, limite);

      const envolver = (uci: string) => {
        clearTimeout(timer);
        res(uci);
      };
      const envolverErro = (e: Error) => {
        clearTimeout(timer);
        rej(e);
      };
      this.resolveLance = envolver;
      this.rejeitaLance = envolverErro;
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
    this.w?.terminate();
  }

  /** Snapshot da configuração atual, para a UI. */
  get configAtual(): { movetimeMs: number; skill: number } {
    return { movetimeMs: this.movetime, skill: this.skill };
  }

  private send(cmd: string): void {
    this.w?.postMessage(cmd);
  }
}
