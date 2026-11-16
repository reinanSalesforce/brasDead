import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer,
  type Dispatch, type ReactNode,
} from 'react';
import { FORMATION_MAP } from '../data/formations';
import { USER_TEAM_ID } from '../data/players';
import { autoLineup } from '../lib/rating';
import {
  finishRound, newGame, userTeam, type GameState, type MatchSession,
} from './game';

export type Action =
  | { type: 'formation'; id: string }
  | { type: 'tactic'; id: string }
  | { type: 'lineup'; lineup: (string | null)[] }
  | { type: 'autoLineup' }
  | { type: 'buy'; id: string }
  | { type: 'sell'; id: string }
  | { type: 'session'; session: MatchSession | null }
  | { type: 'slotHeroes'; heroBySlot: (string | null)[] }
  | { type: 'finish'; won: boolean; kills: [number, number] }
  | { type: 'reset' };

const KEY = 'brasdead:v5';

function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'formation': {
      const f = FORMATION_MAP[a.id];
      if (!f) return s;
      return { ...s, formationId: a.id, lineup: autoLineup(userTeam(s).squad, f.slots) };
    }
    case 'tactic':
      return { ...s, tactic: a.id };
    case 'lineup':
      return { ...s, lineup: a.lineup };
    case 'autoLineup':
      return { ...s, lineup: autoLineup(userTeam(s).squad, FORMATION_MAP[s.formationId]!.slots) };
    case 'buy': {
      const p = s.market.find((x) => x.id === a.id);
      if (!p || p.price > s.money) return s;
      return {
        ...s,
        money: s.money - p.price,
        market: s.market.filter((x) => x.id !== a.id),
        teams: s.teams.map((t) => (t.id === USER_TEAM_ID ? { ...t, squad: [...t.squad, p] } : t)),
      };
    }
    case 'sell': {
      const u = userTeam(s);
      const p = u.squad.find((x) => x.id === a.id);
      if (!p || u.squad.length <= 6) return s;
      return {
        ...s,
        money: s.money + Math.round(p.price * 0.8),
        lineup: s.lineup.map((id) => (id === p.id ? null : id)),
        teams: s.teams.map((t) =>
          t.id === USER_TEAM_ID ? { ...t, squad: t.squad.filter((x) => x.id !== p.id) } : t,
        ),
      };
    }
    case 'session':
      return { ...s, session: a.session };
    case 'slotHeroes':
      return s.session ? { ...s, session: { ...s.session, heroBySlot: a.heroBySlot } } : s;
    case 'finish':
      return finishRound(s, a.won, a.kills);
    case 'reset':
      return newGame();
  }
}

function load(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed.v === 1 && Array.isArray(parsed.teams)) return parsed;
    }
  } catch {
    /* localStorage indisponível ou corrompido */
  }
  return newGame();
}

interface Ctx {
  state: GameState;
  dispatch: Dispatch<Action>;
}
const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): Ctx {
  const c = useContext(GameCtx);
  if (!c) throw new Error('useGame fora do GameProvider');
  return c;
}

export function useUserSquad() {
  const { state } = useGame();
  return userTeam(state).squad;
}

export function useSwapLineup() {
  const { state, dispatch } = useGame();
  return useCallback(
    (slot: number, playerId: string) => {
      const next = [...state.lineup];
      const from = next.indexOf(playerId);
      const prev = next[slot] ?? null;
      next[slot] = playerId;
      if (from >= 0 && from !== slot) next[from] = prev;
      dispatch({ type: 'lineup', lineup: next });
    },
    [state.lineup, dispatch],
  );
}
