import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { HeroAvatar } from '../components/HeroArt';
import { MatchMap, SIDE_COLOR } from '../components/MatchMap';
import { Button, Panel } from '../components/ui';
import { FORMATION_MAP, FORMATIONS } from '../data/formations';
import { HERO_MAP } from '../data/heroes';
import { hashSeed, mulberry32 } from '../lib/rng';
import { bestAssignment, slotRating } from '../lib/rating';
import { modsOf, opponentTactic } from '../data/tactics';
import { simulateMatch, type EventKind, type SimResult, type Unit } from '../lib/sim';
import { autoLineup } from '../lib/rating';
import { nextFixture, opponentOf, teamById, userTeam } from '../state/game';
import { useGame } from '../state/GameContext';
import type { Player, Side, SlotDef } from '../types';

const ICON: Record<EventKind, string> = {
  start: '🚩', farm: '💰', trade: '⚔️', kill: '💀', gank: '🥷', urn: '🏺', guardian: '🗼',
  walker: '🤖', midboss: '👹', teamfight: '💥', shrine: '⛩️', patron: '👑', end: '🏆',
};
const SPEEDS = [
  { label: '1×', ms: 6500 },
  { label: '2×', ms: 3600 },
  { label: '4×', ms: 1800 },
];

function toUnits(side: Side, players: (Player | null)[], slots: SlotDef[], heroes: (string | null)[]): Unit[] {
  const out: Unit[] = [];
  slots.forEach((slot, i) => {
    const p = players[i];
    const hid = heroes[i];
    const h = hid ? HERO_MAP[hid] : undefined;
    if (!p || !h) return;
    out.push({
      id: `${side}${i}`, side, player: p.name, heroId: h.id, hero: h.name, ult: h.ult,
      role: slot.role, lane: slot.lane, rating: slotRating(p, slot, h.id),
    });
  });
  return out;
}

export default function Partida() {
  const { state, dispatch } = useGame();
  const nav = useNavigate();
  const fx = nextFixture(state);
  const session = state.session;

  const built = useMemo(() => {
    if (!session || !fx) return null;
    const me = userTeam(state);
    const opp = teamById(state, opponentOf(fx));
    const f = FORMATION_MAP[state.formationId]!;
    const byId = new Map(me.squad.map((p) => [p.id, p]));
    const myPlayers = state.lineup.map((id) => (id ? byId.get(id) ?? null : null));
    const oppSlots = FORMATIONS[0]!.slots;
    const oppIds = autoLineup(opp.squad, oppSlots);
    const oppById = new Map(opp.squad.map((p) => [p.id, p]));
    const oppPlayers = oppIds.map((id) => (id ? oppById.get(id) ?? null : null));
    const oppHeroes = bestAssignment(oppPlayers, oppSlots, session.oppHeroes);
    const A = toUnits('A', myPlayers, f.slots, session.heroBySlot);
    const B = toUnits('B', oppPlayers, oppSlots, oppHeroes);
    const rng = mulberry32(hashSeed(`match-${state.round}-${session.oppId}-${state.tactic}-${session.heroBySlot.join()}`));
    const result: SimResult = simulateMatch(A, B, rng, { A: me.name, B: opp.name }, { A: modsOf(state.tactic), B: opponentTactic(opp.id).mods });
    return { A, B, result, me, opp };
  }, [session, fx, state]);

  const [idx, setIdx] = useState(0); // o que acontece no mapa
  const [feedIdx, setFeedIdx] = useState(0); // o que já foi narrado/pontuado (chega depois do movimento)
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const last = built ? built.result.events.length - 1 : 0;

  useEffect(() => {
    if (!playing || idx >= last) return;
    const t = setTimeout(() => setIdx((i) => Math.min(last, i + 1)), SPEEDS[speed]!.ms);
    return () => clearTimeout(t);
  }, [playing, idx, last, speed]);

  // primeiro os heróis se movem no mapa; a narração e o placar chegam logo depois
  useEffect(() => {
    if (feedIdx === idx) return;
    const lag = idx >= last ? 400 : Math.round(SPEEDS[speed]!.ms * 0.32);
    const t = setTimeout(() => setFeedIdx(idx), lag);
    return () => clearTimeout(t);
  }, [idx, feedIdx, last, speed]);

  const finish = useCallback(() => {
    if (!built) return;
    const e = built.result.events[last]!;
    dispatch({ type: 'finish', won: built.result.winner === 'A', kills: [e.kills.A, e.kills.B] });
    nav('/painel');
  }, [built, last, dispatch, nav]);

  if (!session || !built) return <Navigate to="/painel" replace />;

  const { A, B, result, me, opp } = built;
  const ev = result.events[feedIdx]!; // placar e narração
  const mapEv = result.events[idx]!; // posições e prédios
  const ended = feedIdx >= last;
  const units = [...A, ...B];
  const feed = result.events.slice(0, feedIdx + 1).reverse();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-line bg-panel/80 px-6 py-3">
        <div>
          <div className="font-display text-xl font-bold uppercase" style={{ color: SIDE_COLOR.A }}>{me.name}</div>
          <div className="text-xs text-white/50">{(ev.souls.A / 1000).toFixed(1)}k almas · Patrono {'●'.repeat(ev.obj.patron.A)}{'○'.repeat(3 - ev.obj.patron.A)}</div>
        </div>
        <div className="text-center">
          <div className="font-display text-4xl font-bold">{ev.kills.A} <span className="text-white/30">–</span> {ev.kills.B}</div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/50">{String(Math.floor(ev.min)).padStart(2, '0')}:{String(Math.round((ev.min % 1) * 60)).padStart(2, '0')}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-bold uppercase" style={{ color: SIDE_COLOR.B }}>{opp.name}</div>
          <div className="text-xs text-white/50">{(ev.souls.B / 1000).toFixed(1)}k almas · Patrono {'●'.repeat(ev.obj.patron.B)}{'○'.repeat(3 - ev.obj.patron.B)}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <div className="mx-auto aspect-[460/530] w-full max-w-[540px] overflow-hidden rounded-2xl border border-line shadow-[0_0_40px_-12px_rgba(245,158,11,.3)]">
            <MatchMap event={mapEv} units={units} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => setPlaying((p) => !p)} disabled={ended}>{playing ? 'Pausar' : 'Continuar'}</Button>
            {SPEEDS.map((s, i) => (
              <Button key={s.label} variant={speed === i ? 'primary' : 'ghost'} onClick={() => setSpeed(i)}>{s.label}</Button>
            ))}
            <Button onClick={() => { setIdx(last); setFeedIdx(last); }} disabled={ended}>Pular ao fim</Button>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-white/55">
            {[A, B].map((list, k) => (
              <div key={k} className="flex items-center gap-1.5">
                {list.map((u) => (
                  <HeroAvatar key={u.id} heroId={u.heroId} size={30} ring={SIDE_COLOR[u.side]} dim={ev.dead.includes(u.id)} />
                ))}
              </div>
            ))}
          </div>
        </div>

        <Panel title="Narração" className="self-start">
          <ol className="-mr-2 max-h-[min(680px,calc(100vh-12rem))] space-y-3 overflow-y-auto pr-2" aria-live="polite">
            {feed.map((e, i) => (
              <li
                key={e.idx}
                className={`fade-in rounded-lg border px-3 py-2 ${i === 0 ? 'border-amber/50 bg-amber/10' : 'border-line bg-panel2/60'}`}
              >
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/45">
                  <span>{ICON[e.kind]}</span>
                  <span>{Math.floor(e.min)}′</span>
                  <b className="text-white/80">{e.title}</b>
                </div>
                <p className="mt-1 text-sm leading-snug text-white/85">{e.text}</p>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      {ended && (
        <Panel title={result.winner === 'A' ? '🏆 Vitória!' : 'Derrota'} className="fade-in">
          <div className="grid gap-4 md:grid-cols-2">
            {[A, B].map((list, k) => (
              <table key={k} className="w-full text-sm">
                <thead className="text-left text-[10px] uppercase tracking-widest text-white/40">
                  <tr><th className="py-1">{k === 0 ? me.name : opp.name}</th><th>K</th><th>D</th><th>Almas</th></tr>
                </thead>
                <tbody>
                  {list.map((u) => {
                    const s = result.stats[u.id]!;
                    return (
                      <tr key={u.id} className="border-t border-line/50">
                        <td className="py-1">{u.player} <span className="text-white/45">({u.hero})</span></td>
                        <td>{s.kills}</td><td>{s.deaths}</td><td>{(s.souls / 1000).toFixed(1)}k</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button variant="primary" pulse onClick={finish}>Concluir rodada</Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
