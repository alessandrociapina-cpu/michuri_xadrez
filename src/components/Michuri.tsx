import './Michuri.css';

/**
 * Michuri estilizado — o gato preto de olhos verdes que inspira o app.
 * Os olhos piscam de tempos em tempos (desligado em prefers-reduced-motion).
 */
export function Michuri({ className }: { className?: string }) {
  return (
    <svg
      className={'michuri' + (className ? ' ' + className : '')}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Michuri, o gato"
      width="64"
      height="64"
    >
      <defs>
        <linearGradient id="michuri-pelo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#30271A" />
          <stop offset="1" stopColor="#12100A" />
        </linearGradient>
        <radialGradient id="michuri-olho" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#C8F39B" />
          <stop offset="0.55" stopColor="#8FD46A" />
          <stop offset="1" stopColor="#5BA23E" />
        </radialGradient>
      </defs>

      {/* orelhas */}
      <polygon points="20,16 41,40 16,47" fill="url(#michuri-pelo)" stroke="rgba(201,162,75,.28)" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points="80,16 59,40 84,47" fill="url(#michuri-pelo)" stroke="rgba(201,162,75,.28)" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points="24,22 36,38 21,42" fill="#4A3326" />
      <polygon points="76,22 64,38 79,42" fill="#4A3326" />

      {/* cabeça */}
      <ellipse cx="50" cy="57" rx="34" ry="30" fill="url(#michuri-pelo)" stroke="rgba(201,162,75,.28)" strokeWidth="1.2" />

      {/* mancha branca do peito/queixo */}
      <path d="M50 84 C45 80 43 74 50 72 C57 74 55 80 50 84 Z" fill="#F1EBDD" opacity="0.92" />

      {/* olhos (piscam) */}
      <g className="olho">
        <ellipse cx="37" cy="54" rx="8" ry="10" fill="url(#michuri-olho)" stroke="#4C8C33" strokeWidth="1" />
        <ellipse cx="37" cy="54" rx="2.3" ry="8" fill="#15231A" />
        <circle cx="34.6" cy="49.5" r="1.7" fill="#FBF7EA" opacity="0.9" />
      </g>
      <g className="olho">
        <ellipse cx="63" cy="54" rx="8" ry="10" fill="url(#michuri-olho)" stroke="#4C8C33" strokeWidth="1" />
        <ellipse cx="63" cy="54" rx="2.3" ry="8" fill="#15231A" />
        <circle cx="60.6" cy="49.5" r="1.7" fill="#FBF7EA" opacity="0.9" />
      </g>

      {/* focinho */}
      <polygon points="46,66 54,66 50,71" fill="#C9959E" />
      <path d="M50 71 L50 75 M50 75 C48 78 45 78 43.5 76 M50 75 C52 78 55 78 56.5 76"
        fill="none" stroke="#0F0C08" strokeWidth="1.3" strokeLinecap="round" />

      {/* bigodes */}
      <g stroke="#ECE3CF" strokeWidth="0.9" strokeLinecap="round" opacity="0.4">
        <line x1="30" y1="66" x2="9" y2="62" />
        <line x1="30" y1="69" x2="10" y2="70" />
        <line x1="70" y1="66" x2="91" y2="62" />
        <line x1="70" y1="69" x2="90" y2="70" />
      </g>
    </svg>
  );
}
