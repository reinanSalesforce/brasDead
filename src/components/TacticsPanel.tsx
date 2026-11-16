import { motion } from 'motion/react';
import { opponentTactic, TACTICS, TACTIC_MAP, type TacticMods } from '../data/tactics';
import { nextFixture, opponentOf, teamById } from '../state/game';
import { useGame } from '../state/GameContext';
import { Panel } from './ui';

const BARS: [string, (m: TacticMods) => number][] = [
  ['Agressividade', (m) => (m.fight + m.push) / 2],
  ['Objetivos', (m) => m.obj],
  ['Rotação', (m) => m.gank],
  ['Almas', (m) => (m.souls - 1) * 4],
  ['Escala (late)', (m) => (m.late - m.early) * 10],
];

function Meter({ label, v }: { label: string; v: number }) {
  const pct = Math.max(-1, Math.min(1, v));
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-24 text-white/50">{label}</span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded bg-white/10">
        <span className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
        <motion.span
          className="absolute inset-y-0 rounded"
          initial={false}
          animate={{ left: pct >= 0 ? '50%' : `${50 + pct * 50}%`, width: `${Math.abs(pct) * 50}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          style={{ background: pct >= 0 ? '#34d399' : '#f87171' }}
        />
      </span>
    </div>
  );
}

/** Pré-definições de estilo de jogo — alteram a simulação da partida (lutas, pressão, objetivos, rotações, almas, early/late). */
export function TacticsPanel() {
  const { state, dispatch } = useGame();
  const fx = nextFixture(state);
  const opp = fx ? teamById(state, opponentOf(fx)) : null;
  const rival = opp ? opponentTactic(opp.id) : null;
  const cur = TACTIC_MAP[state.tactic] ?? TACTICS[0]!;

  return (
    <Panel title="Estilo de jogo">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Estilo de jogo">
        {TACTICS.map((t) => {
          const on = t.id === cur.id;
          return (
            <motion.button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => dispatch({ type: 'tactic', id: t.id })}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`relative overflow-hidden rounded-lg border px-2.5 py-2 text-left transition ${on ? 'border-amber bg-amber/15 shadow-[0_0_22px_-6px_#f59e0b]' : 'border-line bg-panel2 hover:border-white/30'}`}
            >
              <div className="text-lg leading-none">{t.icon}</div>
              <div className="mt-1 font-display text-sm font-bold uppercase leading-tight tracking-wide">{t.name}</div>
              {on && <motion.span layoutId="tactic-check" className="absolute right-1.5 top-1.5 rounded-full bg-amber px-1.5 text-[10px] font-bold text-black">✓</motion.span>}
            </motion.button>
          );
        })}
      </div>

      <motion.div key={cur.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-2 rounded-lg border border-line bg-black/30 p-3">
        <p className="text-sm leading-snug text-white/80">{cur.blurb}</p>
        <div className="space-y-1.5">
          {BARS.map(([label, fn]) => (
            <Meter key={label} label={label} v={fn(cur.mods)} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] leading-tight">
          <div className="rounded bg-emerald-500/10 p-2 text-emerald-300"><b className="block text-[9px] uppercase tracking-widest opacity-70">Ponto forte</b>{cur.pros}</div>
          <div className="rounded bg-red-500/10 p-2 text-red-300"><b className="block text-[9px] uppercase tracking-widest opacity-70">Ponto fraco</b>{cur.cons}</div>
        </div>
      </motion.div>

      {rival && opp && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-400/5 px-3 py-2 text-xs">
          <span className="text-lg">{rival.icon}</span>
          <span className="text-white/60">{opp.name} costuma jogar</span>
          <b className="text-sky-300">{rival.name}</b>
        </div>
      )}
    </Panel>
  );
}
