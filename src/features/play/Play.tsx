import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Key } from 'chessground/types';
import { Board } from '../../components/Board';
import {
  Chess,
  avaliarFim,
  corDaVez,
  destinosLegais,
  emXeque,
  ultimoLance,
  type Move,
} from '../../core/chess';
import { Engine, NIVEIS, type Nivel } from '../../core/engine';
import { sanParaPtBr } from '../../core/notation';
import { detectarAbertura } from '../../core/openingDetect';
import { gerarPgn } from '../../core/pgn';
import './Play.css';

type Lado = 'white' | 'black';

// Casas de promoção pendentes: guardamos origem/destino enquanto o jogador
// escolhe a peça.
type PromocaoPendente = { from: Key; to: Key };

export function Play({
  ativo,
  onAnalisar,
}: {
  ativo: boolean;
  onAnalisar?: (pgn: string) => void;
}) {
  const chessRef = useRef<Chess>(new Chess());
  const engineRef = useRef<Engine | null>(null);

  const [nivel, setNivel] = useState<Nivel>('intermediario');
  const [lado, setLado] = useState<Lado>('white');
  const [fen, setFen] = useState<string>(chessRef.current.fen());
  // Histórico em SAN inglês (fonte para notação e detecção de abertura).
  const [sanHist, setSanHist] = useState<string[]>([]);
  const [pensando, setPensando] = useState(false);
  const [fimMsg, setFimMsg] = useState<string | undefined>();
  const [promo, setPromo] = useState<PromocaoPendente | null>(null);
  const [erroMotor, setErroMotor] = useState<string | undefined>();
  const [copiado, setCopiado] = useState(false);

  // Cria o motor uma vez e ajusta o nível inicial.
  useEffect(() => {
    const eng = new Engine();
    eng.setNivel(nivel);
    engineRef.current = eng;
    return () => {
      eng.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sempre que o nível muda, reconfigura o motor.
  useEffect(() => {
    engineRef.current?.setNivel(nivel);
  }, [nivel]);

  const sincronizar = useCallback(() => {
    const chess = chessRef.current;
    setFen(chess.fen());
    setSanHist(chess.history());
    const fim = avaliarFim(chess);
    setFimMsg(fim.acabou ? fim.motivo : undefined);
  }, []);

  // Pede ao motor o lance da vez e aplica.
  const jogarMotor = useCallback(async () => {
    const chess = chessRef.current;
    const eng = engineRef.current;
    if (!eng || chess.isGameOver()) return;
    setPensando(true);
    setErroMotor(undefined);
    try {
      const uci = await eng.bestMove(chess.fen());
      // A partida pode ter sido reiniciada enquanto o motor pensava.
      if (chess !== chessRef.current) return;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci.slice(4) : undefined;
      try {
        chess.move({ from, to, promotion });
      } catch {
        /* lance inválido (não deveria ocorrer) — ignora */
      }
      sincronizar();
    } catch (e) {
      // Não deixa a UI "pensando" para sempre: mostra o erro real do motor.
      setErroMotor((e as Error).message);
    } finally {
      setPensando(false);
    }
  }, [sincronizar]);

  // Inicia nova partida com as configurações atuais.
  const novaPartida = useCallback(() => {
    const chess = new Chess();
    chessRef.current = chess;
    engineRef.current?.setNivel(nivel);
    setFen(chess.fen());
    setSanHist([]);
    setFimMsg(undefined);
    setPromo(null);
    setPensando(false);
    setErroMotor(undefined);
    // Se o jogador escolheu as pretas, o motor (brancas) abre a partida.
    if (lado === 'black') {
      void jogarMotor();
    }
  }, [nivel, lado, jogarMotor]);

  // Lance do jogador (vindo do tabuleiro).
  const aoMover = useCallback(
    (orig: Key, dest: Key) => {
      const chess = chessRef.current;
      // Detecta promoção: algum lance legal orig->dest com flag de promoção?
      const candidatos = chess.moves({ square: orig as Move['from'], verbose: true }) as Move[];
      const ehPromocao = candidatos.some((m) => m.to === dest && m.promotion);
      if (ehPromocao) {
        setPromo({ from: orig, to: dest });
        return;
      }
      try {
        chess.move({ from: orig, to: dest });
      } catch {
        return;
      }
      sincronizar();
      if (!chess.isGameOver()) void jogarMotor();
    },
    [sincronizar, jogarMotor],
  );

  // Conclui uma promoção escolhida no overlay.
  const concluirPromocao = useCallback(
    (peca: 'q' | 'r' | 'b' | 'n') => {
      const chess = chessRef.current;
      const p = promo;
      if (!p) return;
      setPromo(null);
      try {
        chess.move({ from: p.from, to: p.to, promotion: peca });
      } catch {
        return;
      }
      sincronizar();
      if (!chess.isGameOver()) void jogarMotor();
    },
    [promo, sincronizar, jogarMotor],
  );

  // Desfaz o último par de lances (jogador + motor) e devolve a vez ao jogador.
  const desfazer = useCallback(() => {
    if (pensando) return;
    const chess = chessRef.current;
    chess.undo(); // desfaz lance do motor
    chess.undo(); // desfaz lance do jogador
    sincronizar();
  }, [pensando, sincronizar]);

  // Copia o PGN da partida atual para a área de transferência.
  const copiarPgn = useCallback(async () => {
    const pgn = gerarPgn(sanHist, { White: lado === 'white' ? 'Você' : 'Michuri', Black: lado === 'white' ? 'Michuri' : 'Você' });
    try {
      await navigator.clipboard.writeText(pgn);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* clipboard indisponível — sem ação */
    }
  }, [sanHist, lado]);

  // Envia a partida atual para a aba de Análise.
  const analisarPartida = useCallback(() => {
    const pgn = gerarPgn(sanHist, { White: lado === 'white' ? 'Você' : 'Michuri', Black: lado === 'white' ? 'Michuri' : 'Você' });
    onAnalisar?.(pgn);
  }, [sanHist, lado, onAnalisar]);

  // Atalho de teclado: "n" para nova partida quando o módulo está ativo.
  useEffect(() => {
    if (!ativo) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'n' || e.key === 'N') novaPartida();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [ativo, novaPartida]);

  const chess = chessRef.current;
  const vezDoJogador = corDaVez(chess) === lado && !pensando && !fimMsg;
  const dests = useMemo(
    () => (vezDoJogador ? destinosLegais(chess) : new Map<Key, Key[]>()),
    // fen entra como dependência para recomputar a cada lance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fen, vezDoJogador],
  );

  const abertura = useMemo(() => detectarAbertura(sanHist), [sanHist]);
  const ultimo = ultimoLance(chess);
  const numLance = Math.floor(sanHist.length / 2) + (sanHist.length % 2 === 0 ? 0 : 1);

  let statusTexto: string;
  if (erroMotor) statusTexto = `⚠ ${erroMotor}`;
  else if (fimMsg) statusTexto = fimMsg;
  else if (pensando) statusTexto = 'O motor está pensando…';
  else if (vezDoJogador) statusTexto = emXeque(chess) ? 'Sua vez — você está em xeque!' : 'Sua vez de jogar.';
  else statusTexto = 'Aguardando o motor…';

  return (
    <div className="play-layout">
      <div className="board-col">
        <div className="board-stage">
          <Board
            fen={fen}
            orientation={lado}
            movableColor={vezDoJogador ? lado : undefined}
            dests={dests}
            lastMove={ultimo}
            check={emXeque(chess)}
            onMove={aoMover}
          />
          {promo && (
            <PromocaoOverlay cor={lado} onEscolher={concluirPromocao} />
          )}
        </div>

        <div className={'status' + (erroMotor ? ' erro' : fimMsg ? ' fim' : '')}>
          <span className={'dot' + (pensando ? ' think' : vezDoJogador ? ' you' : '')} />
          {statusTexto}
        </div>
      </div>

      <div className="panel">
        <div className="cfg">
          <div>
            <label className="lbl" htmlFor="nivel">
              Nível do motor
            </label>
            <select
              id="nivel"
              value={nivel}
              onChange={(e) => setNivel(e.target.value as Nivel)}
            >
              {(Object.keys(NIVEIS) as Nivel[]).map((n) => (
                <option key={n} value={n}>
                  {NIVEIS[n].rotulo}
                </option>
              ))}
            </select>
            <div className="hint">{descricaoNivel(nivel)}</div>
          </div>

          <div>
            <label className="lbl" htmlFor="lado">
              Você joga de
            </label>
            <select id="lado" value={lado} onChange={(e) => setLado(e.target.value as Lado)}>
              <option value="white">Brancas</option>
              <option value="black">Pretas</option>
            </select>
            <div className="hint">A escolha vale a partir da próxima partida.</div>
          </div>
        </div>

        <div className="actions">
          <button className="btn primary" onClick={novaPartida}>
            Nova partida
          </button>
          <button className="btn" onClick={desfazer} disabled={pensando || sanHist.length < 2}>
            Desfazer
          </button>
        </div>

        <div className="actions">
          <button className="btn" onClick={copiarPgn} disabled={sanHist.length === 0}>
            {copiado ? '✓ PGN copiado' : 'Copiar PGN'}
          </button>
          <button className="btn" onClick={analisarPartida} disabled={sanHist.length === 0}>
            Analisar partida
          </button>
        </div>

        {abertura && (
          <div className="abertura-live">
            <span className="lbl" style={{ marginBottom: 4 }}>
              Abertura reconhecida
            </span>
            <strong>{abertura.name}</strong>
            <span className="abertura-eco">
              ECO {abertura.eco} · {abertura.lancesNaTeoria}/{abertura.totalTeoria} lances na teoria
            </span>
          </div>
        )}

        <div>
          <span className="lbl">Lances</span>
          <Scoresheet sanHist={sanHist} />
        </div>

        <p className="rodape">
          Atual: <strong>{NIVEIS[nivel].rotulo}</strong>
          {numLance > 0 && <> · lance {numLance}</>}
        </p>
      </div>
    </div>
  );
}

function descricaoNivel(n: Nivel): string {
  const c = NIVEIS[n];
  const forca = c.skill >= 20 ? 'força máxima' : `Elo ≈ ${c.eloAprox}`;
  return `${forca} · habilidade ${c.skill}/20 · ${c.movetimeMs} ms por lance.`;
}

// ---- Lista de lances (placar) em notação PT-BR ----
function Scoresheet({ sanHist }: { sanHist: string[] }) {
  if (sanHist.length === 0) {
    return <div className="scoresheet vazio">A partida começa aqui.</div>;
  }
  const linhas: { num: number; brancas?: string; pretas?: string }[] = [];
  for (let i = 0; i < sanHist.length; i += 2) {
    linhas.push({
      num: i / 2 + 1,
      brancas: sanParaPtBr(sanHist[i]),
      pretas: sanHist[i + 1] ? sanParaPtBr(sanHist[i + 1]) : undefined,
    });
  }
  return (
    <div className="scoresheet">
      {linhas.map((l) => (
        <div className="linha" key={l.num}>
          <span className="mvnum">{l.num}.</span>
          <span className="mv">{l.brancas}</span>
          <span className="mv">{l.pretas ?? ''}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Overlay de escolha da peça na promoção ----
const GLIFOS: Record<'q' | 'r' | 'b' | 'n', { w: string; b: string; nome: string }> = {
  q: { w: '♕', b: '♛', nome: 'Dama' },
  r: { w: '♖', b: '♜', nome: 'Torre' },
  b: { w: '♗', b: '♝', nome: 'Bispo' },
  n: { w: '♘', b: '♞', nome: 'Cavalo' },
};

function PromocaoOverlay({
  cor,
  onEscolher,
}: {
  cor: Lado;
  onEscolher: (p: 'q' | 'r' | 'b' | 'n') => void;
}) {
  return (
    <div className="promo-overlay" role="dialog" aria-label="Escolha a peça da promoção">
      <div className="promo-box">
        <span className="lbl">Promover para</span>
        <div className="promo-pecas">
          {(['q', 'r', 'b', 'n'] as const).map((p) => (
            <button
              key={p}
              className="promo-peca"
              onClick={() => onEscolher(p)}
              title={GLIFOS[p].nome}
            >
              {cor === 'white' ? GLIFOS[p].w : GLIFOS[p].b}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
