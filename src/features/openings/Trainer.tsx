import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Key } from 'chessground/types';
import { Board } from '../../components/Board';
import { Chess, destinosLegais, type Move } from '../../core/chess';
import { Engine } from '../../core/engine';
import { sanParaPtBr } from '../../core/notation';
import { OPENINGS, type Opening } from './data';
import './Trainer.css';

type Modo = 'estudo' | 'treino';
type Lado = 'white' | 'black';
type Analise = { melhorSan: string; avaliacao: string; texto: string } | null;

// Posições e casas de cada lance, geradas pelo chess.js a partir do SAN.
function derivarPosicoes(opening: Opening) {
  const c = new Chess();
  const fens: string[] = [c.fen()];
  const moves: (([Key, Key]) | undefined)[] = [undefined];
  for (const ply of opening.plies) {
    const m = c.move(ply.san) as Move;
    fens.push(c.fen());
    moves.push([m.from as Key, m.to as Key]);
  }
  return { fens, moves };
}

export function Trainer({ ativo }: { ativo: boolean }) {
  const [oi, setOi] = useState(0);
  const [modo, setModo] = useState<Modo>('estudo');
  const opening = OPENINGS[oi];
  const { fens, moves } = useMemo(() => derivarPosicoes(opening), [opening]);
  const total = opening.plies.length;

  return (
    <div className="trn-root">
      <header className="trn-head">
        <div className="trn-head-sel">
          <label className="lbl" htmlFor="sel-abertura">
            Escolha a abertura
          </label>
          <select id="sel-abertura" value={oi} onChange={(e) => setOi(parseInt(e.target.value, 10))}>
            {OPENINGS.map((o, i) => (
              <option key={o.name} value={i}>
                {o.name}
              </option>
            ))}
          </select>
          <div className="meta" style={{ marginTop: 10 }}>
            <span className="tag eco">ECO {opening.eco}</span>
            <span className="tag lvl" data-l={opening.lvl}>
              {opening.lvl}
            </span>
            <span className="tag">{total} lances</span>
          </div>
        </div>

        <div className="modo-switch" role="tablist" aria-label="Modo">
          <button
            role="tab"
            aria-selected={modo === 'estudo'}
            className={'modo-btn' + (modo === 'estudo' ? ' on' : '')}
            onClick={() => setModo('estudo')}
          >
            Estudo
          </button>
          <button
            role="tab"
            aria-selected={modo === 'treino'}
            className={'modo-btn' + (modo === 'treino' ? ' on' : '')}
            onClick={() => setModo('treino')}
          >
            Treino
          </button>
        </div>
      </header>

      {modo === 'estudo' ? (
        <Estudo key={oi} opening={opening} fens={fens} moves={moves} total={total} ativo={ativo} />
      ) : (
        <Treino key={oi} opening={opening} fens={fens} moves={moves} total={total} />
      )}
    </div>
  );
}

// ===========================================================================
// ESTUDO — percorrer a linha lance a lance, com a ideia/consequência de cada um.
// ===========================================================================
function Estudo({
  opening,
  fens,
  moves,
  total,
  ativo,
}: {
  opening: Opening;
  fens: string[];
  moves: (([Key, Key]) | undefined)[];
  total: number;
  ativo: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const engineRef = useRef<Engine | null>(null);
  const [analise, setAnalise] = useState<Analise>(null);
  const [analisando, setAnalisando] = useState(false);

  const irPara = useCallback((n: number) => {
    setIdx(n);
    setAnalise(null);
  }, []);

  // Navegação por teclado quando o módulo está ativo.
  useEffect(() => {
    if (!ativo) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIdx((i) => Math.min(total, i + 1));
        setAnalise(null);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
        setAnalise(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [ativo, total]);

  const analisar = useCallback(async () => {
    if (!engineRef.current) {
      engineRef.current = new Engine();
      engineRef.current.setNivel('profissional');
    }
    setAnalisando(true);
    setAnalise(null);
    try {
      const fen = fens[idx];
      const r = await engineRef.current.analyze(fen, 900);
      setAnalise(montarAnalise(fen, r));
    } finally {
      setAnalisando(false);
    }
  }, [fens, idx]);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="trn-cols">
      <div className="trn-left">
        <Board fen={fens[idx]} lastMove={moves[idx]} viewOnly orientation="white" />
        <div className="trn-controls">
          <button className="btn" onClick={() => irPara(0)} disabled={idx === 0} title="Início">
            ⇤
          </button>
          <button
            className="btn"
            onClick={() => irPara(Math.max(0, idx - 1))}
            disabled={idx === 0}
            title="Anterior"
          >
            ←
          </button>
          <button
            className="btn"
            onClick={() => irPara(Math.min(total, idx + 1))}
            disabled={idx === total}
            title="Próximo"
          >
            →
          </button>
          <button className="btn" onClick={() => irPara(total)} disabled={idx === total} title="Final">
            ⇥
          </button>
        </div>
        <div className="trn-progress">
          {idx} / {total}
        </div>
      </div>

      <div className="trn-right">
        <Lances opening={opening} idx={idx} irPara={irPara} />
        <Nota opening={opening} idx={idx} />
        {opening.historia && <Historia opening={opening} />}
        <div className="analise-bloco">
          <button className="btn" onClick={analisar} disabled={analisando}>
            {analisando ? 'Analisando…' : 'Analisar com o motor'}
          </button>
          {analise && <AnaliseRes analise={analise} />}
          <p className="analise-dica">
            Mostra o que o motor faria nesta posição — útil para ver o que acontece ao sair da
            teoria.
          </p>
        </div>
      </div>
    </div>
  );
}

function Lances({
  opening,
  idx,
  irPara,
}: {
  opening: Opening;
  idx: number;
  irPara: (n: number) => void;
}) {
  return (
    <div className="scoresheet trn-sheet">
      {opening.plies.map((p, i) => (
        <span key={i}>
          {i % 2 === 0 && <span className="mvnum">{i / 2 + 1}.</span>}
          <span
            className={'mv clic' + (i === idx - 1 ? ' on' : '')}
            onClick={() => irPara(i + 1)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') irPara(i + 1);
            }}
          >
            {sanParaPtBr(p.san)}
          </span>{' '}
        </span>
      ))}
    </div>
  );
}

function Historia({ opening }: { opening: Opening }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="historia-bloco">
      <button
        className="historia-tog"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        <span>📜 História da abertura</span>
        <span className={'chev' + (aberto ? ' on' : '')}>▾</span>
      </button>
      {aberto && <p className="historia-txt">{opening.historia}</p>}
    </div>
  );
}

function Nota({ opening, idx }: { opening: Opening; idx: number }) {
  if (idx === 0) {
    return (
      <div className="nota">
        <div className="nota-ply">{opening.name.split('(')[0].trim()}</div>
        <div className="nota-body intro">{opening.intro}</div>
      </div>
    );
  }
  const p = opening.plies[idx - 1];
  const num = Math.ceil(idx / 2);
  const dots = idx % 2 === 1 ? '.' : '...';
  return (
    <div className="nota">
      <div className="nota-ply">
        {sanParaPtBr(p.san)}
        <small>
          {num}
          {dots} · lance {idx} de {opening.plies.length}
        </small>
      </div>
      <div className="nota-body">{p.note}</div>
    </div>
  );
}

// ===========================================================================
// TREINO — o aluno joga a teoria no tabuleiro; o motor avalia os desvios.
// ===========================================================================
function Treino({
  opening,
  fens,
  moves,
  total,
}: {
  opening: Opening;
  fens: string[];
  moves: (([Key, Key]) | undefined)[];
  total: number;
}) {
  const [lado, setLado] = useState<Lado>('white');
  const [pos, setPos] = useState(0); // lances da teoria já realizados
  const [feedback, setFeedback] = useState<{
    tipo: 'certo' | 'errado' | 'fim';
    msg: string;
  } | null>(null);
  const [syncSignal, setSyncSignal] = useState(0);
  const [desvio, setDesvio] = useState<{ fen: string } | null>(null);
  const [analise, setAnalise] = useState<Analise>(null);
  const [analisando, setAnalisando] = useState(false);
  const engineRef = useRef<Engine | null>(null);

  const reiniciar = useCallback(() => {
    setPos(0);
    setFeedback(null);
    setDesvio(null);
    setAnalise(null);
  }, []);

  useEffect(() => {
    reiniciar();
  }, [lado, reiniciar]);

  const ladoDaVez: Lado = pos % 2 === 0 ? 'white' : 'black';
  const vezDoAluno = ladoDaVez === lado && pos < total;

  // Auto-joga o lance da teoria quando é a vez do "adversário".
  useEffect(() => {
    if (pos >= total || ladoDaVez === lado) return;
    const t = setTimeout(() => {
      const ply = opening.plies[pos];
      setPos((p) => p + 1);
      setFeedback({
        tipo: 'certo',
        msg: `Resposta da teoria: ${sanParaPtBr(ply.san)}. ${ply.note}`,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [pos, lado, ladoDaVez, total, opening]);

  const dests = useMemo(() => {
    if (!vezDoAluno) return new Map<Key, Key[]>();
    return destinosLegais(new Chess(fens[pos]));
  }, [vezDoAluno, pos, fens]);

  const aoMover = useCallback(
    (orig: Key, dest: Key) => {
      const esperado = opening.plies[pos];
      const tmp = new Chess(fens[pos]);
      let mv: Move | null = null;
      try {
        mv = tmp.move({ from: orig, to: dest, promotion: 'q' }) as Move;
      } catch {
        mv = null;
      }
      if (mv && mv.san === esperado.san) {
        setDesvio(null);
        setAnalise(null);
        const novaPos = pos + 1;
        setPos(novaPos);
        setFeedback(
          novaPos >= total
            ? { tipo: 'fim', msg: `Linha completa! ${esperado.note}` }
            : { tipo: 'certo', msg: `Correto: ${sanParaPtBr(esperado.san)}. ${esperado.note}` },
        );
      } else {
        const sanJogado = mv ? sanParaPtBr(mv.san) : null;
        setFeedback({
          tipo: 'errado',
          msg: sanJogado
            ? `${sanJogado} sai da teoria. O esperado era ${sanParaPtBr(esperado.san)}.`
            : 'Lance fora da teoria.',
        });
        if (mv) setDesvio({ fen: tmp.fen() });
        setAnalise(null);
        setSyncSignal((s) => s + 1); // reverte o tabuleiro à posição teórica
      }
    },
    [opening, pos, fens, total],
  );

  const analisarDesvio = useCallback(async () => {
    if (!desvio) return;
    if (!engineRef.current) {
      engineRef.current = new Engine();
      engineRef.current.setNivel('profissional');
    }
    setAnalisando(true);
    setAnalise(null);
    try {
      const r = await engineRef.current.analyze(desvio.fen, 900);
      setAnalise(montarAnalise(desvio.fen, r));
    } finally {
      setAnalisando(false);
    }
  }, [desvio]);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="trn-cols">
      <div className="trn-left">
        <Board
          fen={fens[pos]}
          orientation={lado}
          movableColor={vezDoAluno ? lado : undefined}
          dests={dests}
          lastMove={moves[pos]}
          syncSignal={syncSignal}
          onMove={aoMover}
        />
        <div className="treino-barra">
          <div className="treino-lado">
            <label className="lbl" htmlFor="treino-lado">
              Treinar como
            </label>
            <select id="treino-lado" value={lado} onChange={(e) => setLado(e.target.value as Lado)}>
              <option value="white">Brancas</option>
              <option value="black">Pretas</option>
            </select>
          </div>
          <button className="btn" onClick={reiniciar}>
            Reiniciar
          </button>
        </div>
        <div className="trn-progress">
          {pos} / {total}{' '}
          {vezDoAluno ? '· sua vez' : pos < total ? '· teoria responde…' : '· fim'}
        </div>
      </div>

      <div className="trn-right">
        <div className={'treino-feedback ' + (feedback?.tipo ?? '')}>
          {feedback ? (
            feedback.msg
          ) : (
            <span className="placeholder">
              {vezDoAluno
                ? 'Faça o lance da teoria no tabuleiro.'
                : 'A teoria fará o primeiro lance…'}
            </span>
          )}
        </div>

        {desvio && (
          <div className="analise-bloco">
            <button className="btn" onClick={analisarDesvio} disabled={analisando}>
              {analisando ? 'Analisando…' : 'Analisar o desvio com o motor'}
            </button>
            {analise && <AnaliseRes analise={analise} />}
          </div>
        )}

        <Lances opening={opening} idx={pos} irPara={() => {}} />
      </div>
    </div>
  );
}

// ---- helpers compartilhados ----
function AnaliseRes({ analise }: { analise: NonNullable<Analise> }) {
  return (
    <div className="analise-res">
      <span className="analise-eval">{analise.avaliacao}</span>
      <span>
        {analise.texto}: melhor lance <strong>{analise.melhorSan}</strong>
      </span>
    </div>
  );
}

function montarAnalise(fen: string, r: { best: string; cp?: number; mate?: number }): Analise {
  const tmp = new Chess(fen);
  let san = r.best;
  try {
    const mv = tmp.move({
      from: r.best.slice(0, 2),
      to: r.best.slice(2, 4),
      promotion: r.best.length > 4 ? r.best.slice(4) : undefined,
    }) as Move;
    san = mv.san;
  } catch {
    /* mantém UCI cru se algo falhar */
  }
  const brancasJogam = fen.split(' ')[1] === 'w';
  return {
    melhorSan: sanParaPtBr(san),
    avaliacao: formatarAvaliacao(r.cp, r.mate, brancasJogam),
    texto: brancasJogam ? 'Vez das brancas' : 'Vez das pretas',
  };
}

// Avaliação do motor em texto branco-relativo (ex.: "+0.34", "Mate em 3").
function formatarAvaliacao(cp: number | undefined, mate: number | undefined, brancasJogam: boolean): string {
  if (mate !== undefined) {
    const branco = brancasJogam ? mate : -mate;
    return branco > 0 ? `Mate em ${Math.abs(mate)}` : `Mate em ${Math.abs(mate)} (contra)`;
  }
  if (cp === undefined) return '—';
  const branco = brancasJogam ? cp : -cp;
  const v = (branco / 100).toFixed(2);
  return (branco >= 0 ? '+' : '') + v;
}
