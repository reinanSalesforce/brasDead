import type { Attrs, HeroStat, Player, Role, Team } from '../types';
import { HEROES, heroesByRole } from './heroes';
import { clamp, hashSeed, mulberry32, pick, shuffle, type Rng } from '../lib/rng';

/** Estatísticas sintéticas (jogadores fictícios): os 3 heróis do pool, do mais ao menos jogado. */
function syntheticStats(r: Rng, pool: string[]): Record<string, HeroStat> {
  const base = [16, 9, 4];
  return Object.fromEntries(
    pool.map((id, i) => [id, { games: base[i]! + Math.floor(r() * 5), winRate: 52 + Math.round(r() * 22) }]),
  );
}

export const ovr = (p: Pick<Player, 'attrs'>): number => {
  const a = p.attrs;
  return Math.round((a.mir + a.mac + a.sup + a.mov + a.pol + a.con) / 6);
};

const ROLE_BIAS: Record<Role, Partial<Attrs>> = {
  carry: { mir: 6, con: 3, sup: -6 },
  anticarry: { mov: 6, mir: 3, sup: -5 },
  spirit: { mac: 4, pol: 4, mir: -2 },
  suporte: { sup: 8, mac: 3, mir: -5 },
  tanque: { con: 5, sup: 3, mir: -4 },
  iniciador: { mov: 6, mac: 3, mir: -2 },
  controle: { mac: 5, pol: 3, mov: -2 },
};

function makePlayer(
  r: Rng,
  id: string,
  name: string,
  role: Role | 'flex',
  target: number,
): Player {
  const base: Role = role === 'flex' ? pick(r, Object.keys(ROLE_BIAS) as Role[]) : role;
  const bias = ROLE_BIAS[base];
  const g = (k: keyof Attrs) =>
    clamp(Math.round(target + (bias[k] ?? 0) + (r() * 12 - 6)), 45, 99);
  const attrs: Attrs = {
    mir: g('mir'), mac: g('mac'), sup: g('sup'),
    mov: g('mov'), pol: g('pol'), con: g('con'),
  };
  const pool = shuffle(r, heroesByRole(base)).slice(0, 3).map((x) => x.id);
  const p: Player = {
    id, name, age: 18 + Math.floor(r() * 10), attrs, role, pool, heroStats: syntheticStats(r, pool),
    price: 0, trend: r() < 0.25 ? 1 + Math.floor(r() * 4) : 0,
  };
  const o = ovr(p);
  p.price = Math.round(((o - 58) ** 2 * 2600) / 1000) * 1000;
  return p;
}

/** Partidas ranqueadas da temporada atual, coletadas em 16/11/2026. */
const SRC = 'DeadChaps · ranked · 16/11/2026';

/**
 * Elenco inicial. 1worst, Machine e Sniper usam os atributos do mockup;
 * os demais são jogadores fictícios — troque à vontade.
 */
function userSquad(): Player[] {
  const r = mulberry32(hashSeed('cangaco'));
  const mk = (
    id: string, name: string, role: Role | 'flex', a: [number, number, number, number, number, number],
    pool: string[], trend = 0, real?: { stats: Record<string, HeroStat>; source: string },
  ): Player => {
    const p: Player = {
      id, name, age: 18 + Math.floor(r() * 8), role, pool, trend, price: 0,
      heroStats: real?.stats ?? syntheticStats(r, pool), source: real?.source,
      attrs: { mir: a[0], mac: a[1], sup: a[2], mov: a[3], pol: a[4], con: a[5] },
    };
    p.price = Math.round(((ovr(p) - 58) ** 2 * 2600) / 1000) * 1000;
    return p;
  };
  const rest = [
    makePlayer(r, 'u4', 'Tatu', 'tanque', 78),
    makePlayer(r, 'u5', 'Corisco', 'iniciador', 79),
    makePlayer(r, 'u6', 'Lamparina', 'suporte', 80),
    makePlayer(r, 'u7', 'Cipó', 'spirit', 77),
    makePlayer(r, 'u8', 'Zeta', 'anticarry', 76),
    makePlayer(r, 'u9', 'Bruxo', 'controle', 75),
    makePlayer(r, 'u10', 'Vulcan', 'carry', 74),
    makePlayer(r, 'u11', 'Kaori', 'suporte', 72),
    makePlayer(r, 'u12', 'Nexus', 'flex', 71),
  ];
  return [
    mk('u1', '1worst', 'carry', [95, 80, 76, 84, 80, 95], ['vyper', 'lady-geist', 'wraith'], 0, {
      source: SRC, stats: {
        vyper: { games: 22, winRate: 86 }, wraith: { games: 18, winRate: 78 }, 'lady-geist': { games: 18, winRate: 94 },
        seven: { games: 9, winRate: 89 }, warden: { games: 8, winRate: 50 }, haze: { games: 7, winRate: 100 },
        venator: { games: 3, winRate: 100 }, ivy: { games: 3, winRate: 67 },
      },
    }),
    mk('u2', 'Machine', 'suporte', [85, 83, 84, 84, 85, 90], ['paige', 'nurse-harrow', 'viscous'], 3, {
      source: SRC, stats: {
        paige: { games: 20, winRate: 95 }, 'nurse-harrow': { games: 7, winRate: 71 }, viscous: { games: 5, winRate: 80 },
      },
    }),
    mk('u3', 'Sniper', 'flex', [94, 85, 75, 96, 87, 86], ['pocket', 'grey-talon', 'yamato'], 0),
    ...rest,
  ];
}

const NAMES = [
  'Raio', 'Jaguar', 'Sombra', 'Falcão', 'Tempestade', 'Onça', 'Caipora', 'Lobato',
  'Cangaceiro', 'Pitbull', 'Fênix', 'Mandacaru', 'Trovão', 'Ágata', 'Pantera', 'Gavião',
  'Curupira', 'Bandeira', 'Xavante', 'Cobra', 'Neblina', 'Quartzo', 'Dragão', 'Zênite',
  'Iguana', 'Mocó', 'Samurai', 'Orion', 'Vesúvio', 'Nômade', 'Baleia', 'Tucano',
  'Piranha', 'Capivara', 'Boto', 'Saci', 'Jabuti', 'Tamanduá', 'Arara', 'Sucuri',
  'Mosquito', 'Pirata', 'Capitão', 'Rodízio', 'Pitu', 'Berimbau', 'Frevo', 'Axé',
  'Tapioca', 'Cuscuz', 'Pamonha', 'Baião', 'Xote', 'Forró', 'Maracatu', 'Carimbó',
  'Lambada', 'Siriri', 'Jongo', 'Coco', 'Choro', 'Samba',
];

const AI_TEAMS: { id: string; name: string; tag: string; color: string; level: number }[] = [
  { id: 'sertao', name: 'Sertão Gaming', tag: 'SRT', color: '#84cc16', level: 82 },
  { id: 'pampa', name: 'Pampa Esports', tag: 'PMP', color: '#16a34a', level: 79 },
  { id: 'amazonia', name: 'Amazônia Five', tag: 'AMZ', color: '#059669', level: 77 },
  { id: 'carioca', name: 'Carioca Core', tag: 'CRC', color: '#0ea5e9', level: 80 },
  { id: 'paulista', name: 'Paulista Prime', tag: 'PLP', color: '#dc2626', level: 83 },
  { id: 'mineiros', name: 'Mineiros Mind', tag: 'MNM', color: '#a855f7', level: 76 },
  { id: 'nordeste', name: 'Nordeste United', tag: 'NDU', color: '#ef4444', level: 78 },
];

const ROLE_CYCLE: Role[] = [
  'carry', 'anticarry', 'spirit', 'suporte', 'tanque', 'iniciador', 'controle', 'carry',
];

export const USER_TEAM_ID = 'cangaco';

export function buildTeams(): Team[] {
  const user: Team = {
    id: USER_TEAM_ID, name: 'Cangaço Esports', tag: 'CNG', color: '#f59e0b', squad: userSquad(),
  };
  const bots = AI_TEAMS.map((t, ti): Team => {
    const r = mulberry32(hashSeed(t.id));
    const names = shuffle(r, NAMES).slice(ti * 0, 8);
    return {
      id: t.id, name: t.name, tag: t.tag, color: t.color,
      squad: ROLE_CYCLE.map((role, i) =>
        makePlayer(r, `${t.id}-${i}`, `${names[i]}`, role, t.level + Math.round(r() * 6 - 3)),
      ),
    };
  });
  return [user, ...bots];
}

export function buildMarket(seed: string): Player[] {
  const r = mulberry32(hashSeed(seed));
  const names = shuffle(r, NAMES);
  return Array.from({ length: 14 }, (_, i) => {
    const role = pick(r, ROLE_CYCLE);
    return makePlayer(r, `m-${seed}-${i}`, `${names[i]}${i % 3 === 0 ? ' Jr' : ''}`, role, 66 + Math.floor(r() * 18));
  });
}

export const heroName = (id: string) => HEROES.find((h) => h.id === id)?.name ?? id;
