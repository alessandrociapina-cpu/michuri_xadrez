import { useEffect, useState } from 'react';
import './Splash.css';

// Tela de abertura: foto do Michuri + nome do app. Some sozinha após alguns
// segundos, ou ao toque/clique. Respeita prefers-reduced-motion (sem animações).
export function Splash({ onDone }: { onDone: () => void }) {
  const [fechando, setFechando] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFechando(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!fechando) return;
    const t = setTimeout(onDone, 520);
    return () => clearTimeout(t);
  }, [fechando, onDone]);

  const src = import.meta.env.BASE_URL + 'michuri.jpg';

  return (
    <div
      className={'splash' + (fechando ? ' fechando' : '')}
      onClick={() => setFechando(true)}
      role="button"
      aria-label="Entrar no app"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') setFechando(true);
      }}
    >
      <div className="splash-card">
        <div className="splash-foto-wrap">
          <img className="splash-foto" src={src} alt="Michuri, o gato" />
        </div>
        <div className="splash-eyebrow">PWA de Xadrez</div>
        <h1 className="splash-title">
          Xadrez do <em>Michuri</em>
        </h1>
        <p className="splash-sub">Jogue contra o motor e estude aberturas clássicas.</p>
        <div className="splash-hint">toque para começar</div>
      </div>
    </div>
  );
}
