import { motion } from 'motion/react';
import { memo, useCallback, useState, type DragEvent } from 'react';
import { FORMATION_MAP, mapSlots } from '../data/formations';
import { HERO_MAP } from '../data/heroes';
import { LANES, ROLES } from '../data/roles';
import { laneXY, MAP_VIEW } from '../lib/mapgeo';
import { affinity, roleFit } from '../lib/rating';
import type { Player } from '../types';
import { DND_HERO, DND_PLAYER } from './Board';
import { HeroAvatar } from './HeroArt';
import { affinityColor } from './HeroStatsList';
import { FULL_OBJ, MapBackdrop } from './MatchMap';
import { PlayerCard } from './PlayerCard';

interface Props {
  formationId: string;
  lineup: (string | null)[];
  squad: Player[];
  heroBySlot?: (string | null)[];
  onDropPlayer: (slot: number, playerId: string) => void;
  onSwapHeroes?: (from: number, to: number) => void;
  onSelect?: (playerId: string) => void;
  selectedId?: string | null;
  /** comparação do reserva selecionado com o titular de cada slot (com o herói do slot) */
  compare?: (Compare | null)[];
  onSwapIn?: (slot: number) => void;
}

export interface Compare {
  delta: number; // ganho (+) ou perda (−) de rating no slot
  aff: number; // afinidade (%) do reserva com o herói do slot
  name: string;
}

const fitColor = (f: number) => (f >= 1 ? '#34d399' : f >= 0.97 ? '#facc15' : '#f87171');

/** Escalação sobre o mapa do Deadlock: cada carta fica na sua lane, na metade do seu time. */
export const MapBoard = memo(function MapBoard({
  formationId, lineup, squad, heroBySlot, onDropPlayer, onSwapHeroes, onSelect, selectedId, compare, onSwapIn,
}: Props) {
  const f = FORMATION_MAP[formationId]!;
  const coords = mapSlots(f);
  const [over, setOver] = useState<number | null>(null);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const bestSlot = compare ? compare.reduce((b, c, i) => (c && c.delta > 0.05 && (b < 0 || c.delta > (compare[b]?.delta ?? 0)) ? i : b), -1) : -1;

  const handleDrop = useCallback(
    (slot: number) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setOver(null);
      const pid = e.dataTransfer.getData(DND_PLAYER);
      if (pid) return onDropPlayer(slot, pid);
      const hs = e.dataTransfer.getData(DND_HERO);
      if (hs !== '' && onSwapHeroes) onSwapHeroes(Number(hs), slot);
    },
    [onDropPlayer, onSwapHeroes],
  );

  return (
    <div
      className="relative mx-auto w-full max-w-[540px] rounded-2xl border border-line shadow-[0_0_40px_-12px_rgba(245,158,11,.35)]"
      style={{ aspectRatio: `${MAP_VIEW.w} / ${MAP_VIEW.h}` }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <svg viewBox={`${MAP_VIEW.x} ${MAP_VIEW.y} ${MAP_VIEW.w} ${MAP_VIEW.h}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Mapa do Deadlock">
        <MapBackdrop obj={FULL_OBJ} />
        <defs>
          {(['amarelo', 'azul', 'verde'] as const).map((l) => (
            <marker key={l} id={`arrow-${l}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={LANES[l].color} />
            </marker>
          ))}
        </defs>
        {[...new Set(f.slots.map((s) => s.lane))].map((l) => {
          const pts = Array.from({ length: 9 }, (_, i) => laneXY(l, 0.34 + i * 0.045).map((v) => v.toFixed(1)).join(','));
          return (
            <polyline key={l} points={pts.join(' ')} fill="none" stroke={LANES[l].color} strokeWidth="2.4" strokeDasharray="7 6"
              strokeLinecap="round" opacity="0.75" markerEnd={`url(#arrow-${l})`} className="push-arrow" />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(5,8,10,.75) 100%)' }} />
      </div>
      <div className="absolute inset-x-0 top-2 text-center text-[10px] uppercase tracking-[0.4em] text-sky-300/50">Base inimiga</div>
      <div className="absolute inset-x-0 bottom-1.5 text-center text-[10px] uppercase tracking-[0.4em] text-amber-300/60">Sua base</div>

      {f.slots.map((slot, i) => {
        const pid = lineup[i] ?? null;
        const p = pid ? byId.get(pid) ?? null : null;
        const c = coords[i]!;
        const heroId = heroBySlot?.[i] ?? null;
        const role = ROLES[slot.role];
        const fit = p ? roleFit(p, slot.role) : 0;
        const cmp = compare?.[i] ?? null;
        const better = !!cmp && cmp.delta > 0.05;
        const worse = !!cmp && cmp.delta < -0.05;
        const origin = c.x < 30 ? 'origin-l' : c.x > 70 ? 'origin-r' : '';
        return (
          <div
            key={`${formationId}-${i}`}
            className={`map-slot ${origin} absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5`}
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(i);
            }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={handleDrop(i)}
          >
            <div className={`relative rounded-lg p-0.5 transition ${over === i ? 'scale-110 bg-amber-400/25 ring-2 ring-amber-300' : ''} ${better ? 'swap-better' : ''} ${worse ? 'swap-worse' : ''}`}>
              {p ? (
                <PlayerCard
                  player={p}
                  size="xs"
                  heroId={heroId}
                  draggable
                  statsOnHover
                  selected={selectedId === p.id}
                  onClick={onSelect ? () => onSelect(p.id) : undefined}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DND_PLAYER, p.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                />
              ) : null}
              {cmp && (better || worse) && (
                <motion.div
                  key={`${cmp.name}-${i}`}
                  className="swap-badge-wrap absolute -top-9 left-1/2 z-[70] -translate-x-1/2"
                  initial={{ opacity: 0, y: 10, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 16, delay: i * 0.05 }}
                >
                  <div
                    className={`swap-badge flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-extrabold shadow-lg ${better ? 'bg-emerald-400 text-black' : 'bg-red-500 text-white'}`}
                    title={`${cmp.name} com este herói: ${cmp.aff}% de afinidade`}
                  >
                    <span className={better ? 'swap-arrow-up' : ''}>{better ? '▲' : '▼'}</span>
                    {better ? '+' : '−'}{Math.abs(cmp.delta).toFixed(1)}
                    <span className="opacity-70">· {cmp.aff}%</span>
                  </div>
                  {better && onSwapIn && (
                    <button
                      type="button"
                      onClick={() => onSwapIn(i)}
                      className="mx-auto mt-0.5 block rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/60 hover:bg-emerald-400 hover:text-black"
                    >
                      {bestSlot === i ? '★ Melhor troca · ' : ''}Trocar
                    </button>
                  )}
                </motion.div>
              )}
              {!p && (
                <div
                  className="dashed-march flex items-center justify-center rounded-lg text-center text-[9px] uppercase tracking-wider"
                  style={{ width: 70, height: 105, color: role.color }}
                >
                  {role.label}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide text-black" style={{ background: role.color }}>
                {role.short}
              </span>
              {p && <span className="h-1.5 w-1.5 rounded-full" style={{ background: fitColor(fit) }} title={`Encaixe ${Math.round(fit * 100)}%`} />}
            </div>
            {heroBySlot && (
              <div
                draggable={!!heroId}
                onDragStart={(e) => {
                  e.dataTransfer.setData(DND_HERO, String(i));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                className="flex cursor-grab items-center gap-1 rounded bg-black/75 py-px pl-px pr-1.5 active:cursor-grabbing"
              >
                {heroId && <HeroAvatar heroId={heroId} size={16} />}
                <span className="text-[9px] font-semibold text-white/90">{heroId ? HERO_MAP[heroId]?.name : '—'}</span>
                {heroId && p && (
                  <span className="text-[9px] font-bold" style={{ color: affinityColor(Math.round(affinity(p, heroId) * 100)) }} title="Afinidade do jogador com o herói">
                    {Math.round(affinity(p, heroId) * 100)}%
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
