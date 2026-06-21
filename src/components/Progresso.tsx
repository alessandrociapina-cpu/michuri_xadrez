import {
  useProgresso,
  xpDe,
  nivelDe,
  CONQUISTAS,
  type Progresso as Prog,
} from '../core/progresso';
import './Progresso.css';

export function Progresso({ onFechar }: { onFechar: () => void }) {
  const p = useProgresso();
  const xp = xpDe(p);
  const nv = nivelDe(xp);
  // Progresso dentro do nível atual (para a barra).
  const pct =
    nv.proxima != null
      ? Math.max(0, Math.min(100, ((xp - nv.base) / (nv.proxima - nv.base)) * 100))
      : 100;

  const conquistadas = CONQUISTAS.filter((c) => c.atual(p) >= c.meta).length;

  return (
    <div className="cfg-overlay" role="dialog" aria-modal="true" aria-label="Progresso e conquistas">
      <div className="cfg-modal">
        <header className="cfg-head">
          <h2>Progresso</h2>
          <button className="cfg-x" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div className="cfg-corpo">
          <section className="prog-nivel">
            <div className="prog-nivel-top">
              <span className="prog-nivel-nome">{nv.nome}</span>
              <span className="prog-xp">{xp} XP</span>
            </div>
            <div className="prog-barra">
              <div className="prog-barra-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="prog-nivel-proximo">
              {nv.proxima != null
                ? `Faltam ${nv.proxima - xp} XP para ${nv.proximoNome}`
                : 'Nível máximo alcançado! 🏅'}
            </span>
          </section>

          <section className="cfg-sec">
            <span className="cfg-tit">Estatísticas</span>
            <div className="prog-stats">
              <Stat n={p.puzzlesResolvidos} rot="puzzles resolvidos" />
              <Stat n={p.puzzleRecorde} rot="recorde de sequência" />
              <Stat n={p.puzzleRatingMax || '—'} rot="puzzle mais difícil" />
              <Stat n={p.partidasJogadas} rot="partidas jogadas" />
              <Stat n={p.vitorias} rot="vitórias" />
              <Stat n={p.partidasAnalisadas} rot="partidas analisadas" />
              <Stat
                n={p.melhorPrecisao ? `${p.melhorPrecisao.toFixed(0)}%` : '—'}
                rot="melhor precisão"
              />
              <Stat n={p.aberturasEstudadas.length} rot="aberturas estudadas" />
              <Stat n={p.dias.length} rot="dias de treino" />
            </div>
          </section>

          <section className="cfg-sec">
            <span className="cfg-tit">
              Conquistas · {conquistadas}/{CONQUISTAS.length}
            </span>
            <div className="prog-conquistas">
              {CONQUISTAS.map((c) => {
                const a = c.atual(p);
                const ok = a >= c.meta;
                const frac = Math.max(0, Math.min(1, a / c.meta));
                return (
                  <div className={'conquista' + (ok ? ' ok' : '')} key={c.id}>
                    <span className="conq-emoji">{ok ? c.emoji : '🔒'}</span>
                    <div className="conq-info">
                      <span className="conq-titulo">{c.titulo}</span>
                      <span className="conq-desc">{c.desc}</span>
                      {!ok && (
                        <div className="conq-barra">
                          <div className="conq-barra-fill" style={{ width: `${frac * 100}%` }} />
                        </div>
                      )}
                    </div>
                    {!ok && (
                      <span className="conq-prog">
                        {Math.min(a, c.meta)}/{c.meta}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <footer className="cfg-rodape">
          <button className="btn primary" onClick={onFechar}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}

function Stat({ n, rot }: { n: number | string; rot: string }) {
  return (
    <div className="prog-stat">
      <span className="prog-stat-n">{n}</span>
      <span className="prog-stat-rot">{rot}</span>
    </div>
  );
}

// Reexporta o tipo só para conveniência de quem importa.
export type { Prog };
