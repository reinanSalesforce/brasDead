import { HERO_MAP } from '../data/heroes';
import { ovr } from '../data/players';
import { clamp } from './rng';
import type { Player, Role, SlotDef } from '../types';

/** Quanto o jogador rende na função do slot (1 = perfeito). */
export function roleFit(p: Player, role: Role): number {
  if (p.role === role) return 1;
  if (p.role === 'flex') return 0.97;
  return 0.9;
}

/**
 * Afinidade jogador↔herói (0–1) a partir das partidas reais: 65% familiaridade
 * (16+ jogos = máximo) e 35% taxa de vitória. Sem partidas no herói = 0.
 */
export function affinity(p: Player, heroId: string): number {
  const st = p.heroStats?.[heroId];
  if (!st) return 0;
  return clamp(0.65 * Math.min(1, st.games / 16) + 0.35 * clamp((st.winRate - 40) / 55, 0, 1), 0, 1);
}

/** Multiplicador de rating pelo herói: quem joga muito com ele rende mais; quase sem jogos, bem menos. */
export function heroMultiplier(p: Player, heroId: string): number {
  if (!p.heroStats) return p.pool.includes(heroId) ? 1.03 : 1;
  return 0.86 + 0.19 * affinity(p, heroId);
}

/** Quanto o herói rende na função do slot. */
export function heroFit(heroId: string, role: Role): number {
  const h = HERO_MAP[heroId];
  if (!h) return 1;
  const idx = h.roles.indexOf(role);
  if (idx === 0) return 1;
  if (idx > 0) return 0.97;
  return 0.92;
}

/** Rating efetivo do jogador no slot, com herói opcional. */
export function slotRating(p: Player | null, slot: SlotDef, heroId?: string | null): number {
  if (!p) return 30;
  let v = ovr(p) * roleFit(p, slot.role);
  if (heroId) {
    const h = HERO_MAP[heroId];
    v *= heroFit(heroId, slot.role);
    v *= heroMultiplier(p, heroId);
    if (h) v *= h.power;
  }
  return v;
}

export function teamRating(
  players: (Player | null)[],
  slots: SlotDef[],
  heroIds?: (string | null)[],
): number {
  const sum = slots.reduce(
    (acc, s, i) => acc + slotRating(players[i] ?? null, s, heroIds?.[i] ?? null),
    0,
  );
  const base = sum / slots.length;
  const distinct = new Set(slots.map((s) => s.role)).size;
  return base + (distinct - 5) * 0.4; // sinergia por diversidade de funções
}

/** Melhor atribuição herói→slot (6! = 720 permutações, ótimo exato). */
export function bestAssignment(
  players: (Player | null)[],
  slots: SlotDef[],
  heroIds: string[],
): string[] {
  const n = slots.length;
  const idx = Array.from({ length: n }, (_, i) => i);
  let best = -1;
  let bestPerm: number[] = idx;
  const used: boolean[] = Array(n).fill(false);
  const cur: number[] = [];
  const rec = (slot: number, score: number) => {
    if (slot === n) {
      if (score > best) {
        best = score;
        bestPerm = [...cur];
      }
      return;
    }
    for (let h = 0; h < n; h++) {
      if (used[h]) continue;
      used[h] = true;
      cur.push(h);
      rec(slot + 1, score + slotRating(players[slot] ?? null, slots[slot] as SlotDef, heroIds[h]));
      cur.pop();
      used[h] = false;
    }
  };
  rec(0, 0);
  return bestPerm.map((h) => heroIds[h] as string);
}

/** Preenche o lineup: pares (jogador, slot) do maior rating para o menor (guloso global). */
export function autoLineup(squad: Player[], slots: SlotDef[]): (string | null)[] {
  const out: (string | null)[] = Array(slots.length).fill(null);
  const taken = new Set<string>();
  const pairs = squad
    .flatMap((p) => slots.map((s, i) => ({ p, i, v: slotRating(p, s) })))
    .sort((a, b) => b.v - a.v);
  for (const { p, i } of pairs) {
    if (out[i] || taken.has(p.id)) continue;
    out[i] = p.id;
    taken.add(p.id);
  }
  return out;
}

/**
 * Pré-escalação: dado o elenco e os 6 heróis do draft, busca (subida de encosta) a combinação
 * jogador→slot + herói→slot de maior rating total.
 */
export function optimizePreLineup(
  squad: Player[],
  slots: SlotDef[],
  start: (string | null)[],
  heroIds: string[],
): { lineup: (string | null)[]; heroes: string[] } {
  const byId = new Map(squad.map((p) => [p.id, p]));
  const toPlayers = (l: (string | null)[]) => l.map((id) => (id ? byId.get(id) ?? null : null));
  const score = (l: (string | null)[]) => {
    const pl = toPlayers(l);
    const hs = bestAssignment(pl, slots, heroIds);
    const total = slots.reduce((a, s, i) => a + slotRating(pl[i] ?? null, s, hs[i]), 0);
    return { total, hs };
  };
  let lineup = [...start];
  let cur = score(lineup);
  for (let pass = 0; pass < 6; pass++) {
    let improved = false;
    for (let i = 0; i < slots.length; i++) {
      for (const p of squad) {
        if (lineup[i] === p.id) continue;
        const next = [...lineup];
        const j = next.indexOf(p.id);
        next[i] = p.id;
        if (j >= 0) next[j] = lineup[i] ?? null;
        const sc = score(next);
        if (sc.total > cur.total + 1e-9) {
          lineup = next;
          cur = sc;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return { lineup, heroes: cur.hs };
}
