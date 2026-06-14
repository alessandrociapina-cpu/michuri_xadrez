import { useState } from 'react';
import { Play } from './features/play/Play';
import { Trainer } from './features/openings/Trainer';
import './App.css';

type Aba = 'jogar' | 'aberturas';

export function App() {
  const [aba, setAba] = useState<Aba>('jogar');

  return (
    <div className="app-wrap">
      <header className="app-top">
        <div>
          <div className="eyebrow">Michuri · Xadrez</div>
          <h1 className="app-title">
            Jogue & <em>estude</em>
          </h1>
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
