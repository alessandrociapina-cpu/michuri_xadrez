import { NIVEIS, type Nivel } from '../core/engine';
import {
  useSettings,
  setSettings,
  PALETAS,
  ROTULO_MATERIAL,
  type Tema,
  type Material,
  type Lado,
} from '../core/settings';
import { tocarMovimento } from '../core/somPecas';
import './Configuracoes.css';

// Hub de Configurações (abre num modal pelo botão ⚙ do cabeçalho). Reúne as
// opções de jogo (nível, lado) e de aparência/som, que antes ficavam espalhadas.
export function Configuracoes({ onFechar }: { onFechar: () => void }) {
  const s = useSettings();

  return (
    <div className="cfg-overlay" role="dialog" aria-modal="true" aria-label="Configurações">
      <div className="cfg-modal">
        <header className="cfg-head">
          <h2>Configurações</h2>
          <button className="cfg-x" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div className="cfg-corpo">
          <section className="cfg-sec">
            <span className="cfg-tit">Jogo</span>
            <label className="lbl" htmlFor="cfg-nivel">
              Nível do motor
            </label>
            <select
              id="cfg-nivel"
              value={s.nivel}
              onChange={(e) => setSettings({ nivel: e.target.value as Nivel })}
            >
              {(Object.keys(NIVEIS) as Nivel[]).map((n) => (
                <option key={n} value={n}>
                  {NIVEIS[n].rotulo}
                </option>
              ))}
            </select>
            <label className="lbl" htmlFor="cfg-lado" style={{ marginTop: 12 }}>
              Você joga de
            </label>
            <select
              id="cfg-lado"
              value={s.lado}
              onChange={(e) => setSettings({ lado: e.target.value as Lado })}
            >
              <option value="white">Brancas</option>
              <option value="black">Pretas</option>
            </select>
            <p className="cfg-hint">O lado vale a partir da próxima partida.</p>
          </section>

          <section className="cfg-sec">
            <span className="cfg-tit">Tabuleiro</span>
            <div className="cfg-paletas">
              {(Object.keys(PALETAS) as Tema[]).map((t) => {
                const p = PALETAS[t];
                return (
                  <button
                    key={t}
                    className={'cfg-paleta' + (s.tema === t ? ' on' : '')}
                    onClick={() => setSettings({ tema: t })}
                    title={p.nome}
                  >
                    <span className="cfg-swatch">
                      <span style={{ background: p.light }} />
                      <span style={{ background: p.dark }} />
                      <span style={{ background: p.dark }} />
                      <span style={{ background: p.light }} />
                    </span>
                    <span className="cfg-paleta-nome">{p.nome}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="cfg-sec">
            <span className="cfg-tit">Material das peças</span>
            <div className="cfg-chips">
              {(Object.keys(ROTULO_MATERIAL) as Material[]).map((m) => (
                <button
                  key={m}
                  className={'cfg-chip' + (s.material === m ? ' on' : '')}
                  onClick={() => {
                    setSettings({ material: m });
                    if (s.somMover) tocarMovimento(m); // prévia do som do material
                  }}
                >
                  {ROTULO_MATERIAL[m]}
                </button>
              ))}
            </div>
          </section>

          <section className="cfg-sec">
            <span className="cfg-tit">Som</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={s.somMover}
                onChange={(e) => setSettings({ somMover: e.target.checked })}
              />
              <span className="switch-tr" />
              <span className="switch-tx">Som ao mover as peças</span>
            </label>
            <button
              className="btn"
              style={{ marginTop: 10, alignSelf: 'flex-start' }}
              onClick={() => tocarMovimento(s.material)}
            >
              ♪ Testar o som
            </button>
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
