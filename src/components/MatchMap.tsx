import { memo } from 'react';
import { HERO_MAP, heroIconUrl } from '../data/heroes';
import { LANES } from '../data/roles';
import { BUILDINGS, MAP_H, MAP_IMG, MAP_VIEW, MAP_W } from '../lib/mapgeo';
import type { ObjState, SimEvent, Unit } from '../lib/sim';
import type { Lane, Side } from '../types';

export const SIDE_COLOR: Record<Side, string> = { A: '#f59e0b', B: '#38bdf8' };
const LANE_KEYS = Object.keys(LANES) as Lane[];

export const FULL_OBJ: ObjState = {
  guardian: { amarelo: { A: true, B: true }, azul: { A: true, B: true }, verde: { A: true, B: true } },
  walker: { amarelo: { A: true, B: true }, azul: { A: true, B: true }, verde: { A: true, B: true } },
  shrine: { A: 2, B: 2 },
  patron: { A: 3, B: 3 },
  midboss: 'vivo',
};

const initials = (n: string) =>
  n.replace('The ', '').split(/[\s&]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/** Marca de prédio destruído sobre a imagem do mapa. */
function Wreck({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g style={{ transition: 'opacity .6s' }}>
      <circle cx={x} cy={y} r={r} fill="#080b0e" opacity="0.92" />
      <path d={`M${x - r * 0.5},${y - r * 0.5} L${x + r * 0.5},${y + r * 0.5} M${x + r * 0.5},${y - r * 0.5} L${x - r * 0.5},${y + r * 0.5}`} stroke="#ef4444" strokeWidth="2" opacity="0.8" />
    </g>
  );
}

/** Imagem real do mapa + marcas dos objetivos já destruídos. */
export function MapBackdrop({ obj }: { obj: ObjState }) {
  const wrecks: [number, number, number][] = [];
  for (const s of ['A', 'B'] as Side[]) {
    for (const l of LANE_KEYS) {
      if (!obj.walker[l][s]) wrecks.push([...BUILDINGS.walker[s][l], 17] as [number, number, number]);
      if (!obj.guardian[l][s]) wrecks.push([...BUILDINGS.guardian[s][l], 11] as [number, number, number]);
    }
    BUILDINGS.shrines[s].forEach((p, i) => {
      if (i >= obj.shrine[s]) wrecks.push([p[0], p[1], 10]);
    });
    if (obj.patron[s] <= 0) wrecks.push([...BUILDINGS.patron[s], 22] as [number, number, number]);
  }
  if (obj.midboss !== 'vivo') wrecks.push([...BUILDINGS.midboss, 10] as [number, number, number]);
  return (
    <>
      <image href={MAP_IMG} x="0" y="0" width={MAP_W} height={MAP_H} />
      {wrecks.map(([x, y, r], i) => (
        <Wreck key={i} x={x} y={y} r={r} />
      ))}
    </>
  );
}

interface Props {
  event: SimEvent;
  units: Unit[];
}

export const MatchMap = memo(function MatchMap({ event, units }: Props) {
  const deadSet = new Set(event.dead);
  const focus = new Set(event.focus);
  return (
    <svg viewBox={`${MAP_VIEW.x} ${MAP_VIEW.y} ${MAP_VIEW.w} ${MAP_VIEW.h}`} className="h-full w-full bg-[#0b0e12]" role="img" aria-label="Mapa da partida">
      <MapBackdrop obj={event.obj} />
      {units.map((u) => {
        const [x, y] = event.pos[u.id] ?? [290, 300];
        const dead = deadSet.has(u.id);
        const hero = HERO_MAP[u.heroId];
        return (
          <g
            key={u.id}
            style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 1.8s cubic-bezier(.4,.1,.2,1), opacity .5s', opacity: dead ? 0.3 : 1 }}
          >
            {focus.has(u.id) && <circle r="23" fill="none" stroke={SIDE_COLOR[u.side]} strokeWidth="2" className="ping-soft" />}
            <circle r="16" fill={hero?.color ?? '#444'} />
            {hero && !dead ? (
              <>
                <clipPath id={`cp-${u.id}`}><circle r="16" /></clipPath>
                <image href={heroIconUrl(hero)} x="-16" y="-16" width="32" height="32" clipPath={`url(#cp-${u.id})`} preserveAspectRatio="xMidYMid slice" />
              </>
            ) : (
              <text textAnchor="middle" dy=".35em" fontSize="10.5" fontWeight="700" fill="#fff" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {dead ? '✕' : initials(u.hero)}
              </text>
            )}
            <circle r="16" fill="none" stroke={SIDE_COLOR[u.side]} strokeWidth="3.2" />
            {focus.has(u.id) && (
              <text y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" stroke="#000" strokeWidth="2.5" paintOrder="stroke" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {u.player}
              </text>
            )}
            <title>{`${u.player} — ${u.hero}`}</title>
          </g>
        );
      })}
    </svg>
  );
});
