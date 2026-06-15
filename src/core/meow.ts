// O miado do Michuri. Em vez de embarcar um arquivo de áudio, sintetizamos o
// "miau" com a Web Audio API: é leve, funciona offline e não pesa no bundle.
// Um glissando de frequência (sobe e desce) + vibrato + filtro passa-baixa
// ressonante dá um timbre felino aceitável. Use `miar(1|2)` e `setMudo`.

const CHAVE_MUDO = 'michuri_mudo';

let mudo = (() => {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(CHAVE_MUDO) === '1';
  } catch {
    return false;
  }
})();

let ctx: AudioContext | null = null;

function pegarContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  // Navegadores suspendem o contexto até um gesto do usuário; retomamos sob demanda.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Agenda um único "miau" começando no instante `inicio` (em segundos do contexto). */
function umMiau(c: AudioContext, inicio: number): void {
  const dur = 0.44;

  // Envelope de amplitude (ataque rápido, cauda suave).
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, inicio);
  master.gain.exponentialRampToValueAtTime(0.5, inicio + 0.05);
  master.gain.setValueAtTime(0.5, inicio + 0.2);
  master.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);

  // Filtro passa-baixa com Q alto: dá o caráter "vogal" (formante) do miado.
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1100, inicio);
  lp.frequency.linearRampToValueAtTime(3000, inicio + 0.12);
  lp.frequency.linearRampToValueAtTime(1400, inicio + dur);
  lp.Q.value = 7;
  master.connect(lp);
  lp.connect(c.destination);

  // Duas camadas (corpo + brilho) com o mesmo contorno de pitch: "miii-aaau".
  const f0 = 520;
  const fPico = 900;
  const fFim = 640;
  const camadas: Array<{ tipo: OscillatorType; ganho: number; mult: number }> = [
    { tipo: 'sawtooth', ganho: 0.5, mult: 1 },
    { tipo: 'triangle', ganho: 0.45, mult: 2 },
  ];

  for (const cam of camadas) {
    const o = c.createOscillator();
    o.type = cam.tipo;
    o.frequency.setValueAtTime(f0 * cam.mult, inicio);
    o.frequency.linearRampToValueAtTime(fPico * cam.mult, inicio + 0.1);
    o.frequency.linearRampToValueAtTime(fFim * cam.mult, inicio + dur);

    const g = c.createGain();
    g.gain.value = cam.ganho;
    o.connect(g);
    g.connect(master);

    // Vibrato leve, para soar mais "vivo".
    const lfo = c.createOscillator();
    lfo.frequency.value = 17;
    const lfoG = c.createGain();
    lfoG.gain.value = 13 * cam.mult;
    lfo.connect(lfoG);
    lfoG.connect(o.frequency);

    o.start(inicio);
    lfo.start(inicio);
    o.stop(inicio + dur + 0.02);
    lfo.stop(inicio + dur + 0.02);
  }
}

/** Mia `vezes` vezes em sequência (1 = bom lance, 2 = lance brilhante). */
export function miar(vezes = 1): void {
  if (mudo || vezes <= 0) return;
  const c = pegarContexto();
  if (!c) return;
  const t0 = c.currentTime + 0.02;
  for (let i = 0; i < vezes; i++) {
    umMiau(c, t0 + i * 0.34);
  }
}

export function setMudo(v: boolean): void {
  mudo = v;
  try {
    localStorage.setItem(CHAVE_MUDO, v ? '1' : '0');
  } catch {
    /* armazenamento indisponível — segue só em memória */
  }
}

export function estaMudo(): boolean {
  return mudo;
}
