import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Key } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';
import { Board } from '../../components/Board';
import { Chess } from '../../core/chess';
import { Engine, type LiveInfo } from '../../core/engine';
import { gerarPgn, lerPgn } from '../../core/pgn';
import {
  analisarPartida,
  miadosDe,
  ROTULO_CLASSE,
  SIMBOLO_CLASSE,
  type Classe,
  type Relatorio,
} from '../../core/analysis';
import { miar, estaMudo, setMudo } from '../../core/meow';
import { sanParaPtBr } from '../../core/notation';
import {
  buscarExplorer,
  buscarPgnMestre,
  LichessErro,
  type ExplorerResultado,
  type ExplorerGame,
} from '../../core/lichess';
import { gerarPuzzlesDeErros, type Puzzle } from '../../core/puzzles';
import { registrarAnalise } from '../../core/progresso';
import { PARTIDAS_FAMOSAS, type JogoFamoso } from './famousGames';
import './Analise.css';

type Profundidade = 'rapida' | 'padrao' | 'profunda';
const MOVETIME: Record<Profundidade, number> = { rapida: 250, padrao: 500, profunda: 1100 };
const ROTULO_PROF: Record<Profundidade, string> = {
  rapida: 'Rápida',
  padrao: 'Padrão',
  profunda: 'Profunda',
};

type Orientacao = 'white' | 'black';

// Avaliação ao vivo já processada (ótica das brancas) + FEN a que pertence.
type VivoView = { cpBrancas: number; depth: number; pv: string[]; fen: string };

export function Analise({
  ativo,
  pgnInicial,
  lichessLogado,
  lichessErro,
  onEntrarLichess,
  onSairLichess,
  onErrosPuzzles,
  onTreinarErros,
}: {
  ativo: boolean;
  pgnInicial?: string;
  lichessLogado: boolean;
  lichessErro?: string;
  onEntrarLichess: () => void;
  onSairLichess: () => void;
  onErrosPuzzles: (p: Puzzle[]) => void;
  onTreinarErros: () => void;
}) {
  const engineRef = useRef<Engine | null>(null);
  const abortarRef = useRef(false);

  const [sans, setSans] = useState<string[]>([]);
  const [ply, setPly] = useState(0);
  const [orient, setOrient] = useState<Orientacao>('white');

  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [profundidade, setProfundidade] = useState<Profundidade>('padrao');

  const [pgnTexto, setPgnTexto] = useState('');
  const [mostrarImport, setMostrarImport] = useState(false);
  const [aviso, setAviso] = useState<string | undefined>();
  const [copiado, setCopiado] = useState(false);

  const [mudo, setMudoLocal] = useState(estaMudo());
  const [ajuda, setAjuda] = useState(false);
  const [jogo, setJogo] = useState<JogoFamoso | null>(null);

  // Base de dados Lichess (Módulo 2): explorer de partidas de mestres.
  const [nuvemAberta, setNuvemAberta] = useState(false);
  const [nuvem, setNuvem] = useState<ExplorerResultado | null>(null);
  const [nuvemErro, setNuvemErro] = useState<string | undefined>();
  const [nuvemCarregando, setNuvemCarregando] = useState(false);
  const [nuvemTentativa, setNuvemTentativa] = useState(0); // re-tenta a consulta

  // Análise ao vivo (Módulo 1): avalia continuamente a posição mostrada.
  // Guardamos a avaliação já na ótica das BRANCAS + o FEN a que se refere, para
  // a barra não "piscar" ao trocar de posição (mantém o último valor).
  const [aoVivo, setAoVivo] = useState(false);
  const [vivo, setVivo] = useState<VivoView | null>(null);
  const [setaMelhor, setSetaMelhor] = useState(false); // seta do melhor lance (off por padrão)
  const [profViva, setProfViva] = useState<'d14' | 'd18' | 'inf'>('d18');

  // Reprodução automática.
  const [tocando, setTocando] = useState(false);

  // Cria o motor (em força máxima) só quando a análise é pedida pela 1ª vez —
  // assim não carregamos um segundo Stockfish no boot do app.
  const garantirEngine = useCallback((): Engine => {
    if (!engineRef.current) {
      const eng = new Engine();
      eng.setNivel('profissional');
      engineRef.current = eng;
    }
    return engineRef.current;
  }, []);

  // Libera o motor ao desmontar.
  useEffect(() => {
    return () => {
      abortarRef.current = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Carrega o PGN vindo de outra aba (botão "Analisar" em Jogar).
  useEffect(() => {
    if (!pgnInicial) return;
    try {
      const { sans: s } = lerPgn(pgnInicial);
      setSans(s);
      setPly(s.length);
      setRelatorio(null);
      setJogo(null);
      setAviso(undefined);
      setMostrarImport(false);
    } catch {
      /* PGN da própria aba é confiável; ignora falhas silenciosamente */
    }
  }, [pgnInicial]);

  // Carrega uma partida histórica pré-cadastrada para estudo.
  const carregarFamosa = useCallback((id: string) => {
    const g = PARTIDAS_FAMOSAS.find((j) => j.id === id) ?? null;
    if (!g) {
      setJogo(null);
      return;
    }
    setJogo(g);
    setSans(g.sans);
    setPly(0);
    setRelatorio(null);
    setAviso(undefined);
    setMostrarImport(false);
    setTocando(false);
  }, []);

  // Carrega no tabuleiro um PGN qualquer (ex.: partida vinda do explorer do Lichess).
  const carregarPgnTexto = useCallback((pgn: string): boolean => {
    try {
      const { sans: s } = lerPgn(pgn);
      setSans(s);
      setPly(0);
      setRelatorio(null);
      setJogo(null);
      setAviso(undefined);
      setMostrarImport(false);
      setTocando(false);
      setNuvemAberta(false); // foca no tabuleiro
      return true;
    } catch (e) {
      setAviso((e as Error).message);
      return false;
    }
  }, []);

  // Estado da ação sobre uma partida do explorer (id em carregamento).
  const [mestreCarregando, setMestreCarregando] = useState<string | null>(null);

  const baixarMestre = useCallback(async (g: ExplorerGame) => {
    if (!g.id) return;
    setMestreCarregando(g.id);
    setNuvemErro(undefined);
    try {
      const pgn = await buscarPgnMestre(g.id);
      const nome = `${g.brancas}_${g.pretas}${g.ano ? '_' + g.ano : ''}`.replace(/[^\w]+/g, '_');
      const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nome || g.id}.pgn`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setNuvemErro(e instanceof LichessErro ? e.message : 'Falha ao baixar o PGN.');
    } finally {
      setMestreCarregando(null);
    }
  }, []);

  const analisarMestre = useCallback(
    async (g: ExplorerGame) => {
      if (!g.id) return;
      setMestreCarregando(g.id);
      setNuvemErro(undefined);
      try {
        const pgn = await buscarPgnMestre(g.id);
        carregarPgnTexto(pgn);
      } catch (e) {
        setNuvemErro(e instanceof LichessErro ? e.message : 'Falha ao abrir a partida.');
      } finally {
        setMestreCarregando(null);
      }
    },
    [carregarPgnTexto],
  );

  const posicao = useMemo(() => {
    const c = new Chess();
    for (let i = 0; i < ply; i++) {
      try {
        c.move(sans[i]);
      } catch {
        break;
      }
    }
    const hist = c.history({ verbose: true });
    const last = hist[hist.length - 1];
    const lastMove = last ? ([last.from, last.to] as [Key, Key]) : undefined;
    return { fen: c.fen(), lastMove, emXeque: c.inCheck(), fim: c.isGameOver(), brancasVez: c.turn() === 'w' };
  }, [sans, ply]);

  // Navega até um ply, miando pelo lance recém-mostrado (se já analisado).
  const irPara = useCallback(
    (novoPly: number, comMiado = true) => {
      const alvo = Math.max(0, Math.min(sans.length, novoPly));
      setPly(alvo);
      if (comMiado && alvo > 0 && relatorio) {
        const la = relatorio.lances[alvo - 1];
        if (la) miar(miadosDe(la.classe));
      }
    },
    [sans.length, relatorio],
  );

  // Reprodução automática lance a lance.
  useEffect(() => {
    if (!tocando) return;
    if (ply >= sans.length) {
      setTocando(false);
      return;
    }
    const t = setTimeout(() => irPara(ply + 1), 950);
    return () => clearTimeout(t);
  }, [tocando, ply, sans.length, irPara]);

  // Pausa a reprodução ao sair da aba.
  useEffect(() => {
    if (!ativo) setTocando(false);
  }, [ativo]);

  // Análise AO VIVO: ao ligar (ou navegar), avalia a posição atual em tempo real.
  // NÃO zeramos o valor anterior ao trocar de posição (a barra mantém o último e
  // desliza), evitando o efeito de piscar. Debounce de 350 ms.
  useEffect(() => {
    if (!aoVivo || !ativo || posicao.fim) return;
    const fen = posicao.fen;
    const brancasVez = posicao.brancasVez;
    const depth = profViva === 'inf' ? undefined : profViva === 'd14' ? 14 : 18;
    const t = setTimeout(() => {
      const eng = garantirEngine();
      void eng.startLive(fen, {
        depth,
        onUpdate: (u) =>
          setVivo({ cpBrancas: liveCpBrancas(u, brancasVez), depth: u.depth, pv: u.pv, fen }),
      });
    }, 350);
    return () => {
      clearTimeout(t);
      engineRef.current?.stopLive();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aoVivo, ativo, posicao.fen, posicao.fim, posicao.brancasVez, profViva]);

  // Desliga a análise ao vivo ao sair da aba (libera o motor).
  useEffect(() => {
    if (!ativo && aoVivo) engineRef.current?.stopLive();
  }, [ativo, aoVivo]);

  // Consulta a base de mestres do Lichess para a posição atual (painel aberto).
  // A mensagem de erro reflete a causa real (offline, limite, recusa, etc.).
  useEffect(() => {
    if (!nuvemAberta || !ativo) return;
    // Sem login não há o que consultar (o explorer exige autenticação).
    if (!lichessLogado) {
      setNuvem(null);
      setNuvemErro(undefined);
      setNuvemCarregando(false);
      return;
    }
    const fen = posicao.fen;
    const ctrl = new AbortController();
    setNuvemErro(undefined);
    setNuvemCarregando(true);
    const t = setTimeout(async () => {
      try {
        const exp = await buscarExplorer(fen, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setNuvem(exp);
        setNuvemErro(undefined);
      } catch (e) {
        if (ctrl.signal.aborted || (e as Error)?.name === 'AbortError') return;
        setNuvem(null);
        setNuvemErro(
          e instanceof LichessErro ? e.message : 'Não foi possível consultar o Lichess agora.',
        );
      } finally {
        if (!ctrl.signal.aborted) setNuvemCarregando(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [nuvemAberta, ativo, posicao.fen, nuvemTentativa, lichessLogado]);

  const carregarPgn = useCallback(() => {
    try {
      const { sans: s } = lerPgn(pgnTexto);
      setSans(s);
      setPly(s.length);
      setRelatorio(null);
      setJogo(null);
      setAviso(undefined);
      setMostrarImport(false);
      setTocando(false);
    } catch (e) {
      setAviso((e as Error).message);
    }
  }, [pgnTexto]);

  const copiarPgn = useCallback(async () => {
    const texto = gerarPgn(sans);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sem permissão de clipboard: abre o importador já preenchido para copiar à mão.
      setPgnTexto(texto);
      setMostrarImport(true);
    }
  }, [sans]);

  const baixarPgn = useCallback(() => {
    const texto = gerarPgn(sans);
    const blob = new Blob([texto], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'partida-michuri.pgn';
    a.click();
    URL.revokeObjectURL(url);
  }, [sans]);

  // Navegação orientada a erros: pula para a próxima (ou anterior) imprecisão/erro.
  const irParaErro = useCallback(
    (dir: 1 | -1) => {
      if (!relatorio) return;
      const ruins = new Set<Classe>(['impreciso', 'erro', 'errograve']);
      const ls = relatorio.lances;
      if (dir === 1) {
        for (let i = ply; i < ls.length; i++) {
          if (ruins.has(ls[i].classe)) return irPara(i + 1, false);
        }
      } else {
        for (let i = ply - 2; i >= 0; i--) {
          if (ruins.has(ls[i].classe)) return irPara(i + 1, false);
        }
      }
    },
    [relatorio, ply, irPara],
  );

  const alternarAoVivo = useCallback(() => {
    setAoVivo((v) => {
      const novo = !v;
      if (!novo) {
        engineRef.current?.stopLive();
        setVivo(null);
      }
      return novo;
    });
  }, []);

  const analisar = useCallback(async () => {
    if (sans.length === 0 || analisando) return;
    const eng = garantirEngine();
    // A análise em lote e a ao vivo disputam o mesmo motor: desliga a ao vivo.
    setAoVivo(false);
    eng.stopLive();
    setVivo(null);
    setTocando(false);
    setAnalisando(true);
    setProgresso(0);
    setAviso(undefined);
    abortarRef.current = false;
    try {
      const rel = await analisarPartida(
        sans,
        eng,
        MOVETIME[profundidade],
        (feito, total) => setProgresso(Math.round((feito / total) * 100)),
        () => abortarRef.current,
      );
      if (rel) {
        setRelatorio(rel);
        setPly(0);
        onErrosPuzzles(gerarPuzzlesDeErros(rel)); // alimenta o "Treine seus erros"
        registrarAnalise(Math.max(rel.precisao.white, rel.precisao.black));
      }
    } catch (e) {
      setAviso(`Falha na análise: ${(e as Error).message}`);
    } finally {
      setAnalisando(false);
    }
  }, [sans, analisando, profundidade, garantirEngine]);

  const cancelarAnalise = useCallback(() => {
    abortarRef.current = true;
    engineRef.current?.stop();
  }, []);

  const alternarMudo = useCallback(() => {
    const novo = !mudo;
    setMudo(novo);
    setMudoLocal(novo);
    if (!novo) miar(1); // confirma o som ao reativar
  }, [mudo]);

  // Atalhos de teclado: setas para navegar.
  useEffect(() => {
    if (!ativo) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') irPara(ply + 1);
      else if (e.key === 'ArrowLeft') irPara(ply - 1, false);
      else if (e.key === 'Home') irPara(0, false);
      else if (e.key === 'End') irPara(sans.length, false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [ativo, ply, sans.length, irPara]);

  const temPartida = sans.length > 0;
  const lanceAtual = relatorio && ply > 0 ? relatorio.lances[ply - 1] : undefined;
  const notaHist = jogo && ply > 0 ? jogo.notas[ply - 1] : undefined;

  // Avaliação mostrada na barra/rótulo: ao vivo (se ligado, mantendo o último
  // valor para não piscar) ou da análise em lote.
  let avalExibida: number | null = null;
  if (aoVivo && vivo) avalExibida = vivo.cpBrancas;
  else if (relatorio) avalExibida = avalCorrente(relatorio, ply);

  // Seta e melhor linha só quando já se referem à posição ATUAL (vivo.fen casa).
  const vivoAtual = aoVivo && vivo && vivo.fen === posicao.fen ? vivo : null;
  const shapes: DrawShape[] = [];
  const pvUci = vivoAtual?.pv?.length ? vivoAtual.pv[0] : undefined;
  if (setaMelhor && pvUci && pvUci.length >= 4) {
    shapes.push({ orig: pvUci.slice(0, 2) as Key, dest: pvUci.slice(2, 4) as Key, brush: 'green' });
  }
  const linhaPv = vivoAtual ? pvParaPtbr(vivoAtual.fen, vivoAtual.pv, 5) : '';

  return (
    <div className="ana-layout">
      <div className="board-col">
        {avalExibida !== null && (
          <div className="ana-aval-ext">
            <span className={'aval-num ' + sinalAval(avalExibida)}>{formatAval(avalExibida)}</span>
            <span className="aval-leg">
              {aoVivo && vivo ? `ao vivo · prof. ${vivo.depth}` : 'avaliação (peões)'}
            </span>
          </div>
        )}
        <div className="ana-board-wrap">
          {avalExibida !== null && <BarraAval cpBrancas={avalExibida} orient={orient} />}
          <Board
            fen={posicao.fen}
            orientation={orient}
            lastMove={posicao.lastMove}
            check={posicao.emXeque}
            shapes={shapes}
            viewOnly
          />
        </div>

        <div className="ana-controles">
          <button className="navbtn-q" onClick={() => irPara(0, false)} disabled={ply === 0} title="Início">
            ⏮
          </button>
          <button className="navbtn-q" onClick={() => irPara(ply - 1, false)} disabled={ply === 0} title="Anterior">
            ◀
          </button>
          <button
            className="navbtn-q play"
            onClick={() => setTocando((t) => !t)}
            disabled={!temPartida || ply >= sans.length}
            title={tocando ? 'Pausar' : 'Reproduzir'}
          >
            {tocando ? '⏸' : '▶'}
          </button>
          <button
            className="navbtn-q"
            onClick={() => irPara(ply + 1)}
            disabled={ply >= sans.length}
            title="Próximo"
          >
            ▶
          </button>
          <button
            className="navbtn-q"
            onClick={() => irPara(sans.length, false)}
            disabled={ply >= sans.length}
            title="Fim"
          >
            ⏭
          </button>
          <button
            className="navbtn-q"
            onClick={() => setOrient((o) => (o === 'white' ? 'black' : 'white'))}
            title="Girar tabuleiro"
          >
            ⇅
          </button>
        </div>

        {lanceAtual && (
          <div className={'ana-lance-atual c-' + lanceAtual.classe}>
            <span className="badge">{SIMBOLO_CLASSE[lanceAtual.classe] || '·'}</span>
            <span className="nm">
              {lanceAtual.numero}.{lanceAtual.cor === 'black' ? '..' : ''} {lanceAtual.ptbr}
            </span>
            <span className="cl">{ROTULO_CLASSE[lanceAtual.classe]}</span>
            {lanceAtual.melhorPtbr &&
              lanceAtual.classe !== 'melhor' &&
              lanceAtual.classe !== 'brilhante' &&
              lanceAtual.classe !== 'livro' && (
                <span className="melhor">melhor: {lanceAtual.melhorPtbr}</span>
              )}
          </div>
        )}

        {jogo && notaHist && (
          <div className="ana-nota-hist">
            <span className="nota-mv">
              {lanceNumero(ply)} {sanParaPtBr(sans[ply - 1])}
            </span>
            <p>{notaHist}</p>
          </div>
        )}
        {jogo && ply === 0 && (
          <div className="ana-nota-hist intro">
            <p>{jogo.resumo}</p>
            <span className="nota-dica">Use ▶ ou as setas para avançar lance a lance.</span>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="ana-top">
          <div>
            <span className="eyebrow">Análise da partida</span>
            <h2 className="ana-h2">Estude lance a lance</h2>
          </div>
          <button
            className={'mute-btn' + (mudo ? ' off' : '')}
            onClick={alternarMudo}
            title={mudo ? 'Miados desativados' : 'Miados ativados'}
            aria-pressed={!mudo}
          >
            {mudo ? '🔇' : '🔊'}
          </button>
        </div>

        <div className="ana-famosas">
          <label className="lbl" htmlFor="famosa">
            🏆 Estudar uma partida histórica
          </label>
          <select
            id="famosa"
            value={jogo?.id ?? ''}
            onChange={(e) => carregarFamosa(e.target.value)}
          >
            <option value="">— escolha uma partida famosa —</option>
            {PARTIDAS_FAMOSAS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.titulo} ({g.ano})
              </option>
            ))}
          </select>
        </div>

        {jogo && <FichaJogo jogo={jogo} />}

        <div className="ana-acoes">
          <button className="btn" onClick={() => setMostrarImport((v) => !v)}>
            Importar PGN
          </button>
          <button className="btn" onClick={copiarPgn} disabled={!temPartida}>
            {copiado ? '✓ Copiado' : 'Copiar PGN'}
          </button>
          <button className="btn" onClick={baixarPgn} disabled={!temPartida}>
            Baixar .pgn
          </button>
        </div>

        {mostrarImport && (
          <div className="ana-import">
            <textarea
              className="ana-textarea"
              placeholder={'Cole aqui o PGN da partida…\n\n1. e4 e5 2. Cf3 Cc6 …'}
              value={pgnTexto}
              onChange={(e) => setPgnTexto(e.target.value)}
              rows={6}
            />
            <div className="ana-import-acoes">
              <button className="btn primary" onClick={carregarPgn}>
                Carregar
              </button>
              <button className="btn" onClick={() => setMostrarImport(false)}>
                Fechar
              </button>
            </div>
          </div>
        )}

        {aviso && <div className="ana-aviso">⚠ {aviso}</div>}

        <div className="ana-analisar">
          <div className="ana-prof">
            <label className="lbl" htmlFor="prof">
              Profundidade
            </label>
            <select
              id="prof"
              value={profundidade}
              onChange={(e) => setProfundidade(e.target.value as Profundidade)}
              disabled={analisando}
            >
              {(Object.keys(MOVETIME) as Profundidade[]).map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PROF[p]} · {MOVETIME[p]} ms/lance
                </option>
              ))}
            </select>
          </div>
          {!analisando ? (
            <button className="btn primary ana-go" onClick={analisar} disabled={!temPartida}>
              {relatorio ? 'Analisar de novo' : 'Analisar partida'}
            </button>
          ) : (
            <button className="btn ana-go" onClick={cancelarAnalise}>
              Cancelar ({progresso}%)
            </button>
          )}
        </div>

        {analisando && (
          <div className="ana-barra">
            <div className="ana-barra-fill" style={{ width: `${progresso}%` }} />
          </div>
        )}

        <div className="ana-vivo">
          <div className="ana-vivo-top">
            <label className={'switch' + (!temPartida ? ' off' : '')}>
              <input
                type="checkbox"
                checked={aoVivo}
                onChange={alternarAoVivo}
                disabled={!temPartida}
              />
              <span className="switch-tr" />
              <span className="switch-tx">Análise ao vivo</span>
            </label>
            <select
              className="prof-viva"
              value={profViva}
              onChange={(e) => setProfViva(e.target.value as typeof profViva)}
              disabled={!aoVivo}
              aria-label="Profundidade da análise ao vivo"
            >
              <option value="d14">Rápida (prof. 14)</option>
              <option value="d18">Padrão (prof. 18)</option>
              <option value="inf">Contínua (∞)</option>
            </select>
          </div>
          {aoVivo && (
            <>
              <label className="switch sm">
                <input
                  type="checkbox"
                  checked={setaMelhor}
                  onChange={() => setSetaMelhor((v) => !v)}
                />
                <span className="switch-tr" />
                <span className="switch-tx">Mostrar seta do melhor lance</span>
              </label>
              <div className="ana-vivo-info">
                {posicao.fim ? (
                  <span className="vivo-fim">Posição final — sem lances para calcular.</span>
                ) : vivo ? (
                  <>
                    <span className="vivo-prof">prof. {vivo.depth}</span>
                    {linhaPv && (
                      <span className="vivo-pv">
                        melhor linha: <strong>{linhaPv}</strong>
                      </span>
                    )}
                  </>
                ) : (
                  <span className="vivo-calc">calculando…</span>
                )}
              </div>
            </>
          )}
        </div>

        {relatorio && <Resumo relatorio={relatorio} />}

        {relatorio && qtdErros(relatorio) > 0 && (
          <button className="btn primary ana-treinar" onClick={onTreinarErros}>
            🎯 Treinar meus erros ({qtdErros(relatorio)})
          </button>
        )}

        {relatorio && relatorio.lances.length > 1 && (
          <div className="ana-grafico-bloco">
            <div className="grafico-head">
              <span className="lbl" style={{ margin: 0 }}>
                Vantagem ao longo da partida
              </span>
              <div className="erro-nav">
                <button className="btn mini" onClick={() => irParaErro(-1)} title="Erro anterior">
                  ◀ erro
                </button>
                <button className="btn mini" onClick={() => irParaErro(1)} title="Próximo erro">
                  erro ▶
                </button>
              </div>
            </div>
            <GraficoVantagem lances={relatorio.lances} ply={ply} onIr={(p) => irPara(p, false)} />
          </div>
        )}

        {temPartida && (
          <div className="ana-nuvem">
            <button
              className="ana-ajuda-tog"
              onClick={() => setNuvemAberta((v) => !v)}
              aria-expanded={nuvemAberta}
            >
              <span>☁️ Base de dados Lichess (online)</span>
              <span className={'chev' + (nuvemAberta ? ' on' : '')}>▾</span>
            </button>
            {nuvemAberta && (
              <NuvemPanel
                dados={nuvem}
                carregando={nuvemCarregando}
                erro={nuvemErro}
                fim={posicao.fim}
                onTentar={() => setNuvemTentativa((n) => n + 1)}
                logado={lichessLogado}
                loginErro={lichessErro}
                onEntrar={onEntrarLichess}
                onSair={onSairLichess}
                onAnalisarJogo={analisarMestre}
                onBaixarJogo={baixarMestre}
                carregandoId={mestreCarregando}
              />
            )}
          </div>
        )}

        <div className="ana-ajuda">
          <button
            className="ana-ajuda-tog"
            onClick={() => setAjuda((v) => !v)}
            aria-expanded={ajuda}
          >
            <span>Como ler a pontuação</span>
            <span className={'chev' + (ajuda ? ' on' : '')}>▾</span>
          </button>
          {ajuda && <Legenda />}
        </div>

        <div>
          <span className="lbl">Lances</span>
          <ListaLances
            sans={sans}
            relatorio={relatorio}
            ply={ply}
            onIr={(p) => irPara(p)}
          />
        </div>

        {!temPartida && (
          <p className="rodape">
            Importe um PGN ou use o botão <strong>Analisar</strong> na aba Jogar para trazer a
            partida atual. Quando um lance for <strong>bom</strong>, o Michuri mia uma vez; se for{' '}
            <strong>brilhante</strong>, mia duas. 🐈‍⬛
          </p>
        )}
      </div>
    </div>
  );
}

/** Quantos lances viram puzzle (erros e erros graves). */
function qtdErros(rel: Relatorio): number {
  return rel.lances.filter((l) => l.classe === 'erro' || l.classe === 'errograve').length;
}

/** Rótulo "12." (brancas) ou "12..." (pretas) para o lance no índice ply-1. */
function lanceNumero(ply: number): string {
  const i = ply - 1;
  const n = Math.floor(i / 2) + 1;
  return i % 2 === 0 ? `${n}.` : `${n}...`;
}

/** Converte o score ao vivo (perspectiva da vez) para cp na ótica das brancas. */
function liveCpBrancas(info: LiveInfo, brancasVez: boolean): number {
  const score =
    info.mate !== undefined
      ? info.mate > 0
        ? 100000 - info.mate * 100
        : -100000 - info.mate * 100
      : info.cp ?? 0;
  return brancasVez ? score : -score;
}

/** Converte os primeiros lances da variante (UCI) para uma linha em PT-BR. */
function pvParaPtbr(fen: string, pv: string[], max: number): string {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const uci of pv.slice(0, max)) {
    if (uci.length < 4) break;
    try {
      const m = c.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4) : undefined,
      });
      if (!m) break;
      out.push(sanParaPtBr(m.san));
    } catch {
      break;
    }
  }
  return out.join(' ');
}

/** Avaliação (cp brancas) da posição mostrada no ply atual. */
function avalCorrente(rel: Relatorio, ply: number): number {
  if (ply === 0) return rel.lances[0]?.avalAntesBrancas ?? 0;
  return rel.lances[ply - 1]?.avalDepoisBrancas ?? 0;
}

function formatAval(cpBrancas: number): string {
  if (Math.abs(cpBrancas) >= 20000) {
    // Mate forçado: + a favor das brancas, − a favor das pretas.
    return cpBrancas > 0 ? '+M' : '−M';
  }
  const v = cpBrancas / 100;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
}

function sinalAval(cpBrancas: number): string {
  if (Math.abs(cpBrancas) >= 20000) return cpBrancas > 0 ? 'mate-pos' : 'mate-neg';
  if (cpBrancas > 30) return 'pos';
  if (cpBrancas < -30) return 'neg';
  return 'neutro';
}

function BarraAval({ cpBrancas, orient }: { cpBrancas: number; orient: Orientacao }) {
  // Proporção de "brancas" pela win% (suaviza valores extremos).
  const win = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cpBrancas)) - 1);
  const brancasPct = Math.max(2, Math.min(98, win));
  // Quando o tabuleiro está girado, brancas ficam em cima.
  const estilo: CSSProperties =
    orient === 'white'
      ? { height: `${brancasPct}%`, bottom: 0 }
      : { height: `${brancasPct}%`, top: 0 };
  return (
    <div className="barra-aval" title={`Avaliação: ${formatAval(cpBrancas)}`}>
      <div className="barra-branca" style={estilo} />
    </div>
  );
}

function NuvemPanel({
  dados,
  carregando,
  erro,
  fim,
  onTentar,
  logado,
  loginErro,
  onEntrar,
  onSair,
  onAnalisarJogo,
  onBaixarJogo,
  carregandoId,
}: {
  dados: ExplorerResultado | null;
  carregando: boolean;
  erro?: string;
  fim: boolean;
  onTentar: () => void;
  logado: boolean;
  loginErro?: string;
  onEntrar: () => void;
  onSair: () => void;
  onAnalisarJogo: (g: ExplorerGame) => void;
  onBaixarJogo: (g: ExplorerGame) => void;
  carregandoId: string | null;
}) {
  const [selJogo, setSelJogo] = useState<number | null>(null);
  // Sem login: a base do Lichess exige autenticação. Mostra o convite a entrar.
  if (!logado) {
    return (
      <div className="nuvem-corpo">
        <p className="nuvem-login-txt">
          A base de partidas de mestres do Lichess passou a exigir login. Entre com sua conta do
          Lichess (gratuita) para ver as estatísticas. O app não vê sua senha — a autorização é
          feita no próprio site do Lichess.
        </p>
        {loginErro && <div className="nuvem-erro">⚠ {loginErro}</div>}
        <button className="btn primary nuvem-entrar" onClick={onEntrar}>
          Entrar com o Lichess
        </button>
        <div className="nuvem-credito">Dados: lichess.org · requer internet e login</div>
      </div>
    );
  }

  return (
    <div className="nuvem-corpo">
      {erro && (
        <div className="nuvem-erro">
          <span>⚠ {erro}</span>
          <button className="btn mini" onClick={onTentar}>
            Tentar novamente
          </button>
        </div>
      )}
      {carregando && !dados && <div className="nuvem-carreg">consultando o Lichess…</div>}

      {dados && dados.totalJogos > 0 ? (
        <>
          <div className="nuvem-sub">
            {dados.totalJogos.toLocaleString('pt-BR')} partidas de mestres nesta posição
          </div>
          <div className="nuvem-lances">
            {dados.lances.slice(0, 6).map((m) => {
              const tot = m.jogos || 1;
              const pw = (m.white / tot) * 100;
              const pd = (m.draws / tot) * 100;
              const pb = (m.black / tot) * 100;
              return (
                <div className="nuvem-lance" key={m.san}>
                  <span className="nl-san">{sanParaPtBr(m.san)}</span>
                  <span className="nl-barra">
                    <span className="nlb w" style={{ width: `${pw}%` }} />
                    <span className="nlb d" style={{ width: `${pd}%` }} />
                    <span className="nlb b" style={{ width: `${pb}%` }} />
                  </span>
                  <span className="nl-jogos">{m.jogos.toLocaleString('pt-BR')}</span>
                </div>
              );
            })}
          </div>
          {dados.partidas.length > 0 && (
            <div className="nuvem-partidas">
              <span className="lbl" style={{ margin: '4px 0' }}>
                Partidas célebres daqui · toque para abrir
              </span>
              {dados.partidas.map((g, i) => (
                <div className="nuvem-partida-wrap" key={i}>
                  <button
                    className={'nuvem-partida' + (selJogo === i ? ' aberto' : '')}
                    onClick={() => setSelJogo(selJogo === i ? null : i)}
                    disabled={!g.id}
                  >
                    <span className="np-res">
                      {g.vencedor === 'white' ? '1–0' : g.vencedor === 'black' ? '0–1' : '½–½'}
                    </span>
                    <span className="np-nomes">
                      {g.brancas} × {g.pretas}
                    </span>
                    {g.ano && <span className="np-ano">{g.ano}</span>}
                  </button>
                  {selJogo === i && g.id && (
                    <div className="np-acoes">
                      <button
                        className="btn mini"
                        disabled={carregandoId === g.id}
                        onClick={() => onAnalisarJogo(g)}
                      >
                        {carregandoId === g.id ? 'abrindo…' : '▶ Analisar'}
                      </button>
                      <button
                        className="btn mini"
                        disabled={carregandoId === g.id}
                        onClick={() => onBaixarJogo(g)}
                      >
                        ⬇ Baixar PGN
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        dados &&
        !carregando &&
        !erro && (
          <div className="nuvem-sub">
            {fim
              ? 'Posição final.'
              : 'Posição rara — fora da base de partidas de mestres do Lichess.'}
          </div>
        )
      )}

      <div className="nuvem-credito">
        <span>Dados: lichess.org · conectado</span>
        <button className="nuvem-sair" onClick={onSair}>
          Sair
        </button>
      </div>
    </div>
  );
}

function FichaJogo({ jogo }: { jogo: JogoFamoso }) {
  return (
    <div className="ficha-jogo">
      <div className="ficha-titulo">{jogo.titulo}</div>
      <div className="ficha-jogadores">
        <span className="fj-b">⬜ {jogo.brancas}</span>
        <span className="fj-vs">×</span>
        <span className="fj-p">⬛ {jogo.pretas}</span>
      </div>
      <div className="ficha-meta">
        <span className="tag">{jogo.evento}</span>
        <span className="tag">{jogo.ano}</span>
        <span className="tag eco">{jogo.resultado}</span>
      </div>
    </div>
  );
}

function Legenda() {
  const classes: Classe[] = [
    'brilhante',
    'melhor',
    'bom',
    'livro',
    'ok',
    'impreciso',
    'erro',
    'errograve',
  ];
  return (
    <div className="legenda">
      <p className="legenda-int">
        A avaliação mostra quem está melhor, medida em <strong>peões</strong>. O número é sempre do
        ponto de vista das <strong>brancas</strong>.
      </p>
      <ul className="legenda-lista">
        <li>
          <span className="leg-val pos">+1.5</span> as brancas estão melhor por ~1,5 peão de
          vantagem (material ou posição).
        </li>
        <li>
          <span className="leg-val neg">−1.6</span> as pretas estão melhor por ~1,6 peão.
        </li>
        <li>
          <span className="leg-val neutro">0.0</span> posição equilibrada.
        </li>
        <li>
          <span className="leg-val mate-pos">+M</span> mate forçado a favor das brancas;{' '}
          <span className="leg-val mate-neg">−M</span> a favor das pretas.
        </li>
      </ul>
      <p className="legenda-int">
        A barra ao lado do tabuleiro mostra o mesmo: quanto mais <strong>branca</strong>, melhor
        para as brancas. Cada lance recebe uma classificação:
      </p>
      <div className="legenda-classes">
        {classes.map((c) => (
          <span key={c} className={'leg-classe c-' + c}>
            <b>{SIMBOLO_CLASSE[c] || '·'}</b> {ROTULO_CLASSE[c]}
          </span>
        ))}
      </div>
      <p className="legenda-int peq">
        Brilhante e Melhor/Bom fazem o Michuri miar (1×, ou 2× se for brilhante). Imprecisão, Erro
        e Erro grave indicam onde a vantagem foi perdida.
      </p>
    </div>
  );
}

function GraficoVantagem({
  lances,
  ply,
  onIr,
}: {
  lances: Relatorio['lances'];
  ply: number;
  onIr: (ply: number) => void;
}) {
  const n = lances.length;
  const W = Math.max(1, n);
  const H = 100;
  const wp = (cp: number) => {
    const v = 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
    return 50 + 50 * v; // 0 (pretas ganhando) .. 100 (brancas ganhando)
  };
  let d = `M 0 ${H}`;
  lances.forEach((l, i) => {
    const y = H - wp(l.avalDepoisBrancas);
    d += ` L ${i + 0.5} ${y.toFixed(2)}`;
  });
  d += ` L ${W} ${H} Z`;
  const markerX = Math.max(0, Math.min(W, ply));
  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    onIr(Math.max(0, Math.min(n, Math.round(x * n))));
  };
  return (
    <svg
      className="grafico"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      onClick={onClick}
      role="img"
      aria-label="Gráfico de vantagem da partida"
    >
      <rect x="0" y="0" width={W} height={H / 2} className="g-top" />
      <path d={d} className="g-area" />
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} className="g-mid" />
      <line x1={markerX} y1="0" x2={markerX} y2={H} className="g-marker" />
    </svg>
  );
}

function Resumo({ relatorio }: { relatorio: Relatorio }) {
  const ordem: Classe[] = ['brilhante', 'melhor', 'bom', 'impreciso', 'erro', 'errograve'];
  return (
    <div className="ana-resumo">
      <div className="ana-precisao">
        <div className="prec-cel">
          <span className="prec-rot">Brancas</span>
          <span className="prec-num">{relatorio.precisao.white.toFixed(1)}%</span>
        </div>
        <div className="prec-vs">precisão</div>
        <div className="prec-cel">
          <span className="prec-rot">Pretas</span>
          <span className="prec-num">{relatorio.precisao.black.toFixed(1)}%</span>
        </div>
      </div>
      <div className="ana-contagem">
        {ordem.map((c) => {
          const b = relatorio.contagem.white[c];
          const p = relatorio.contagem.black[c];
          if (b === 0 && p === 0) return null;
          return (
            <div className="cont-linha" key={c}>
              <span className="cont-b">{b}</span>
              <span className={'cont-rot c-' + c}>
                {SIMBOLO_CLASSE[c] || '·'} {ROTULO_CLASSE[c]}
              </span>
              <span className="cont-p">{p}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListaLances({
  sans,
  relatorio,
  ply,
  onIr,
}: {
  sans: string[];
  relatorio: Relatorio | null;
  ply: number;
  onIr: (ply: number) => void;
}) {
  if (sans.length === 0) {
    return <div className="ana-lista vazia">Nenhuma partida carregada.</div>;
  }
  const linhas: { num: number; b?: { i: number; cl?: Classe }; p?: { i: number; cl?: Classe } }[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    linhas.push({
      num: i / 2 + 1,
      b: { i, cl: relatorio?.lances[i]?.classe },
      p: sans[i + 1] !== undefined ? { i: i + 1, cl: relatorio?.lances[i + 1]?.classe } : undefined,
    });
  }
  return (
    <div className="ana-lista">
      {linhas.map((l) => (
        <div className="ana-linha" key={l.num}>
          <span className="ana-num">{l.num}.</span>
          {[l.b, l.p].map((cel, idx) =>
            cel ? (
              <button
                key={idx}
                className={
                  'ana-mv' + (ply === cel.i + 1 ? ' atual' : '') + (cel.cl ? ' c-' + cel.cl : '')
                }
                onClick={() => onIr(cel.i + 1)}
              >
                {relatorio?.lances[cel.i]?.ptbr ?? sanCru(sans[cel.i])}
                {cel.cl && SIMBOLO_CLASSE[cel.cl] && (
                  <sup className="ana-sym">{SIMBOLO_CLASSE[cel.cl]}</sup>
                )}
              </button>
            ) : (
              <span key={idx} className="ana-mv vazio" />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

// Notação PT-BR para quando ainda não há relatório (lista bruta dos lances).
function sanCru(san: string): string {
  return sanParaPtBr(san);
}
