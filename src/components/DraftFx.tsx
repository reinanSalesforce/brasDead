import { AnimatePresence, motion } from 'motion/react';
import { memo, useMemo, useState } from 'react';
import { HERO_MAP, heroImageUrl, heroPortraitUrl } from '../data/heroes';
import { ROLES } from '../data/roles';
import type { DraftStep } from '../lib/draft';
import { mulberry32 } from '../lib/rng';
import type { Hero, Team } from '../types';
import { TeamCrest } from './TeamCrest';
import { HeroAvatar } from './HeroArt';

export const USER_COLOR = '#f59e0b';
export const OPP_COLOR = '#38bdf8';

/** Fundo vivo: aurora que muda de cor com o time da vez + grade + faíscas subindo. */
export const DraftBackdrop = memo(function DraftBackdrop({ color }: { color: string }) {
  const sparks = useMemo(() => {
    const r = mulberry32(77);
    return Array.from({ length: 22 }, () => ({ x: r() * 100, s: 2 + r() * 3, d: 7 + r() * 8, dl: r() * 8 }));
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="draft-aurora absolute -inset-[20%] transition-[background] duration-1000" style={{ background: `radial-gradient(40% 35% at 20% 15%, ${color}2e, transparent 70%), radial-gradient(35% 40% at 85% 85%, ${color}22, transparent 70%)` }} />
      <div className="draft-grid absolute inset-0" />
      {sparks.map((p, i) => (
        <span key={i} className="draft-spark" style={{ left: `${p.x}%`, width: p.s, height: p.s, animationDuration: `${p.d}s`, animationDelay: `${p.dl}s`, background: color }} />
      ))}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 100% at 50% 40%, transparent 50%, rgba(0,0,0,.65) 100%)' }} />
    </div>
  );
});

/** Abertura: brasões dos dois times entrando pelos lados, raio no meio e VS. */
export function IntroSplash({ user, opp, round, show }: { user: Team; opp: Team; round: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 overflow-hidden bg-black/90 backdrop-blur-sm"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08, transition: { duration: 0.55 } }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(40% 60% at 22% 50%, ${user.color}40, transparent 70%), radial-gradient(40% 60% at 78% 50%, ${opp.color}40, transparent 70%)` }} />
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative text-[11px] uppercase tracking-[0.6em] text-white/55">
            Rodada {round} · Draft
          </motion.div>
          <div className="relative flex items-center gap-6 sm:gap-12">
            <motion.div initial={{ x: -320, opacity: 0, rotate: -12 }} animate={{ x: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 110, damping: 14 }} className="flex flex-col items-center gap-2">
              <div style={{ filter: `drop-shadow(0 0 28px ${user.color}aa)` }}><TeamCrest id={user.id} tag={user.tag} color={user.color} size={132} /></div>
              <div className="font-display text-2xl font-bold uppercase tracking-wider" style={{ color: user.color }}>{user.name}</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Mão Âmbar</div>
            </motion.div>

            <div className="relative flex flex-col items-center">
              <motion.div className="absolute -inset-10" initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: [0, 1, 0], scale: [0.2, 1.4, 1.8] }} transition={{ delay: 0.45, duration: 0.7 }} style={{ background: 'radial-gradient(circle, #fff, transparent 60%)' }} />
              <motion.div initial={{ scale: 3.5, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.4, type: 'spring', stiffness: 220, damping: 12 }} className="relative font-display text-7xl font-bold text-white" style={{ textShadow: '0 0 30px rgba(255,255,255,.55)' }}>
                VS
              </motion.div>
            </div>

            <motion.div initial={{ x: 320, opacity: 0, rotate: 12 }} animate={{ x: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 110, damping: 14 }} className="flex flex-col items-center gap-2">
              <div style={{ filter: `drop-shadow(0 0 28px ${opp.color}aa)` }}><TeamCrest id={opp.id} tag={opp.tag} color={opp.color} size={132} /></div>
              <div className="font-display text-2xl font-bold uppercase tracking-wider" style={{ color: opp.color }}>{opp.name}</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Chama Safira</div>
            </motion.div>
          </div>
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }} className="h-px w-80 origin-center bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Faixa que cruza a tela ao mudar de fase (banimento → escolha). */
export function PhaseBanner({ label, id }: { label: string | null; id: number }) {
  return (
    <AnimatePresence>
      {label && (
        <motion.div
          key={id}
          className="pointer-events-none absolute inset-x-0 top-1/3 z-30 flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          <motion.div
            className="w-full bg-gradient-to-r from-transparent via-black/80 to-transparent py-5 text-center"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          >
            <div className="font-display text-5xl font-bold uppercase tracking-[0.5em] text-white" style={{ textShadow: '0 0 30px rgba(255,255,255,.4)' }}>{label}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Cronômetro circular com anel de progresso. */
export const TimerRing = memo(function TimerRing({ left, total, active, color }: { left: number; total: number; active: boolean; color: string }) {
  const R = 38;
  const C = 2 * Math.PI * R;
  const pct = active ? Math.max(0, left) / total : 0;
  const urgent = active && left <= 5;
  const c = urgent ? '#ff4d6d' : color;
  return (
    <div className={`relative h-[92px] w-[92px] ${urgent ? 'timer-urgent' : ''}`} role="timer" aria-live="off" aria-label={active ? `${left} segundos` : 'aguardando'}>
      <svg viewBox="0 0 92 92" className="-rotate-90">
        <circle cx="46" cy="46" r={R} fill="rgba(0,0,0,.45)" stroke="rgba(255,255,255,.1)" strokeWidth="5" />
        <circle cx="46" cy="46" r={R} fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s', filter: `drop-shadow(0 0 6px ${c})` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-4xl font-bold" style={{ color: urgent ? '#ff8aa0' : '#fff' }}>
        {active ? left : '··'}
      </div>
    </div>
  );
});

/** Barra de passos: bans (esquerda) e picks (direita), com o passo atual pulsando. */
export const StepBar = memo(function StepBar({ seq, step }: { seq: DraftStep[]; step: number }) {
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {seq.map((s, i) => {
        const col = s.actor === 'user' ? USER_COLOR : OPP_COLOR;
        const done = i < step;
        const cur = i === step;
        return (
          <span key={i} className="flex items-center gap-1">
            {i === 6 && <span className="mx-1 h-4 w-px bg-white/25" />}
            <motion.span
              layout
              className={`block rounded-sm ${s.kind === 'ban' ? 'h-2.5 w-4' : 'h-3 w-5'} ${cur ? 'step-pulse' : ''}`}
              animate={{ background: done ? col : cur ? '#ffffff' : '#ffffff22', scale: cur ? 1.25 : 1, opacity: done || cur ? 1 : 0.7 }}
              style={{ boxShadow: done ? `0 0 8px ${col}88` : cur ? `0 0 12px #fff` : undefined }}
              title={`${s.kind === 'ban' ? 'Ban' : 'Pick'} ${i + 1}`}
            />
          </span>
        );
      })}
    </div>
  );
});

interface TileProps {
  hero: Hero;
  index: number;
  selected: boolean;
  disabled: boolean;
  banned: boolean;
  taken: boolean;
  onPick: (id: string) => void;
  onHover?: (id: string | null) => void;
}

/** Tile de herói: entra em cascata, flutua no hover com brilho da função e ganha anel giratório quando selecionado. */
export const HeroTile = memo(function HeroTile({ hero, index, selected, disabled, banned, taken, onPick, onHover }: TileProps) {
  const role = ROLES[hero.roles[0]!];
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => onPick(hero.id)}
      onMouseEnter={() => onHover?.(hero.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(hero.id)}
      onBlur={() => onHover?.(null)}
      initial={{ opacity: 0, scale: 0.7, y: 14 }}
      animate={{ opacity: taken ? 0.35 : 1, scale: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.014, 0.5), type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={disabled ? undefined : { y: -4, scale: 1.08 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      className={`hero-tile group relative flex flex-col items-center gap-1 rounded-lg p-1.5 ${selected ? 'hero-tile-sel' : ''}`}
      style={{ ['--rc' as string]: role.color }}
      title={`${hero.name} — ${hero.roles.map((r) => ROLES[r].label).join(' / ')}\n${hero.blurb}`}
    >
      <span className="relative">
        <HeroAvatar heroId={hero.id} size={54} ring={banned ? '#ef4444' : role.color} dim={banned} />
        {banned && (
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
            <line className="ban-slash" x1="8" y1="92" x2="92" y2="8" stroke="#ff4d6d" strokeWidth="6" strokeLinecap="round" pathLength="1" />
          </svg>
        )}
      </span>
      <span className="max-w-full truncate text-[11px] font-semibold">{hero.name}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: role.color }}>{role.short}</span>
    </motion.button>
  );
});

/** Retrato do herói na linha de pick: busto inteiro e centralizado (retrato do DeadChaps; se falhar, a carta da wiki). */
function PickPortrait({ hero, side }: { hero: Hero; side: 'left' | 'right' }) {
  const [failed, setFailed] = useState(false);
  const url = failed ? heroImageUrl(hero) : heroPortraitUrl(hero);
  if (!url) return null;
  const dir = side === 'left' ? 'left' : 'right';
  return (
    <div
      className="absolute inset-y-0 w-[46%]"
      style={{ [side === 'left' ? 'right' : 'left']: 0, WebkitMaskImage: `linear-gradient(to ${dir}, #000 55%, transparent)`, maskImage: `linear-gradient(to ${dir}, #000 55%, transparent)` }}
    >
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-contain"
        style={{ objectPosition: side === 'left' ? 'right 20%' : 'left 20%', transform: 'scale(1.5)', transformOrigin: side === 'left' ? '78% 24%' : '22% 24%' }}
      />
    </div>
  );
}

/** Linha de pick: entra deslizando do lado do time, com retrato do herói e flash. */
export const PickSlot = memo(function PickSlot({ heroId, index, color, side, next }: { heroId?: string; index: number; color: string; side: 'left' | 'right'; next: boolean }) {
  const h = heroId ? HERO_MAP[heroId] : null;
  return (
    <div className={`relative h-[58px] overflow-hidden rounded-md border bg-black/35 ${next ? 'slot-next' : ''}`} style={{ borderColor: h ? `${color}99` : next ? color : '#ffffff14', borderLeftWidth: side === 'left' ? 3 : 1, borderRightWidth: side === 'right' ? 3 : 1, borderLeftColor: side === 'left' ? color : undefined, borderRightColor: side === 'right' ? color : undefined }}>
      <span className="absolute left-2 top-1/2 -translate-y-1/2 font-display text-xs font-bold text-white/35">P{index + 1}</span>
      <AnimatePresence>
        {h && (
          <motion.div
            key={h.id}
            className="absolute inset-0"
            initial={{ x: side === 'left' ? -60 : 60, opacity: 0, filter: 'brightness(3)' }}
            animate={{ x: 0, opacity: 1, filter: 'brightness(1)' }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            style={{ background: `linear-gradient(${side === 'left' ? 90 : 270}deg, ${h.color2} 0%, #0b0f13 70%)` }}
          >
            <PickPortrait hero={h} side={side} />
            <div className={`absolute inset-y-0 flex flex-col justify-center ${side === 'left' ? 'left-9' : 'right-9 items-end'}`}>
              <span className="font-display text-base font-bold uppercase leading-none tracking-wide text-white">{h.name}</span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: ROLES[h.roles[0]!].color }}>{h.roles.map((r) => ROLES[r].short).join(' · ')}</span>
            </div>
            <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/** Fim do draft: resumo dos picks e botão para seguir às posições. */
export function DraftComplete({ show, user, opp, userPicks, oppPicks, onContinue }: {
  show: boolean; user: Team; opp: Team; userPicks: string[]; oppPicks: string[]; onContinue: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="complete"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/85 px-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-center">
            <div className="text-[11px] uppercase tracking-[0.5em] text-white/50">Draft concluído</div>
            <div className="font-display text-4xl font-bold uppercase tracking-[0.2em]">Times prontos</div>
          </motion.div>
          <div className="flex w-full max-w-3xl items-start justify-between gap-6">
            {([[user, userPicks, USER_COLOR, -1], [opp, oppPicks, OPP_COLOR, 1]] as const).map(([t, picks, color, dir]) => (
              <motion.div key={t.id} initial={{ x: dir * 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 16 }} className="flex-1">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <TeamCrest id={t.id} tag={t.tag} color={t.color} size={34} />
                  <span className="font-display text-lg font-bold uppercase" style={{ color }}>{t.name}</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {picks.map((id, i) => (
                    <motion.div key={id} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 260, damping: 14 }} className="flex flex-col items-center gap-1">
                      <HeroAvatar heroId={id} size={52} ring={color} />
                      <span className="text-[10px] font-semibold">{HERO_MAP[id]?.name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
          <motion.button
            type="button"
            onClick={onContinue}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="btn-pulse rounded-xl bg-amber px-8 py-3 font-display text-lg font-bold uppercase tracking-[0.2em] text-black"
          >
            Seguir para posições →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
