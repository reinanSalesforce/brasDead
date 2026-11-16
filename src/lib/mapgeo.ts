import type { Lane, Side } from '../types';

/** Coordenadas na imagem real do mapa (public/deadlock-map.png, 584×580). */
export const MAP_W = 584;
export const MAP_H = 580;
/** Recorte útil da imagem (sem a margem escura). */
export const MAP_VIEW = { x: 42, y: 40, w: 460, h: 530 };
export const MAP_IMG = `${import.meta.env.BASE_URL}deadlock-map.png`;

type Anchor = [t: number, x: number, y: number];

/**
 * Cada lane é uma curva ancorada nos prédios reais da imagem.
 * t=0 base do lado A (embaixo) … t=0.15 Walker de A, 0.3 Guardião de A,
 * 0.7 Guardião de B, 0.85 Walker de B … t=1 base do lado B (em cima).
 */
const ANCHORS: Record<Lane, Anchor[]> = {
  amarelo: [
    [0, 238, 565], [0.06, 233, 505], [0.15, 126, 420], [0.3, 81, 351], [0.5, 96, 305],
    [0.7, 108, 259], [0.85, 146, 186], [0.93, 232, 152], [0.97, 300, 118], [1, 306, 70],
  ],
  azul: [
    [0, 246, 565], [0.06, 246, 497], [0.15, 245, 388], [0.3, 276, 349], [0.5, 277, 306],
    [0.7, 276, 264], [0.85, 306, 224], [0.96, 306, 115], [1, 307, 70],
  ],
  verde: [
    [0, 255, 565], [0.06, 262, 510], [0.15, 409, 427], [0.3, 443, 354], [0.5, 462, 308],
    [0.7, 469, 262], [0.85, 429, 192], [0.93, 352, 150], [0.97, 312, 118], [1, 307, 70],
  ],
};

function catmull(p0: number, p1: number, p2: number, p3: number, u: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}

/** t=0 base do lado A (embaixo), t=1 base do lado B (em cima). */
export function laneXY(lane: Lane, t: number): [number, number] {
  const a = ANCHORS[lane];
  const tt = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < a.length - 2 && tt > (a[i + 1] as Anchor)[0]) i++;
  const p0 = a[Math.max(0, i - 1)] as Anchor;
  const p1 = a[i] as Anchor;
  const p2 = a[i + 1] as Anchor;
  const p3 = a[Math.min(a.length - 1, i + 2)] as Anchor;
  const u = (tt - p1[0]) / (p2[0] - p1[0]);
  return [catmull(p0[1], p1[1], p2[1], p3[1], u), catmull(p0[2], p1[2], p2[2], p3[2], u)];
}

export const baseXY = (side: Side, i = 0): [number, number] =>
  side === 'A' ? [245 + (i - 2.5) * 13, 545] : [306 + (i - 2.5) * 13, 66];

export const GUARDIAN_T = { A: 0.3, B: 0.7 } as const;
export const WALKER_T = { A: 0.15, B: 0.85 } as const;

/** Posição dos prédios na imagem (para marcar o que já caiu). */
export const BUILDINGS = {
  walker: {
    A: { amarelo: [126, 420], azul: [245, 388], verde: [409, 427] },
    B: { amarelo: [146, 186], azul: [306, 224], verde: [429, 192] },
  },
  guardian: {
    A: { amarelo: [81, 351], azul: [276, 349], verde: [443, 354] },
    B: { amarelo: [108, 259], azul: [276, 264], verde: [469, 262] },
  },
  shrines: { A: [[207, 487], [283, 487]], B: [[270, 127], [343, 127]] },
  patron: { A: [245, 497], B: [306, 115] },
  midboss: [276, 307],
} as const;
