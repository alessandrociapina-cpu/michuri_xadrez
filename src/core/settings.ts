import { useSyncExternalStore } from 'react';
import type { Nivel } from './engine';

// Preferências do app, persistidas em localStorage e compartilhadas por todas as
// telas via useSettings(). Inclui aparência (tabuleiro/peças), som e as opções de
// jogo (nível e lado) — antes espalhadas no painel da aba Jogar, agora num único
// lugar (modal de Configurações), reduzindo a rolagem no celular.

export type Tema = 'ambar' | 'verde' | 'azul' | 'marmore' | 'madeira';
export type Material = 'padrao' | 'madeira' | 'pedra' | 'metal';
export type Lado = 'white' | 'black';

export type Settings = {
  tema: Tema;
  material: Material;
  somMover: boolean;
  nivel: Nivel;
  lado: Lado;
};

/** Paletas de cores das casas (claras/escuras) do tabuleiro. */
export const PALETAS: Record<Tema, { light: string; dark: string; nome: string }> = {
  ambar: { light: '#e7d8b6', dark: '#7c6244', nome: 'Âmbar (clássico)' },
  verde: { light: '#eeeed2', dark: '#769656', nome: 'Verde torneio' },
  azul: { light: '#dde7ee', dark: '#7a98b3', nome: 'Azul' },
  marmore: { light: '#e9e7e2', dark: '#9b988f', nome: 'Mármore' },
  madeira: { light: '#d9b380', dark: '#7a4a23', nome: 'Madeira' },
};

export const ROTULO_MATERIAL: Record<Material, string> = {
  padrao: 'Padrão',
  madeira: 'Madeira',
  pedra: 'Pedra',
  metal: 'Metal',
};

const CHAVE = 'michuri_cfg';

const PADRAO: Settings = {
  tema: 'ambar',
  material: 'padrao',
  somMover: true,
  nivel: 'intermediario',
  lado: 'white',
};

function carregar(): Settings {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || '{}');
    return { ...PADRAO, ...bruto };
  } catch {
    return PADRAO;
  }
}

let atual: Settings = carregar();
const inscritos = new Set<() => void>();

export function getSettings(): Settings {
  return atual;
}

export function setSettings(parcial: Partial<Settings>): void {
  atual = { ...atual, ...parcial };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    /* storage indisponível — segue só em memória */
  }
  inscritos.forEach((f) => f());
}

function inscrever(cb: () => void): () => void {
  inscritos.add(cb);
  return () => inscritos.delete(cb);
}

/** Hook reativo: re-renderiza o componente quando qualquer preferência muda. */
export function useSettings(): Settings {
  return useSyncExternalStore(inscrever, getSettings, getSettings);
}
