import type { CSSProperties } from 'react';
import { Chess } from '../core/chess';
import { sanParaPtBr } from '../core/notation';
import type { LiveInfo } from '../core/engine';
import './EvalBar.css';

// Componentes/auxiliares compartilhados para exibir a avaliação do motor
// (usados na aba Análise e na aba Jogar). A avaliação é sempre em cp na
// perspectiva das BRANCAS; mate vira +M/−M.

export function formatAval(cpBrancas: number): string {
  if (Math.abs(cpBrancas) >= 20000) return cpBrancas > 0 ? '+M' : '−M';
  const v = cpBrancas / 100;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
}

export function sinalAval(cpBrancas: number): string {
  if (Math.abs(cpBrancas) >= 20000) return cpBrancas > 0 ? 'mate-pos' : 'mate-neg';
  if (cpBrancas > 30) return 'pos';
  if (cpBrancas < -30) return 'neg';
  return 'neutro';
}

/** Converte o score ao vivo (perspectiva da vez) para cp na ótica das brancas. */
export function liveCpBrancas(info: LiveInfo, brancasVez: boolean): number {
  const score =
    info.mate !== undefined
      ? info.mate > 0
        ? 100000 - info.mate * 100
        : -100000 - info.mate * 100
      : info.cp ?? 0;
  return brancasVez ? score : -score;
}

/** Converte os primeiros lances da variante (UCI) para uma linha em PT-BR. */
export function pvParaPtbr(fen: string, pv: string[], max: number): string {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const uci of pv.slice(0, max)) {
    if (uci.length < 4) break;
    try {
      const m = c.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4) : undefined,
      });
      if (!m) break;
      out.push(sanParaPtBr(m.san));
    } catch {
      break;
    }
  }
  return out.join(' ');
}

/** Rótulo externo (número grande + legenda) da avaliação. */
export function EvalExterno({ cpBrancas, sub }: { cpBrancas: number; sub: string }) {
  return (
    <div className="eval-ext">
      <span className={'eval-num ' + sinalAval(cpBrancas)}>{formatAval(cpBrancas)}</span>
      <span className="eval-leg">{sub}</span>
    </div>
  );
}

/** Barra vertical de avaliação (parte branca proporcional à vantagem). */
export function EvalBarra({
  cpBrancas,
  orient,
}: {
  cpBrancas: number;
  orient: 'white' | 'black';
}) {
  const win = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cpBrancas)) - 1);
  const pct = Math.max(2, Math.min(98, win));
  const estilo: CSSProperties =
    orient === 'white' ? { height: `${pct}%`, bottom: 0 } : { height: `${pct}%`, top: 0 };
  return (
    <div className="evalbar" title={`Avaliação: ${formatAval(cpBrancas)}`}>
      <div className="evalbar-fill" style={estilo} />
    </div>
  );
}
