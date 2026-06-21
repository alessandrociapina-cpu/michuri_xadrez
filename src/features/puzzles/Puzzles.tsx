import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Key } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';
import { Board } from '../../components/Board';
import { Chess, corDaVez, destinosLegais, emXeque } from '../../core/chess';
import {
  buscarPuzzleLichess,
  LichessErro,
  type DificuldadePuzzle,
} from '../../core/lichess';
import { solucaoPtbr, type Puzzle } from '../../core/puzzles';
import { useProgresso, registrarPuzzle } from '../../core/progresso';
import { miar } from '../../core/meow';
import './Puzzles.css';

type Fonte = 'lichess' | 'erro';
type Status = 'resolvendo' | 'errou' | 'acertou' | 'resolvido' | 'revelado';

const ROTULO_DIF: Record<DificuldadePuzzle, string> = {
  easiest: 'Muito fácil',
  easier: 'Fácil',
  normal: 'Normal',
  harder: 'Difícil',
  hardest: 'Muito difícil',
};

export function Puzzles({
  ativo,
  errosPuzzles,
  abrirErros,
}: {
  ativo: boolean;
  errosPuzzles: Puzzle[];
  abrirErros: number;
}) {
  const [fonte, setFonte] = useState<Fonte>('lichess');
  const [dificuldade, setDificuldade] = useState<DificuldadePuzzle>('normal');
  const [carregando, setCarregando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | undefined>();
  const [idxErro, setIdxErro] = useState(0);

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const chessRef = useRef<Chess>(new Chess());
  const [passo, setPasso] = useState(0);
  const [status, setStatus] = useState<Status>('resolvendo');
  const [fen, setFen] = useState('');
  const [ultimo, setUltimo] = useState<[Key, Key] | undefined>();
  const [tentou, setTentou] = useState(false); // errou ao menos uma vez neste puzzle
  const [dica, setDica] = useState(false);
  const [sync, setSync] = useState(0);
  const estat = useProgresso();

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limparTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  // Carrega um puzzle no tabuleiro (reinicia o estado de resolução).
  const carregar = useCallback(
    (p: Puzzle) => {
      limparTimers();
      chessRef.current = new Chess(p.fen);
      setPuzzle(p);
      setPasso(0);
      setStatus('resolvendo');
      setFen(p.fen);
      setUltimo(p.lance ? [p.lance[0] as Key, p.lance[1] as Key] : undefined);
      setTentou(false);
      setDica(false);
    },
    [limparTimers],
  );

  // Busca um novo puzzle no Lichess.
  const proximoLichess = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setCarregando(true);
    setErroMsg(undefined);
    try {
      const p = await buscarPuzzleLichess(dificuldade, ctrl.signal);
      if (!ctrl.signal.aborted) carregar(p);
    } catch (e) {
      if (ctrl.signal.aborted || (e as Error)?.name === 'AbortError') return;
      setErroMsg(e instanceof LichessErro ? e.message : 'Não foi possível buscar o puzzle.');
    } finally {
      if (!ctrl.signal.aborted) setCarregando(false);
    }
  }, [dificuldade, carregar]);

  // Troca para a aba "Meus erros" quando solicitado de fora (botão na Análise).
  useEffect(() => {
    if (abrirErros > 0) {
      setFonte('erro');
      setIdxErro(0);
    }
  }, [abrirErros]);

  // Carrega o primeiro puzzle conforme a fonte.
  useEffect(() => {
    if (!ativo) return;
    if (fonte === 'lichess') {
      if (!puzzle || puzzle.fonte !== 'lichess') void proximoLichess();
    } else {
      // Cancela qualquer busca do Lichess em andamento, para o resultado dela não
      // sobrescrever o puzzle do erro carregado (bug do "Treinar meus erros").
      abortRef.current?.abort();
      setCarregando(false);
      setErroMsg(undefined);
      if (errosPuzzles.length > 0) carregar(errosPuzzles[Math.min(idxErro, errosPuzzles.length - 1)]);
      else setPuzzle(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, fonte, idxErro, errosPuzzles]);

  useEffect(() => () => limparTimers(), [limparTimers]);

  const chess = chessRef.current;
  const vezSolver = !!puzzle && corDaVez(chess) === puzzle.orientacao && status === 'resolvendo';
  const dests = useMemo(
    () => (vezSolver ? destinosLegais(chess) : new Map<Key, Key[]>()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fen, vezSolver],
  );

  const concluir = useCallback(
    (limpo: boolean) => {
      setStatus('resolvido');
      registrarPuzzle(true, limpo, puzzle?.rating); // resolvido conta sempre
      miar(limpo ? 2 : 1);
    },
    [puzzle],
  );

  // Aplica um lance correto e, se houver, a resposta forçada do adversário.
  const aplicarCerto = useCallback(
    (uci: string) => {
      const c = chessRef.current;
      try {
        c.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length > 4 ? uci.slice(4) : undefined,
        });
      } catch {
        return;
      }
      const np = passo + 1;
      setFen(c.fen());
      setUltimo([uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]);
      setPasso(np);
      setDica(false);
      if (!puzzle || np >= puzzle.solucao.length) {
        concluir(!tentou);
        return;
      }
      setStatus('acertou');
      timerRef.current = setTimeout(() => {
        const reply = puzzle.solucao[np];
        try {
          c.move({
            from: reply.slice(0, 2),
            to: reply.slice(2, 4),
            promotion: reply.length > 4 ? reply.slice(4) : undefined,
          });
        } catch {
          /* ignore */
        }
        const np2 = np + 1;
        setFen(c.fen());
        setUltimo([reply.slice(0, 2) as Key, reply.slice(2, 4) as Key]);
        setPasso(np2);
        if (np2 >= puzzle.solucao.length) concluir(!tentou);
        else setStatus('resolvendo');
      }, 450);
    },
    [passo, puzzle, tentou, concluir],
  );

  const aoMover = useCallback(
    (orig: Key, dest: Key) => {
      if (!puzzle || status !== 'resolvendo') return;
      const esperado = puzzle.solucao[passo];
      const fromto = `${orig}${dest}`;
      // Testa legalidade e mate com o lance do usuário (promoção padrão = dama).
      const tmp = new Chess(chessRef.current.fen());
      let mv: ReturnType<Chess['move']> | null = null;
      try {
        mv = tmp.move({ from: orig, to: dest, promotion: 'q' });
      } catch {
        mv = null;
      }
      if (!mv) return; // lance ilegal — ignora
      const acertou = (!!esperado && esperado.slice(0, 4) === fromto) || tmp.isCheckmate();
      if (acertou) {
        // Usa o lance exato da solução (preserva subpromoção); senão, o do usuário.
        const uci =
          esperado && esperado.slice(0, 4) === fromto
            ? esperado
            : fromto + (mv.promotion ?? '');
        aplicarCerto(uci);
      } else {
        setTentou(true);
        setDica(false);
        setStatus('errou');
        setSync((s) => s + 1); // reverte o tabuleiro à posição do puzzle
        timerRef.current = setTimeout(
          () => setStatus((st) => (st === 'errou' ? 'resolvendo' : st)),
          800,
        );
      }
    },
    [puzzle, status, passo, aplicarCerto],
  );

  const verSolucao = useCallback(() => {
    if (!puzzle) return;
    limparTimers();
    setDica(false);
    setStatus('revelado'); // a seta verde + o texto mostram o lance certo
    registrarPuzzle(false, false); // viu a solução: não conta como resolvido
  }, [puzzle, limparTimers]);

  const proximo = useCallback(() => {
    if (fonte === 'lichess') {
      void proximoLichess();
    } else if (errosPuzzles.length > 0) {
      const prox = (idxErro + 1) % errosPuzzles.length;
      setIdxErro(prox);
      carregar(errosPuzzles[prox]);
    }
  }, [fonte, proximoLichess, errosPuzzles, idxErro, carregar]);

  // Marcações no tabuleiro:
  //  - Dica: círculo azul na peça a mover (sem entregar o destino).
  //  - Solução revelada: seta verde no lance certo.
  const shapes: DrawShape[] = [];
  const solAtual = puzzle?.solucao[passo];
  if (dica && puzzle && status === 'resolvendo' && solAtual && solAtual.length >= 2) {
    shapes.push({ orig: solAtual.slice(0, 2) as Key, brush: 'blue' });
  }
  if (puzzle && status === 'revelado' && solAtual && solAtual.length >= 4) {
    shapes.push({
      orig: solAtual.slice(0, 2) as Key,
      dest: solAtual.slice(2, 4) as Key,
      brush: 'green',
    });
  }

  const orient = puzzle?.orientacao ?? 'white';
  const ladoTxt = orient === 'white' ? 'as brancas' : 'as pretas';
  const semErros = fonte === 'erro' && errosPuzzles.length === 0;

  // Lance certo (em SAN PT-BR) a partir da posição atual — para texto e seta.
  const lanceCerto =
    puzzle && solAtual ? solucaoPtbr(chessRef.current.fen(), [solAtual]) : '';

  // Texto de status (abaixo do tabuleiro).
  let feedback = '';
  if (semErros) feedback = '';
  else if (carregando) feedback = 'Carregando puzzle…';
  else if (status === 'resolvido') feedback = tentou ? '✓ Resolvido! 🎉' : '✓ Resolvido sem errar! 🏆';
  else if (status === 'revelado') feedback = `O lance certo era ${lanceCerto || '—'} (seta verde).`;
  else if (status === 'errou') feedback = '✗ Esse não. Tente outro lance.';
  else if (status === 'acertou') feedback = '✓ Isso! Agora o próximo lance…';
  else if (puzzle) feedback = `Sua vez — ache o melhor lance para ${ladoTxt}.`;

  const acabou = status === 'resolvido' || status === 'revelado';
  const linhaSolucao = puzzle && acabou ? solucaoPtbr(puzzle.fen, puzzle.solucao) : '';

  return (
    <div className="pz-layout">
      <div className="board-col">
        <Board
          fen={fen || new Chess().fen()}
          orientation={orient}
          movableColor={vezSolver ? orient : undefined}
          dests={dests}
          lastMove={ultimo}
          check={!!fen && emXeque(chess)}
          shapes={shapes}
          syncSignal={sync}
          onMove={aoMover}
        />
        <div className={'pz-status s-' + status}>{feedback || ' '}</div>
      </div>

      <div className="panel">
        <div className="pz-top">
          <div>
            <span className="eyebrow">Treino de táticas</span>
            <h2 className="pz-h2">Puzzles</h2>
          </div>
          <div className="pz-estat" title="Resolvidos · sequência · recorde">
            <span>
              <b>{estat.puzzlesResolvidos}</b> resolvidos
            </span>
            <span>
              🔥 <b>{estat.puzzleSequencia}</b> · recorde {estat.puzzleRecorde}
            </span>
          </div>
        </div>

        <div className="pz-fonte">
          <button
            className={'pz-tab' + (fonte === 'lichess' ? ' on' : '')}
            onClick={() => setFonte('lichess')}
          >
            Puzzles do Lichess
          </button>
          <button
            className={'pz-tab' + (fonte === 'erro' ? ' on' : '')}
            onClick={() => setFonte('erro')}
          >
            Meus erros{errosPuzzles.length > 0 ? ` (${errosPuzzles.length})` : ''}
          </button>
        </div>

        {fonte === 'lichess' && (
          <div className="pz-dif">
            <label className="lbl" htmlFor="pz-dif">
              Dificuldade
            </label>
            <select
              id="pz-dif"
              value={dificuldade}
              onChange={(e) => setDificuldade(e.target.value as DificuldadePuzzle)}
            >
              {(Object.keys(ROTULO_DIF) as DificuldadePuzzle[]).map((d) => (
                <option key={d} value={d}>
                  {ROTULO_DIF[d]}
                </option>
              ))}
            </select>
          </div>
        )}

        {erroMsg && <div className="pz-erro">⚠ {erroMsg}</div>}

        {semErros ? (
          <div className="pz-vazio">
            <p>
              Você ainda não tem erros para treinar. Vá à aba <strong>Análise</strong>, analise uma
              partida sua (ou importada) e os erros viram puzzles aqui — "ache o melhor lance que
              faltou".
            </p>
          </div>
        ) : (
          <>
            {puzzle && !acabou && (
              <div className="pz-objetivo">
                🎯 <strong>Ache o melhor lance para {ladoTxt}.</strong>
              </div>
            )}

            {puzzle && (
              <div className="pz-info">
                {puzzle.titulo && <div className="pz-titulo">{puzzle.titulo}</div>}
                {puzzle.contexto && <div className="pz-ctx">{puzzle.contexto}</div>}
                <div className="pz-meta">
                  {fonte === 'erro' && (
                    <span className="tag">
                      {idxErro + 1} / {errosPuzzles.length}
                    </span>
                  )}
                  {puzzle.rating != null && <span className="tag">Rating {puzzle.rating}</span>}
                  {puzzle.temas?.slice(0, 3).map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {status === 'revelado' && (
              <div className="pz-solucao destaque">
                <span className="pz-sol-rot">Lance certo</span>
                <span className="pz-sol-mv">{lanceCerto || '—'}</span>
                {linhaSolucao && <span className="pz-sol-linha">sequência: {linhaSolucao}</span>}
              </div>
            )}
            {status === 'resolvido' && linhaSolucao && (
              <div className="pz-solucao">
                Solução: <strong>{linhaSolucao}</strong>
              </div>
            )}

            <div className="pz-acoes">
              {!acabou && (
                <>
                  <button
                    className="btn"
                    onClick={() => setDica(true)}
                    disabled={!puzzle || dica}
                    title="Destaca a peça que deve ser movida"
                  >
                    💡 Dica
                  </button>
                  <button className="btn" onClick={verSolucao} disabled={!puzzle}>
                    👁 Ver solução
                  </button>
                </>
              )}
              <button className="btn primary" onClick={proximo} disabled={carregando}>
                {acabou ? '➜ ' : ''}
                {fonte === 'lichess' ? 'Próximo puzzle' : 'Próximo'}
              </button>
            </div>

            {!acabou && (
              <p className="pz-comofunciona">
                Como funciona: você vê uma posição real e deve jogar o melhor lance (o que um
                campeão jogaria). Errou? tente de novo. Travou? use a <strong>Dica</strong> ou{' '}
                <strong>Ver solução</strong>.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
