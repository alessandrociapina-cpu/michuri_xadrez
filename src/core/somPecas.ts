// Som do movimento das peças, sintetizado com a Web Audio API (sem arquivos).
// Cada "material" tem um timbre: madeira (toc), pedra (clack seco) e metal
// (clink com ressonância). O material "padrão" usa um clique discreto.

import type { Material } from './settings';

let ctx: AudioContext | null = null;

function pegarContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Pequeno buffer de ruído (transiente do impacto). */
function ruido(c: AudioContext, dur: number): AudioBufferSourceNode {
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const dados = buf.getChannelData(0);
  for (let i = 0; i < n; i++) dados[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

type Receita = {
  /** Parciais tonais (Hz) e seus ganhos. */
  parciais: Array<[freq: number, ganho: number]>;
  /** Duração do decaimento tonal (s). */
  decai: number;
  /** Corte do passa-baixa do transiente de ruído (Hz). */
  ruidoCorte: number;
  /** Ganho do transiente de ruído. */
  ruidoGanho: number;
  /** Ganho geral. */
  volume: number;
};

const RECEITAS: Record<Material, Receita> = {
  padrao: {
    parciais: [[900, 0.5], [1500, 0.25]],
    decai: 0.05,
    ruidoCorte: 2200,
    ruidoGanho: 0.25,
    volume: 0.5,
  },
  madeira: {
    parciais: [[260, 0.6], [430, 0.4], [680, 0.2]],
    decai: 0.09,
    ruidoCorte: 1600,
    ruidoGanho: 0.3,
    volume: 0.6,
  },
  pedra: {
    parciais: [[150, 0.6], [300, 0.3]],
    decai: 0.06,
    ruidoCorte: 700,
    ruidoGanho: 0.5,
    volume: 0.7,
  },
  metal: {
    // Parciais inarmônicos = caráter metálico, com cauda mais longa.
    parciais: [[1200, 0.4], [1870, 0.3], [2550, 0.25], [3300, 0.2]],
    decai: 0.32,
    ruidoCorte: 5000,
    ruidoGanho: 0.18,
    volume: 0.45,
  },
};

/** Toca o som de um movimento de peça com o timbre do material. */
export function tocarMovimento(material: Material): void {
  const c = pegarContexto();
  if (!c) return;
  const r = RECEITAS[material] ?? RECEITAS.padrao;
  const t0 = c.currentTime + 0.005;

  const master = c.createGain();
  master.gain.value = r.volume;
  master.connect(c.destination);

  // Transiente de ruído (o "impacto" inicial).
  const nz = ruido(c, 0.03);
  const nzFiltro = c.createBiquadFilter();
  nzFiltro.type = 'lowpass';
  nzFiltro.frequency.value = r.ruidoCorte;
  const nzGanho = c.createGain();
  nzGanho.gain.setValueAtTime(r.ruidoGanho, t0);
  nzGanho.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
  nz.connect(nzFiltro);
  nzFiltro.connect(nzGanho);
  nzGanho.connect(master);
  nz.start(t0);
  nz.stop(t0 + 0.04);

  // Parciais tonais com decaimento exponencial.
  for (const [freq, ganho] of r.parciais) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(ganho, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + r.decai);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + r.decai + 0.02);
  }
}
