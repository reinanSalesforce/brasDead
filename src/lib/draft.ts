import { HEROES, HERO_MAP } from '../data/heroes';
import type { Hero, Role } from '../types';
import type { Rng } from './rng';

export type Actor = 'user' | 'opp';
export interface DraftStep {
  kind: 'ban' | 'pick';
  actor: Actor;
}

export const BANS_PER_TEAM = 3;
export const PICKS_PER_TEAM = 6;

/** 3 bans cada (alternados) e depois 6 picks cada em snake (A B B A A B B A A B B A). */
export function buildSequence(userFirst: boolean): DraftStep[] {
  const a: Actor = userFirst ? 'user' : 'opp';
  const b: Actor = userFirst ? 'opp' : 'user';
  const bans: DraftStep[] = [a, b, a, b, a, b].map((actor) => ({ kind: 'ban', actor }));
  const picks: DraftStep[] = [a, b, b, a, a, b, b, a, a, b, b, a].map((actor) => ({
    kind: 'pick',
    actor,
  }));
  return [...bans, ...picks];
}

export interface DraftState {
  step: number;
  bans: Record<Actor, string[]>;
  picks: Record<Actor, string[]>;
}

export const emptyDraft = (): DraftState => ({
  step: 0,
  bans: { user: [], opp: [] },
  picks: { user: [], opp: [] },
});

export const takenIds = (s: DraftState): Set<string> =>
  new Set([...s.bans.user, ...s.bans.opp, ...s.picks.user, ...s.picks.opp]);

export const availableHeroes = (s: DraftState): Hero[] => {
  const t = takenIds(s);
  return HEROES.filter((h) => !t.has(h.id));
};

export function applyStep(s: DraftState, seq: DraftStep[], heroId: string | null): DraftState {
  const st = seq[s.step];
  if (!st) return s;
  if (heroId && takenIds(s).has(heroId)) return s; // regra: herói único por draft
  const next: DraftState = {
    step: s.step + 1,
    bans: { user: [...s.bans.user], opp: [...s.bans.opp] },
    picks: { user: [...s.picks.user], opp: [...s.picks.opp] },
  };
  if (heroId) (st.kind === 'ban' ? next.bans : next.picks)[st.actor].push(heroId);
  return next;
}

export const isDone = (s: DraftState, seq: DraftStep[]) => s.step >= seq.length;

/** IA escolhe: ban = herói mais forte; pick = força + necessidade de função. */
export function aiChoose(
  s: DraftState,
  step: DraftStep,
  needs: Role[],
  rng: Rng,
  threat?: string[],
  fit?: (heroId: string) => number, // 0–1: quão bem o elenco joga com o herói
): string {
  const pool = availableHeroes(s);
  const mine = s.picks[step.actor].map((id) => HERO_MAP[id]).filter(Boolean) as Hero[];
  const missing = [...needs];
  for (const m of mine) {
    const i = missing.findIndex((r) => m.roles.includes(r));
    if (i >= 0) missing.splice(i, 1);
  }
  const scored = pool.map((h) => {
    let v = h.power * 100 + rng() * 3 + (fit ? fit(h.id) * 9 : 0);
    if (step.kind === 'pick') {
      if (h.roles.some((r) => missing.includes(r))) v += 4;
      if (h.roles[0] && missing.includes(h.roles[0])) v += 2;
    } else if (threat?.includes(h.id)) {
      v += 5; // bane o que o rival domina
    }
    return { h, v };
  });
  scored.sort((x, y) => y.v - x.v);
  return (scored[0]?.h.id ?? pool[0]?.id) as string;
}
