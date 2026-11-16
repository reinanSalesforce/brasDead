import { FORMATION_MAP } from '../data/formations';
import { buildMarket, buildTeams, USER_TEAM_ID } from '../data/players';
import { autoLineup, teamRating } from '../lib/rating';
import { hashSeed, mulberry32, type Rng } from '../lib/rng';
import type { Fixture, Player, TableRow, Team } from '../types';

export interface MatchSession {
  oppId: string;
  userFirst: boolean;
  bans: { user: string[]; opp: string[] };
  userHeroes: string[]; // ordem dos picks do usuário
  oppHeroes: string[];
  heroBySlot: (string | null)[]; // atribuição herói→slot do usuário
}

export interface MatchSummary {
  round: number;
  oppId: string;
  won: boolean;
  kills: [number, number];
}

export interface GameState {
  v: 1;
  tactic: string; // estilo de jogo (data/tactics.ts)
  teams: Team[];
  money: number;
  round: number; // 1..7 (7 = fim)
  formationId: string;
  lineup: (string | null)[];
  fixtures: Fixture[];
  market: Player[];
  session: MatchSession | null;
  history: MatchSummary[];
}

export const TOTAL_ROUNDS = 7;

/** Método do círculo: 8 times → 7 rodadas × 4 jogos. */
export function buildFixtures(ids: string[]): Fixture[] {
  const list = [...ids];
  const out: Fixture[] = [];
  const n = list.length;
  for (let round = 1; round <= n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i] as string;
      const b = list[n - 1 - i] as string;
      out.push(round % 2 ? { round, home: a, away: b } : { round, home: b, away: a });
    }
    list.splice(1, 0, list.pop() as string);
  }
  return out;
}

export function newGame(): GameState {
  const teams = buildTeams();
  const user = teams.find((t) => t.id === USER_TEAM_ID) as Team;
  const formationId = '2-2-2'; // escalação fixa
  const f = FORMATION_MAP[formationId]!;
  return {
    v: 1,
    tactic: 'equilibrado',
    teams,
    money: 4_000_000,
    round: 1,
    formationId,
    lineup: autoLineup(user.squad, f.slots),
    fixtures: buildFixtures(teams.map((t) => t.id)),
    market: buildMarket('r1'),
    session: null,
    history: [],
  };
}

export const userTeam = (s: GameState): Team =>
  s.teams.find((t) => t.id === USER_TEAM_ID) as Team;

export const teamById = (s: GameState, id: string): Team =>
  s.teams.find((t) => t.id === id) as Team;

export function nextFixture(s: GameState): Fixture | undefined {
  return s.fixtures.find(
    (f) => f.round === s.round && (f.home === USER_TEAM_ID || f.away === USER_TEAM_ID),
  );
}

export const opponentOf = (f: Fixture) => (f.home === USER_TEAM_ID ? f.away : f.home);

export function computeTable(s: GameState): TableRow[] {
  const rows = new Map<string, TableRow>(
    s.teams.map((t) => [t.id, { teamId: t.id, played: 0, wins: 0, losses: 0, pts: 0 }]),
  );
  for (const f of s.fixtures) {
    if (!f.result) continue;
    const loser = f.result.winner === f.home ? f.away : f.home;
    const w = rows.get(f.result.winner)!;
    const l = rows.get(loser)!;
    w.played++; w.wins++; w.pts += 3;
    l.played++; l.losses++;
  }
  return [...rows.values()].sort((a, b) => b.pts - a.pts || b.wins - a.wins);
}

export function teamPower(t: Team, formationId = '2-2-2'): number {
  const f = FORMATION_MAP[formationId]!;
  const ids = autoLineup(t.squad, f.slots);
  const players = ids.map((id) => t.squad.find((p) => p.id === id) ?? null);
  return teamRating(players, f.slots);
}

export function quickSim(a: Team, b: Team, rng: Rng): string {
  const d = teamPower(a) - teamPower(b);
  const p = 1 / (1 + Math.exp(-d / 5));
  return rng() < p ? a.id : b.id;
}

export function finishRound(s: GameState, userWon: boolean, kills: [number, number]): GameState {
  const fx = nextFixture(s);
  if (!fx) return { ...s, session: null };
  const rng = mulberry32(hashSeed(`round-${s.round}`));
  const fixtures = s.fixtures.map((f) => {
    if (f.round !== s.round || f.result) return f;
    if (f === fx) {
      return { ...f, result: { winner: userWon ? USER_TEAM_ID : opponentOf(f) } };
    }
    return { ...f, result: { winner: quickSim(teamById(s, f.home), teamById(s, f.away), rng) } };
  });
  const bought = new Set(userTeam(s).squad.map((p) => p.id));
  return {
    ...s,
    fixtures,
    round: s.round + 1,
    money: s.money + (userWon ? 450_000 : 120_000),
    market: buildMarket(`r${s.round + 1}`).filter((p) => !bought.has(p.id)),
    session: null,
    history: [...s.history, { round: s.round, oppId: opponentOf(fx), won: userWon, kills }],
  };
}

export const fmtMoney = (n: number) =>
  n >= 1_000_000 ? `R$ ${(n / 1_000_000).toFixed(2)} mi` : `R$ ${Math.round(n / 1000)} mil`;
