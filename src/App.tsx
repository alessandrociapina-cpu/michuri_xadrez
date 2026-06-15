import { useState } from 'react';
import { Play } from './features/play/Play';
import { Trainer } from './features/openings/Trainer';
import { Michuri } from './components/Michuri';
import { Splash } from './components/Splash';
import './App.css';

type Aba = 'jogar' | 'aberturas';

export function App() {
  const [aba, setAba] = useState<Aba>('jogar');
  const [splash, setSplash] = useState(true);

  return (
    <div className="app-wrap">
      {splash && <Splash onDone={() => setSplash(false)} />}
      <header className="app-top">
        <div className="brand">
          <Michuri className="brand-cat" />
          <div>
            <div className="eyebrow">Xadrez do Michuri</div>
            <h1 className="app-title">
              Jogue & <em>estude</em>
            </h1>
          </div>
        </div>
        <nav className="app-nav" aria-label="Módulos">
          <button
            className={'navbtn' + (aba === 'jogar' ? ' on' : '')}
            onClick={() => setAba('jogar')}
            aria-pressed={aba === 'jogar'}
          >
            Jogar
          </button>
          <button
            className={'navbtn' + (aba === 'aberturas' ? ' on' : '')}
            onClick={() => setAba('aberturas')}
            aria-pressed={aba === 'aberturas'}
          >
            Aberturas
          </button>
        </nav>
      </header>

      <main className="app-main">
        {/* Mantemos as duas telas montadas para preservar o estado (partida em
            andamento, posição estudada) ao alternar entre os módulos. */}
        <section hidden={aba !== 'jogar'} aria-hidden={aba !== 'jogar'}>
          <Play ativo={aba === 'jogar'} />
        </section>
        <section hidden={aba !== 'aberturas'} aria-hidden={aba !== 'aberturas'}>
          <Trainer ativo={aba === 'aberturas'} />
        </section>
      </main>
    </div>
  );
}
