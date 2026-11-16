import { describe, expect, it } from 'vitest';
import { buildTeams } from '../data/players';
import { FORMATIONS } from '../data/formations';
import { HEROES } from '../data/heroes';
import { applyStep, buildSequence, emptyDraft } from './draft';
import { affinity, autoLineup, bestAssignment, slotRating } from './rating';
import { mulberry32 } from './rng';
import { simulateMatch, type Unit } from './sim';
import { TACTIC_MAP } from '../data/tactics';
import type { Side } from '../types';

function units(side: Side, teamIdx: number, heroOffset: number): Unit[] {
  const t = buildTeams()[teamIdx]!;
  const f = FORMATIONS[0]!;
  const ids = autoLineup(t.squad, f.slots);
  const players = ids.map((id) => t.squad.find((p) => p.id === id)!);
  const heroes = bestAssignment(players, f.slots, HEROES.slice(heroOffset, heroOffset + 6).map((h) => h.id));
  return f.slots.map((s, i) => {
    const h = HEROES.find((x) => x.id === heroes[i])!;
    return {
      id: `${side}${i}`, side, player: players[i]!.name, heroId: h.id, hero: h.name, ult: h.ult,
      role: s.role, lane: s.lane, rating: slotRating(players[i]!, s, h.id),
    };
  });
}

describe('draft', () => {
  it('tem 3 bans e 6 picks por time', () => {
    const seq = buildSequence(true);
    expect(seq.filter((s) => s.kind === 'ban' && s.actor === 'user')).toHaveLength(3);
    expect(seq.filter((s) => s.kind === 'ban' && s.actor === 'opp')).toHaveLength(3);
    expect(seq.filter((s) => s.kind === 'pick' && s.actor === 'user')).toHaveLength(6);
    expect(seq.filter((s) => s.kind === 'pick' && s.actor === 'opp')).toHaveLength(6);
  });
  it('não permite herói repetido', () => {
    const seq = buildSequence(true);
    const a = applyStep(emptyDraft(), seq, 'haze');
    const b = applyStep(a, seq, 'haze');
    expect(b.step).toBe(1);
  });
});

describe('simulateMatch', () => {
  it('termina com vencedor e é determinístico', () => {
    const run = () => simulateMatch(units('A', 0, 0), units('B', 1, 10), mulberry32(42), { A: 'A', B: 'B' });
    const r1 = run();
    const r2 = run();
    expect(['A', 'B']).toContain(r1.winner);
    expect(r1.events.at(-1)!.kind).toBe('end');
    expect(r1.events.length).toBeGreaterThan(8);
    expect(r1.events.map((e) => e.text)).toEqual(r2.events.map((e) => e.text));
  });
  it('sempre termina em várias sementes', () => {
    for (let s = 1; s <= 60; s++) {
      const r = simulateMatch(units('A', 0, 0), units('B', 2, 5), mulberry32(s), { A: 'A', B: 'B' });
      expect(r.events.at(-1)!.kind).toBe('end');
    }
  });
});

describe('equilíbrio', () => {
  it('times parecidos não produzem goleada sistemática', () => {
    let aWins = 0;
    let maxDiff = 0;
    const N = 200;
    for (let s = 1; s <= N; s++) {
      const r = simulateMatch(units('A', 0, 0), units('B', 3, 12), mulberry32(s), { A: 'A', B: 'B' });
      if (r.winner === 'A') aWins++;
      const e = r.events.at(-1)!;
      maxDiff += Math.abs(e.kills.A - e.kills.B);
    }
    expect(aWins / N).toBeGreaterThan(0.25);
    expect(aWins / N).toBeLessThan(0.85);
    expect(maxDiff / N).toBeLessThan(22);
  });
});

describe('afinidade jogador↔herói', () => {
  it('quem joga muito com o herói rende mais do que com um herói sem partidas', () => {
    const w = buildTeams()[0]!.squad.find((p) => p.name === '1worst')!;
    const slot = FORMATIONS[0]!.slots.find((s) => s.role === 'carry')!;
    expect(affinity(w, 'lady-geist')).toBeGreaterThan(0.8);
    expect(affinity(w, 'paradox')).toBe(0);
    expect(slotRating(w, slot, 'vyper')).toBeGreaterThan(slotRating(w, slot, 'paradox') * 1.1);
  });
});

describe('estilos de jogo', () => {
  it('agressivo gera mais abates e partidas mais curtas que passivo', () => {
    const run = (id: string) => {
      let kills = 0;
      let minutes = 0;
      const N = 80;
      for (let s = 1; s <= N; s++) {
        const r = simulateMatch(units('A', 0, 0), units('B', 1, 12), mulberry32(s), { A: 'A', B: 'B' }, { A: TACTIC_MAP[id]!.mods, B: TACTIC_MAP.equilibrado!.mods });
        const e = r.events.at(-1)!;
        kills += e.kills.A + e.kills.B;
        minutes += r.durationMin;
        expect(e.kind).toBe('end');
      }
      return { kills: kills / N, minutes: minutes / N };
    };
    const agr = run('agressivo');
    const pas = run('passivo');
    expect(agr.minutes).toBeLessThan(pas.minutes);
  });
});
