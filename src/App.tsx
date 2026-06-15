import { useCallback, useState } from 'react';
import { Play } from './features/play/Play';
import { Trainer } from './features/openings/Trainer';
import { Analise } from './features/analysis/Analise';
import { Michuri } from './components/Michuri';
import { Splash } from './components/Splash';
import './App.css';

type Aba = 'jogar' | 'aberturas' | 'analise';

export function App() {
  const [aba, setAba] = useState<Aba>('jogar');
  const [splash, setSplash] = useState(true);
  // PGN enviado da aba Jogar para a aba Análise.
  const [pgnAnalise, setPgnAnalise] = useState<string | undefined>();

  const enviarParaAnalise = useCallback((pgn: string) => {
    setPgnAnalise(pgn);
    setAba('analise');
  }, []);

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
          <button
            className={'navbtn' + (aba === 'analise' ? ' on' : '')}
            onClick={() => setAba('analise')}
            aria-pressed={aba === 'analise'}
          >
            Análise
          </button>
        </nav>
      </header>

      <main className="app-main">
        {/* Mantemos as telas montadas para preservar o estado (partida em
            andamento, posição estudada, análise) ao alternar entre os módulos. */}
        <section hidden={aba !== 'jogar'} aria-hidden={aba !== 'jogar'}>
          <Play ativo={aba === 'jogar'} onAnalisar={enviarParaAnalise} />
        </section>
        <section hidden={aba !== 'aberturas'} aria-hidden={aba !== 'aberturas'}>
          <Trainer ativo={aba === 'aberturas'} />
        </section>
        <section hidden={aba !== 'analise'} aria-hidden={aba !== 'analise'}>
          <Analise ativo={aba === 'analise'} pgnInicial={pgnAnalise} />
        </section>
      </main>
    </div>
  );
}
