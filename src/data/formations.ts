import { laneXY, MAP_VIEW } from '../lib/mapgeo';
import type { Formation, Lane } from '../types';

export const FORMATIONS: Formation[] = [
  {
    id: '2-2-2',
    name: '2-2-2 Clássica',
    desc: 'Duas duplas, uma em cada lane. Equilíbrio entre farm e rotação.',
    slots: [
      { role: 'tanque', lane: 'amarelo' },
      { role: 'spirit', lane: 'amarelo' },
      { role: 'carry', lane: 'azul' },
      { role: 'suporte', lane: 'azul' },
      { role: 'anticarry', lane: 'verde' },
      { role: 'iniciador', lane: 'verde' },
    ],
  },
  {
    id: '3-2-1',
    name: '3-2-1 Pressão Central',
    desc: 'Três na lane azul para forçar a queda do Guardião e abrir o Boss do meio.',
    slots: [
      { role: 'carry', lane: 'azul' },
      { role: 'anticarry', lane: 'azul' },
      { role: 'suporte', lane: 'azul' },
      { role: 'tanque', lane: 'amarelo' },
      { role: 'controle', lane: 'amarelo' },
      { role: 'spirit', lane: 'verde' },
    ],
  },
  {
    id: '1-2-3',
    name: '1-2-3 Flanco Verde',
    desc: 'Foco total na lane verde, com solo na amarela.',
    slots: [
      { role: 'iniciador', lane: 'amarelo' },
      { role: 'carry', lane: 'azul' },
      { role: 'suporte', lane: 'azul' },
      { role: 'tanque', lane: 'verde' },
      { role: 'anticarry', lane: 'verde' },
      { role: 'spirit', lane: 'verde' },
    ],
  },
];

export const FORMATION_MAP = Object.fromEntries(
  FORMATIONS.map((f) => [f.id, f]),
) as Record<string, Formation>;

const LANE_X: Record<Lane, number> = { amarelo: 17, azul: 50, verde: 83 };

/** Coordenadas (%) de cada slot no campo — linha de frente em cima, base embaixo. */
export function layoutSlots(f: Formation): { x: number; y: number }[] {
  const counts: Record<string, number> = {};
  f.slots.forEach((s) => (counts[s.lane] = (counts[s.lane] ?? 0) + 1));
  const seen: Record<string, number> = {};
  return f.slots.map((s) => {
    const n = counts[s.lane] ?? 1;
    const i = seen[s.lane] ?? 0;
    seen[s.lane] = i + 1;
    const y = n === 1 ? 50 : 18 + (i * 64) / (n - 1);
    return { x: LANE_X[s.lane], y };
  });
}

/** x da lane na altura y (metade do time do jogador, onde y decresce com t). */
function laneXAtY(lane: Lane, y: number): number {
  let best = 0.3;
  let bd = Infinity;
  for (let t = 0.05; t <= 0.7; t += 0.005) {
    const d = Math.abs(laneXY(lane, t)[1] - y);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return laneXY(lane, best)[0];
}

const SLOT_Y: Record<number, number[]> = { 1: [365], 2: [300, 412], 3: [275, 355, 435] };

/** Posições (%) dos slots sobre o mapa do Deadlock, na metade do time do jogador (base embaixo). */
export function mapSlots(f: Formation): { x: number; y: number }[] {
  const counts: Record<string, number> = {};
  f.slots.forEach((s) => (counts[s.lane] = (counts[s.lane] ?? 0) + 1));
  const seen: Record<string, number> = {};
  return f.slots.map((s) => {
    const n = Math.min(counts[s.lane] ?? 1, 3);
    const i = seen[s.lane] ?? 0;
    seen[s.lane] = i + 1;
    const y = (SLOT_Y[n] ?? [365])[i] ?? 365;
    const inner = s.lane === 'amarelo' ? 1 : s.lane === 'verde' ? -1 : 0;
    const dx =
      n === 3
        ? s.lane === 'azul'
          ? (i % 2 ? 32 : -32)
          : inner * (i === 1 ? 6 : 30)
        : s.lane === 'azul'
          ? 0
          : inner * 10;
    const x = laneXAtY(s.lane, y) + dx;
    return { x: ((x - MAP_VIEW.x) / MAP_VIEW.w) * 100, y: ((y - MAP_VIEW.y) / MAP_VIEW.h) * 100 };
  });
}
