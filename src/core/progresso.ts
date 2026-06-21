import { useSyncExternalStore } from 'react';

// Progresso do jogador: estatísticas e conquistas, persistidas em localStorage.
// É a fonte única de "evolução" — alimentada por eventos dos vários módulos
// (puzzles resolvidos, partidas jogadas/analisadas, aberturas estudadas) e lida
// pelo painel de Conquistas.

export type Progresso = {
  puzzlesResolvidos: number;
  puzzleSequencia: number; // sequência atual sem errar
  puzzleRecorde: number; // melhor sequência
  puzzleRatingMax: number; // maior rating de puzzle do Lichess resolvido
  partidasJogadas: number;
  vitorias: number;
  partidasAnalisadas: number;
  melhorPrecisao: number; // melhor precisão (%) vista numa análise
  aberturasEstudadas: string[];
  aberturasTreinadas: string[];
  dias: string[]; // dias distintos de uso (YYYY-MM-DD)
};

const CHAVE = 'michuri_progresso';
const CHAVE_VELHA = 'michuri_puzzle_stats'; // migração das estatísticas antigas

const VAZIO: Progresso = {
  puzzlesResolvidos: 0,
  puzzleSequencia: 0,
  puzzleRecorde: 0,
  puzzleRatingMax: 0,
  partidasJogadas: 0,
  vitorias: 0,
  partidasAnalisadas: 0,
  melhorPrecisao: 0,
  aberturasEstudadas: [],
  aberturasTreinadas: [],
  dias: [],
};

function carregar(): Progresso {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) return { ...VAZIO, ...JSON.parse(raw) };
    const velho = localStorage.getItem(CHAVE_VELHA);
    if (velho) {
      const v = JSON.parse(velho);
      return {
        ...VAZIO,
        puzzlesResolvidos: v.resolvidos || 0,
        puzzleSequencia: v.sequencia || 0,
        puzzleRecorde: v.recorde || 0,
      };
    }
  } catch {
    /* storage indisponível */
  }
  return { ...VAZIO };
}

let atual: Progresso = carregar();
const inscritos = new Set<() => void>();

function persistir(): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    /* ignore */
  }
  inscritos.forEach((f) => f());
}

export function getProgresso(): Progresso {
  return atual;
}

function hoje(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function comDia(p: Progresso): Progresso {
  const h = hoje();
  return p.dias.includes(h) ? p : { ...p, dias: [...p.dias, h] };
}

export function registrarPuzzle(resolvido: boolean, limpo: boolean, rating?: number): void {
  const p = comDia(atual);
  if (resolvido) {
    p.puzzlesResolvidos += 1;
    if (limpo) {
      p.puzzleSequencia += 1;
      p.puzzleRecorde = Math.max(p.puzzleRecorde, p.puzzleSequencia);
    } else {
      p.puzzleSequencia = 0;
    }
    if (rating) p.puzzleRatingMax = Math.max(p.puzzleRatingMax, rating);
  } else {
    p.puzzleSequencia = 0;
  }
  atual = { ...p };
  persistir();
}

export function registrarPartida(venceu: boolean): void {
  const p = comDia(atual);
  atual = { ...p, partidasJogadas: p.partidasJogadas + 1, vitorias: p.vitorias + (venceu ? 1 : 0) };
  persistir();
}

export function registrarAnalise(precisao: number): void {
  const p = comDia(atual);
  atual = {
    ...p,
    partidasAnalisadas: p.partidasAnalisadas + 1,
    melhorPrecisao: Math.max(p.melhorPrecisao, precisao),
  };
  persistir();
}

export function registrarAbertura(nome: string, modo: 'estudo' | 'treino'): void {
  const p = comDia(atual);
  const campo = modo === 'estudo' ? 'aberturasEstudadas' : 'aberturasTreinadas';
  if (!p[campo].includes(nome)) {
    atual = { ...p, [campo]: [...p[campo], nome] };
  } else {
    atual = p;
  }
  persistir();
}

function inscrever(cb: () => void): () => void {
  inscritos.add(cb);
  return () => inscritos.delete(cb);
}

export function useProgresso(): Progresso {
  return useSyncExternalStore(inscrever, getProgresso, getProgresso);
}

// ---- XP / nível do treinador ----
export function xpDe(p: Progresso): number {
  return (
    p.puzzlesResolvidos * 10 +
    p.partidasJogadas * 8 +
    p.vitorias * 12 +
    p.partidasAnalisadas * 15 +
    p.aberturasEstudadas.length * 20 +
    p.aberturasTreinadas.length * 15
  );
}

export const NIVEIS = [
  { nome: 'Iniciante', min: 0 },
  { nome: 'Aprendiz', min: 120 },
  { nome: 'Praticante', min: 350 },
  { nome: 'Avançado', min: 800 },
  { nome: 'Veterano', min: 1600 },
  { nome: 'Mestre', min: 3200 },
];

export function nivelDe(xp: number): {
  nome: string;
  base: number;
  proxima: number | null;
  proximoNome: string | null;
} {
  let i = 0;
  for (let k = 0; k < NIVEIS.length; k++) if (xp >= NIVEIS[k].min) i = k;
  const prox = NIVEIS[i + 1];
  return {
    nome: NIVEIS[i].nome,
    base: NIVEIS[i].min,
    proxima: prox ? prox.min : null,
    proximoNome: prox ? prox.nome : null,
  };
}

// ---- Conquistas ----
export type Conquista = {
  id: string;
  emoji: string;
  titulo: string;
  desc: string;
  atual: (p: Progresso) => number;
  meta: number;
};

export const CONQUISTAS: Conquista[] = [
  { id: 'pz1', emoji: '🎯', titulo: 'Primeiro acerto', desc: 'Resolva seu 1º puzzle', atual: (p) => p.puzzlesResolvidos, meta: 1 },
  { id: 'pz10', emoji: '🧩', titulo: 'Tático', desc: 'Resolva 10 puzzles', atual: (p) => p.puzzlesResolvidos, meta: 10 },
  { id: 'pz50', emoji: '🏹', titulo: 'Caçador de táticas', desc: 'Resolva 50 puzzles', atual: (p) => p.puzzlesResolvidos, meta: 50 },
  { id: 'pz100', emoji: '🎖️', titulo: 'Mestre tático', desc: 'Resolva 100 puzzles', atual: (p) => p.puzzlesResolvidos, meta: 100 },
  { id: 'seq5', emoji: '🔥', titulo: 'Em chamas', desc: '5 puzzles seguidos sem errar', atual: (p) => p.puzzleRecorde, meta: 5 },
  { id: 'seq10', emoji: '⚡', titulo: 'Imparável', desc: '10 puzzles seguidos sem errar', atual: (p) => p.puzzleRecorde, meta: 10 },
  { id: 'rat1800', emoji: '💎', titulo: 'Sniper', desc: 'Resolva um puzzle de rating 1800+', atual: (p) => p.puzzleRatingMax, meta: 1800 },
  { id: 'win1', emoji: '🏆', titulo: 'Primeira vitória', desc: 'Vença o motor 1 vez', atual: (p) => p.vitorias, meta: 1 },
  { id: 'play10', emoji: '♟️', titulo: 'Veterano', desc: 'Jogue 10 partidas', atual: (p) => p.partidasJogadas, meta: 10 },
  { id: 'ana1', emoji: '🔍', titulo: 'Analista', desc: 'Analise 1 partida', atual: (p) => p.partidasAnalisadas, meta: 1 },
  { id: 'prec90', emoji: '✨', titulo: 'Precisão cirúrgica', desc: '90%+ de precisão numa análise', atual: (p) => Math.round(p.melhorPrecisao), meta: 90 },
  { id: 'est5', emoji: '📚', titulo: 'Estudioso', desc: 'Estude 5 aberturas', atual: (p) => p.aberturasEstudadas.length, meta: 5 },
  { id: 'est15', emoji: '🎓', titulo: 'Erudito', desc: 'Estude as 15 aberturas', atual: (p) => p.aberturasEstudadas.length, meta: 15 },
  { id: 'dias3', emoji: '📅', titulo: 'Dedicado', desc: 'Use o app em 3 dias diferentes', atual: (p) => p.dias.length, meta: 3 },
  { id: 'dias7', emoji: '🗓️', titulo: 'Assíduo', desc: 'Use o app em 7 dias diferentes', atual: (p) => p.dias.length, meta: 7 },
];
