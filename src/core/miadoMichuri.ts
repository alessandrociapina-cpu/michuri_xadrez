import { estaMudo } from './meow';

// Toca um dos miados REAIS do Michuri (gravações), escolhido ao acaso. Usado na
// splash. Respeita o silenciar dos miados (mesmo controle dos miados de lance).

const ARQUIVOS = ['sounds/miau1.wav', 'sounds/miau2.wav', 'sounds/miau3.wav'];

let audios: HTMLAudioElement[] | null = null;

function preparar(): HTMLAudioElement[] {
  if (audios) return audios;
  const base = import.meta.env.BASE_URL;
  audios = ARQUIVOS.map((a) => {
    const el = new Audio(base + a);
    el.preload = 'auto';
    return el;
  });
  return audios;
}

/** Pré-carrega os áudios (ex.: ao montar a splash) para tocar sem atraso. */
export function prepararMiados(): void {
  if (typeof window !== 'undefined') preparar();
}

/** Toca um miado real aleatório. Silencioso se os miados estiverem mudos. */
export function tocarMiadoMichuri(): void {
  if (typeof window === 'undefined' || estaMudo()) return;
  const lista = preparar();
  const el = lista[Math.floor(Math.random() * lista.length)];
  try {
    el.currentTime = 0;
    void el.play().catch(() => {
      /* navegador bloqueou autoplay sem gesto — ignora */
    });
  } catch {
    /* ignore */
  }
}
