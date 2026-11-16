import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { memo, useCallback, useMemo, useRef, type CSSProperties, type DragEventHandler, type PointerEvent } from 'react';
import { ovr } from '../data/players';
import { HERO_MAP } from '../data/heroes';
import { ROLES } from '../data/roles';
import { affinity } from '../lib/rating';
import { hashSeed, mulberry32 } from '../lib/rng';
import type { Player } from '../types';
import { BrFlag } from './Flag';
import { HeroArt } from './HeroArt';
import { useSpotlight } from './spotlightContext';

export type CardSize = 'xl' | 'lg' | 'md' | 'sm' | 'xs';
export const CARD_WIDTH: Record<CardSize, number> = { xl: 300, lg: 220, md: 150, sm: 96, xs: 70 };

interface Tier {
  level: number;
  name: string;
  frame: string;
  glow: string;
  accent: string;
  glowPx: number;
}
export function tierOf(o: number): Tier {
  if (o >= 87) return { level: 4, name: 'Lenda', frame: 'linear-gradient(160deg,#ff7a1a,#b3261e 55%,#ff9a3c)', glow: '#ff5a1acc', accent: '#ffb27a', glowPx: 9 };
  if (o >= 83) return { level: 3, name: 'Ouro', frame: 'linear-gradient(160deg,#ffb347,#c2570c 55%,#ffcf7a)', glow: '#f59e0baa', accent: '#ffd98a', glowPx: 7 };
  if (o >= 78) return { level: 2, name: 'Prata', frame: 'linear-gradient(160deg,#c4b5fd,#6d4bd1 55%,#d9ccff)', glow: '#8b5cf688', accent: '#d9ccff', glowPx: 5 };
  return { level: 1, name: 'Bronze', frame: 'linear-gradient(160deg,#5eead4,#0f766e 55%,#99f6e4)', glow: '#14b8a666', accent: '#99f6e4', glowPx: 3 };
}

interface Spec {
  type: 'rise' | 'twinkle' | 'streak';
  x: number; y: number; s: number; d: number; dl: number; dx: number; po: number;
}
/** Partículas determinísticas por jogador (só nos elos mais altos). */
function particleSpecs(id: string, level: number): Spec[] {
  if (level < 3) return [];
  const r = mulberry32(hashSeed(`pt-${id}`));
  const n = level >= 4 ? { rise: 9, tw: 4, st: 2 } : { rise: 5, tw: 3, st: 0 };
  const out: Spec[] = [];
  for (let i = 0; i < n.rise; i++) out.push({ type: 'rise', x: 6 + r() * 88, y: 100, s: 2 + r() * 3, d: 3.5 + r() * 3.5, dl: r() * 5, dx: (r() - 0.5) * 40, po: 0.6 + r() * 0.4 });
  for (let i = 0; i < n.tw; i++) out.push({ type: 'twinkle', x: 8 + r() * 84, y: 6 + r() * 70, s: 6 + r() * 6, d: 2 + r() * 2, dl: r() * 4, dx: 0, po: 1 });
  for (let i = 0; i < n.st; i++) out.push({ type: 'streak', x: 10 + r() * 50, y: 8 + r() * 40, s: 0, d: 5 + r() * 3, dl: r() * 6, dx: 0, po: 1 });
  return out;
}

interface Props {
  player: Player;
  size?: CardSize;
  heroId?: string | null; // arte do herói em uso (senão, o principal do pool)
  teamLabel?: string;
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onClick?: () => void;
  /** mostra o overlay "Visualizar carta" no hover e abre o destaque (spotlight) */
  openable?: boolean;
  /** estilo EA FC: sem estatísticas na frente; ao passar o mouse a carta cresce e mostra atributos, país e herói */
  statsOnHover?: boolean;
  selected?: boolean;
  className?: string;
}

const STATS: [keyof Player['attrs'], string][] = [
  ['mir', 'MIR'], ['mov', 'MOV'], ['mac', 'MAC'], ['pol', 'POL'], ['sup', 'SUP'], ['con', 'CON'],
];

export const PlayerCard = memo(function PlayerCard({
  player, size = 'lg', heroId, teamLabel = 'DEADLOCK CARDS', draggable, onDragStart, onClick, openable, statsOnHover, selected, className = '',
}: Props) {
  const shell = useRef<HTMLDivElement>(null);
  const { open } = useSpotlight();
  const w = CARD_WIDTH[size];
  const o = ovr(player);
  const tier = tierOf(o);
  const role = player.role === 'flex' ? null : ROLES[player.role];
  const art = heroId ?? player.pool[0] ?? 'haze';
  const small = false; // cartas pequenas mantêm o mesmo design completo (escalado em em)
  const particles = useMemo(() => particleSpecs(player.id, tier.level), [player.id, tier.level]);

  // tilt 3D com mola (spring) — acompanha o ponteiro
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(useTransform(ry, [-0.5, 0.5], [9, -9]), { stiffness: 220, damping: 18 });
  const rotateY = useSpring(useTransform(rx, [-0.5, 0.5], [-11, 11]), { stiffness: 220, damping: 18 });

  const onMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'mouse') return;
      const r = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      rx.set(px - 0.5);
      ry.set(py - 0.5);
      shell.current?.style.setProperty('--mx', `${px * 100}%`);
      shell.current?.style.setProperty('--my', `${py * 100}%`);
    },
    [rx, ry],
  );
  const onLeave = useCallback(() => {
    rx.set(0);
    ry.set(0);
  }, [rx, ry]);

  const openCard = useCallback(() => open(player), [open, player]);
  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick();
    },
    [onClick],
  );

  return (
    <div className={`card-wrap ${className}`} draggable={draggable} onDragStart={onDragStart}>
      <motion.div
        className="card-tilt"
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <div
          ref={shell}
          role={onClick ? 'button' : undefined}
          tabIndex={onClick ? 0 : undefined}
          aria-label={`${player.name}, overall ${o}`}
          onClick={onClick}
          onKeyDown={onKey}
          className={`card-shell cursor-pointer select-none ${statsOnHover ? 'card-stats-hover' : ''}`}
          style={{ width: w, height: w * 1.5, fontSize: (w / 220) * 16, ['--glow' as string]: tier.glow, ['--gr' as string]: `${tier.glowPx}px` } as CSSProperties}
        >
          <div className="card-clip absolute inset-0" style={{ background: tier.frame }} />
          <div className="card-clip absolute overflow-hidden bg-[#0a1013]" style={{ inset: selected ? '0.3em' : '0.16em' }}>
            <HeroArt heroId={art} className="card-art absolute inset-0" mono={!small} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/90" />
            <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black via-black/80 to-transparent" />

            {tier.level >= 3 && (
              <svg className={`card-ring ${tier.level >= 4 ? 'card-ring-pulse' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <rect x="1.2" y="1.2" width="97.6" height="97.6" rx="4" fill="none" stroke={tier.accent} strokeWidth="0.8" opacity="0.7" vectorEffect="non-scaling-stroke" />
              </svg>
            )}
            {tier.level >= 3 && !small && <div className="card-glint" />}
            {particles.length > 0 && (
              <div className="card-particles" aria-hidden>
                {particles.map((sp, i) => (
                  <span
                    key={i}
                    className={sp.type === 'rise' ? 'pt-rise' : sp.type === 'twinkle' ? 'pt-tw' : 'pt-streak'}
                    style={{ ['--x' as string]: `${sp.x}%`, ['--y' as string]: `${sp.y}%`, ['--s' as string]: `${sp.s}px`, ['--d' as string]: `${sp.d}s`, ['--dl' as string]: `${sp.dl}s`, ['--dx' as string]: `${sp.dx}px`, ['--po' as string]: sp.po, ['--pc' as string]: tier.accent } as CSSProperties}
                  />
                ))}
              </div>
            )}

            <div className="absolute left-[0.8em] top-[0.5em] z-10">
              <div data-ovr className="font-display text-[3.4em] font-bold leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,.7)]">
                {o}
              </div>
              {!small && (
                <div className="mt-[0.3em] inline-block rounded-[0.2em] border border-white/25 bg-black/65 px-[0.5em] py-[0.15em] text-[0.55em] font-extrabold uppercase tracking-widest text-white/90">
                  {role ? role.label : 'Flex'}
                </div>
              )}
              <BrFlag className="mt-[0.5em] block h-[1.7em] w-[2.4em] rounded-[0.3em] shadow" />
            </div>

            {player.trend > 0 && !small && (
              <div className="absolute left-[5.4em] top-[1.2em] z-10 rounded-[0.25em] border border-emerald-400/40 bg-emerald-950/80 px-[0.5em] py-[0.1em] text-[0.6em] font-bold text-emerald-300">
                ↑ +{player.trend}
              </div>
            )}

            <div className="absolute inset-x-0 bottom-[1.6em] z-10 px-[0.8em]">
              <div className="truncate text-center font-display text-[1.45em] font-bold uppercase tracking-[0.12em] text-white drop-shadow">
                {player.name}
              </div>
              {!small && !statsOnHover && (
                <>
                  <div className="mx-auto my-[0.5em] h-px w-[85%] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                  <div className="grid grid-cols-2 gap-x-[1.4em] gap-y-[0.2em] px-[0.5em] font-display text-[0.95em] font-semibold [text-shadow:0_1px_2px_#000,0_2px_8px_rgba(0,0,0,.95)]">
                    {STATS.map(([k, label]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-[0.8em] tracking-wide text-white/75">{label}</span>
                        <span className="text-white">{player.attrs[k]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-[0.8em] text-center text-[0.5em] font-bold uppercase tracking-[0.25em] text-white/70">
                    {teamLabel}
                  </div>
                </>
              )}
            </div>
            <div className="card-shine" />
            {statsOnHover && (
              <div className="card-statview" aria-hidden>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-[2.2em] font-bold leading-none text-white">{o}</div>
                    <div className="text-[0.55em] font-extrabold uppercase tracking-widest" style={{ color: role?.color ?? '#facc15' }}>{role ? role.label : 'Flex'}</div>
                  </div>
                  <div className="text-right text-[0.5em] leading-tight text-white/70">
                    <div className="flex items-center justify-end gap-[0.4em]"><BrFlag className="h-[1.3em] w-[1.9em] rounded-[0.2em]" /><b className="text-white">BRA</b></div>
                    <div>{player.age} anos</div>
                    <div className="uppercase tracking-wider text-white/50">{tier.name}</div>
                  </div>
                </div>
                <div className="mt-[0.5em] space-y-[0.35em]">
                  {STATS.map(([k, label]) => (
                    <div key={k} className="flex items-center gap-[0.5em] text-[0.72em] font-bold">
                      <span className="w-[2.6em] text-white/60">{label}</span>
                      <span className="h-[0.5em] flex-1 overflow-hidden rounded bg-white/10">
                        <span className="block h-full rounded" style={{ width: `${player.attrs[k]}%`, background: tier.accent }} />
                      </span>
                      <span className="w-[1.8em] text-right text-white">{player.attrs[k]}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-[0.6em] border-t border-white/15 pt-[0.4em] text-[0.6em] leading-tight">
                  {heroId && HERO_MAP[heroId] ? (
                    <div className="flex justify-between"><span className="text-white/60">Com {HERO_MAP[heroId]!.name}</span><b style={{ color: affinity(player, heroId) >= 0.7 ? '#34d399' : affinity(player, heroId) >= 0.4 ? '#facc15' : '#f87171' }}>{Math.round(affinity(player, heroId) * 100)}%</b></div>
                  ) : null}
                  <div className="mt-[0.2em] truncate text-white/50">Pool: {player.pool.map((id) => HERO_MAP[id]?.name).filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            )}

            {openable && (
              <button type="button" className="card-hover-overlay" onClick={openCard} aria-label={`Visualizar carta de ${player.name}`}>
                <span className="card-hover-cta">Visualizar carta</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
});
