import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { HERO_MAP } from '../data/heroes';
import { ovr } from '../data/players';
import { ROLES } from '../data/roles';
import { affinity, roleFit, slotRating } from '../lib/rating';
import type { Player, SlotDef } from '../types';
import { HeroAvatar } from './HeroArt';
import { PlayerCard } from './PlayerCard';

interface Props {
  reserve: Player;
  starters: (Player | null)[];
  slots: SlotDef[];
  heroBySlot: (string | null)[];
  initialSlot: number;
  onSwap: (slot: number) => void;
  onClose: () => void;
}

const ATTRS: [keyof Player['attrs'], string][] = [
  ['mir', 'Mira'], ['mov', 'Movimentação'], ['mac', 'Macro'], ['pol', 'Pool de heróis'], ['sup', 'Suporte'], ['con', 'Consistência'],
];

/** Estatísticas derivadas dos atributos (Deadlock): farm de almas e poder de luta. */
const DERIVED: [string, (p: Player) => number][] = [
  ['Farm (almas)', (p) => Math.round(p.attrs.mac * 0.6 + p.attrs.con * 0.4)],
  ['Lutas', (p) => Math.round(p.attrs.mir * 0.6 + p.attrs.mov * 0.4)],
];

const GOOD = '#34d399';
const BAD = '#f87171';

/** Linha de comparação: barras opostas que crescem do centro; o vencedor brilha. */
function Row({ label, a, b, delay, fmt = (v: number) => String(v) }: { label: string; a: number; b: number; delay: number; fmt?: (v: number) => string }) {
  const max = Math.max(a, b, 1);
  const win = b > a ? 'b' : a > b ? 'a' : null;
  const bar = (v: number, side: 'a' | 'b') => (
    <div className={`flex h-2 flex-1 overflow-hidden rounded bg-white/8 ${side === 'a' ? 'justify-end' : ''}`}>
      <motion.div
        className="h-full rounded"
        initial={{ width: 0 }}
        animate={{ width: `${(v / max) * 100}%` }}
        transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: win === side ? GOOD : win ? BAD : '#94a3b8', boxShadow: win === side ? `0 0 10px ${GOOD}` : undefined }}
      />
    </div>
  );
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="grid grid-cols-[2.4rem_1fr_6.5rem_1fr_2.4rem] items-center gap-2 text-sm">
      <span className={`text-right font-display text-base font-bold ${win === 'a' ? 'text-emerald-300' : win ? 'text-red-300' : 'text-white'}`}>{fmt(a)}</span>
      {bar(a, 'a')}
      <span className="text-center text-[11px] uppercase tracking-wider text-white/55">{label}</span>
      {bar(b, 'b')}
      <span className={`font-display text-base font-bold ${win === 'b' ? 'text-emerald-300' : win ? 'text-red-300' : 'text-white'}`}>
        {fmt(b)} {win === 'b' && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: delay + 0.5, type: 'spring' }} className="inline-block text-xs">▲</motion.span>}
      </span>
    </motion.div>
  );
}

/** Pop-up: titular × reserva no slot escolhido, com os números do herói daquele slot e botão de trocar. */
export function CompareModal({ reserve, starters, slots, heroBySlot, initialSlot, onSwap, onClose }: Props) {
  const [slot, setSlot] = useState(initialSlot);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const starter = starters[slot] ?? null;
  const slotDef = slots[slot]!;
  const heroId = heroBySlot[slot] ?? null;
  const hero = heroId ? HERO_MAP[heroId] : null;

  const data = useMemo(() => {
    const rS = slotRating(starter, slotDef, heroId);
    const rR = slotRating(reserve, slotDef, heroId);
    const stat = (p: Player | null) => (heroId ? p?.heroStats?.[heroId] : undefined);
    return {
      rS, rR, delta: rR - rS,
      affS: starter && heroId ? Math.round(affinity(starter, heroId) * 100) : 0,
      affR: heroId ? Math.round(affinity(reserve, heroId) * 100) : 0,
      stS: stat(starter), stR: stat(reserve),
      fitS: starter ? Math.round(roleFit(starter, slotDef.role) * 100) : 0,
      fitR: Math.round(roleFit(reserve, slotDef.role) * 100),
    };
  }, [starter, reserve, slotDef, heroId]);

  const better = data.delta > 0.05;
  const worse = data.delta < -0.05;
  const role = ROLES[slotDef.role];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/80 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Comparar ${reserve.name} com o titular`}
    >
      <motion.div
        key={slot}
        className="relative w-full max-w-[860px] rounded-2xl border border-white/15 bg-[#0c1116] p-5 shadow-[0_0_80px_-20px_rgba(0,0,0,.9)]"
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: better ? `0 0 90px -20px ${GOOD}88` : worse ? `0 0 90px -20px ${BAD}66` : undefined }}
      >
        {/* escolha do slot */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5">
          {slots.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlot(i)}
              className={`rounded-md px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider transition ${i === slot ? 'bg-amber text-black' : 'bg-white/8 text-white/60 hover:text-white'}`}
            >
              {ROLES[s.role].short} · {starters[i]?.name ?? '—'}
            </button>
          ))}
        </div>

        <div className="grid items-start gap-4 md:grid-cols-[150px_1fr_150px]">
          <motion.div initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 160, damping: 16 }} className="flex flex-col items-center gap-2">
            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70">Titular</span>
            {starter ? <PlayerCard player={starter} size="md" heroId={heroId} /> : <div className="dashed-march flex h-[225px] w-[150px] items-center justify-center text-xs text-white/50">vazio</div>}
          </motion.div>

          <div className="space-y-3">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-[0.4em] text-white/45">Comparando no slot</div>
              <div className="flex items-center justify-center gap-2 font-display text-xl font-bold uppercase">
                <span style={{ color: role.color }}>{role.label}</span>
                {hero && heroId && (
                  <>
                    <span className="text-white/30">·</span>
                    <HeroAvatar heroId={heroId} size={30} ring={role.color} />
                    <span>{hero.name}</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="mb-1 grid grid-cols-[2.4rem_1fr_6.5rem_1fr_2.4rem] gap-2 text-[10px] font-bold uppercase tracking-widest">
                <span className="text-right text-white/50">{starter?.name.slice(0, 5)}</span><span /><span className="text-center text-white/35">Atributos</span><span /><span className="text-emerald-300/80">{reserve.name.slice(0, 5)}</span>
              </div>
              {ATTRS.map(([k, label], i) => (
                <Row key={k} label={label} a={starter?.attrs[k] ?? 0} b={reserve.attrs[k]} delay={0.25 + i * 0.07} />
              ))}
              <div className="my-1 h-px bg-white/10" />
              {DERIVED.map(([label, fn], i) => (
                <Row key={label} label={label} a={starter ? fn(starter) : 0} b={fn(reserve)} delay={0.7 + i * 0.07} />
              ))}
            </div>

            {hero && (
              <div className="space-y-1.5 rounded-lg border border-amber/25 bg-amber/5 p-3">
                <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-amber">Só com {hero.name}</div>
                <Row label="Partidas" a={data.stS?.games ?? 0} b={data.stR?.games ?? 0} delay={0.85} />
                <Row label="Vitórias %" a={Math.round(data.stS?.winRate ?? 0)} b={Math.round(data.stR?.winRate ?? 0)} delay={0.93} fmt={(v) => `${v}%`} />
                <Row label="Afinidade" a={data.affS} b={data.affR} delay={1.01} fmt={(v) => `${v}%`} />
                <Row label="Função" a={data.fitS} b={data.fitR} delay={1.09} fmt={(v) => `${v}%`} />
              </div>
            )}
          </div>

          <motion.div initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 160, damping: 16 }} className="flex flex-col items-center gap-2">
            <span className="rounded bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">Reserva</span>
            <PlayerCard player={reserve} size="md" heroId={heroId} />
          </motion.div>
        </div>

        {/* veredito */}
        <motion.div
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, type: 'spring', stiffness: 200, damping: 18 }}
          style={{ borderColor: better ? `${GOOD}88` : worse ? `${BAD}66` : '#ffffff22', background: better ? `${GOOD}14` : worse ? `${BAD}10` : '#ffffff08' }}
        >
          <div className="flex items-center gap-3">
            <motion.span
              className="font-display text-4xl font-bold"
              style={{ color: better ? GOOD : worse ? BAD : '#cbd5e1' }}
              animate={better ? { scale: [1, 1.25, 1] } : undefined}
              transition={{ delay: 1.45, duration: 0.6, repeat: better ? 2 : 0 }}
            >
              {better ? '▲' : worse ? '▼' : '='} {Math.abs(data.delta).toFixed(1)}
            </motion.span>
            <div className="text-sm leading-tight">
              <div className="font-bold">
                {better ? `${reserve.name} rende mais que ${starter?.name ?? 'o slot vazio'}` : worse ? `${starter?.name} continua melhor` : 'Rendimento praticamente igual'}
              </div>
              <div className="text-white/55">
                Nota no slot: {data.rS.toFixed(1)} → <b className={better ? 'text-emerald-300' : worse ? 'text-red-300' : ''}>{data.rR.toFixed(1)}</b> · OVR {starter ? ovr(starter) : '—'} × {ovr(reserve)}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-white/20 px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-white/75 hover:bg-white/10">
              Fechar
            </button>
            <button
              type="button"
              onClick={() => onSwap(slot)}
              className={`rounded-lg px-5 py-2 font-display text-sm font-bold uppercase tracking-[0.15em] ${better ? 'btn-pulse bg-emerald-400 text-black hover:bg-emerald-300' : 'bg-amber text-black hover:bg-amber-300'}`}
            >
              Trocar {starter ? `${starter.name} ⇄ ${reserve.name}` : reserve.name}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

