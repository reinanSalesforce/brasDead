import { memo, useCallback, useState, type DragEvent } from 'react';
import { FORMATION_MAP, layoutSlots } from '../data/formations';
import { HERO_MAP } from '../data/heroes';
import { LANES, ROLES } from '../data/roles';
import { affinity, roleFit } from '../lib/rating';
import type { Lane, Player } from '../types';
import { HeroAvatar } from './HeroArt';
import { affinityColor } from './HeroStatsList';
import { PlayerCard } from './PlayerCard';

export const DND_PLAYER = 'application/x-bd-player';
export const DND_HERO = 'application/x-bd-hero-slot';

interface Props {
  formationId: string;
  lineup: (string | null)[];
  squad: Player[];
  heroBySlot?: (string | null)[];
  onDropPlayer: (slot: number, playerId: string) => void;
  onSwapHeroes?: (from: number, to: number) => void;
  onSelect?: (playerId: string) => void;
  selectedId?: string | null;
}

const fitColor = (f: number) => (f >= 1 ? '#34d399' : f >= 0.97 ? '#facc15' : '#f87171');

export const Board = memo(function Board({
  formationId, lineup, squad, heroBySlot, onDropPlayer, onSwapHeroes, onSelect, selectedId,
}: Props) {
  const f = FORMATION_MAP[formationId]!;
  const coords = layoutSlots(f);
  const [over, setOver] = useState<number | null>(null);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const counts = f.slots.reduce<Record<string, number>>((a, s) => ((a[s.lane] = (a[s.lane] ?? 0) + 1), a), {});

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
      className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-fuchsia-300/10"
      style={{
        aspectRatio: '1 / 1.08',
        background:
          'radial-gradient(120% 80% at 50% 0%, #3b1a63 0%, #230f3d 55%, #140a24 100%)',
      }}
    >
      {/* faixas das lanes */}
      {(Object.keys(LANES) as Lane[]).map((l, i) => (
        <div
          key={l}
          className="absolute top-0 h-full"
          style={{
            left: `${i * 33.33}%`, width: '33.33%',
            background: `linear-gradient(180deg, ${LANES[l].color}14, transparent 70%)`,
            borderRight: i < 2 ? '1px dashed #ffffff18' : undefined,
          }}
        >
          <div
            className="absolute inset-x-0 top-2 text-center font-display text-xs font-bold uppercase tracking-[0.3em]"
            style={{ color: LANES[l].color }}
          >
            Lane {LANES[l].label}
          </div>
        </div>
      ))}
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      <div className="absolute inset-x-0 bottom-2 text-center text-[10px] uppercase tracking-[0.4em] text-white/30">
        Base — Mão Âmbar
      </div>

      {f.slots.map((slot, i) => {
        const pid = lineup[i] ?? null;
        const p = pid ? byId.get(pid) ?? null : null;
        const c = coords[i]!;
        const heroId = heroBySlot?.[i] ?? null;
        const fit = p ? roleFit(p, slot.role) : 0;
        const size = (counts[slot.lane] ?? 1) >= 3 ? 'sm' : 'md';
        const role = ROLES[slot.role];
        return (
          <div
            key={`${formationId}-${i}`}
            className="map-slot absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(i);
            }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={handleDrop(i)}
          >
            <div
              className={`rounded-xl p-1 transition ${over === i ? 'scale-105 bg-amber-400/20 ring-2 ring-amber-300' : ''}`}
            >
              {p ? (
                <div className="relative">
                  <PlayerCard
                    player={p}
                    size={size}
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
                </div>
              ) : (
                <div
                  className="dashed-march flex items-center justify-center rounded-xl text-center text-[10px] uppercase tracking-widest"
                  style={{ width: size === 'sm' ? 96 : 150, height: size === 'sm' ? 144 : 225, color: role.color }}
                >
                  Arraste
                  <br />
                  {role.label}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black"
                style={{ background: role.color }}
              >
                {role.label}
              </span>
              {p && (
                <span className="h-2 w-2 rounded-full" style={{ background: fitColor(fit) }} title={`Encaixe ${Math.round(fit * 100)}%`} />
              )}
            </div>
            {heroBySlot && (
              <div
                draggable={!!heroId}
                onDragStart={(e) => {
                  e.dataTransfer.setData(DND_HERO, String(i));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                className="flex cursor-grab items-center gap-1.5 rounded-md border border-white/10 bg-black/60 py-0.5 pl-0.5 pr-2 active:cursor-grabbing"
              >
                {heroId ? <HeroAvatar heroId={heroId} size={22} /> : null}
                <span className="text-[10px] font-semibold text-white/85">
                  {heroId ? HERO_MAP[heroId]?.name : '—'}
                </span>
                {heroId && p && (
                  <span className="text-[10px] font-bold" style={{ color: affinityColor(Math.round(affinity(p, heroId) * 100)) }}>
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
