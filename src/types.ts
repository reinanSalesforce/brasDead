export type Role =
  | 'carry'
  | 'anticarry'
  | 'spirit'
  | 'suporte'
  | 'tanque'
  | 'iniciador'
  | 'controle';

export type Lane = 'amarelo' | 'azul' | 'verde';
export type Side = 'A' | 'B';

export interface Attrs {
  mir: number; // mira
  mac: number; // macro
  sup: number; // suporte
  mov: number; // movimentação
  pol: number; // pool de heróis
  con: number; // consistência
}

export interface Hero {
  id: string;
  name: string;
  roles: Role[]; // primeiro = função principal
  power: number; // força no meta (~0.96–1.05)
  color: string;
  color2: string;
  ult: string;
  blurb: string;
}

export interface HeroStat {
  games: number;
  winRate: number; // 0–100
}

export interface Player {
  id: string;
  name: string;
  age: number;
  attrs: Attrs;
  role: Role | 'flex';
  pool: string[]; // ids de heróis de assinatura (mais jogados)
  /** partidas e vitórias por herói (dados reais do DeadChaps quando disponíveis) */
  heroStats?: Record<string, HeroStat>;
  /** origem dos dados reais, se houver */
  source?: string;
  price: number;
  trend: number;
}

export interface SlotDef {
  role: Role;
  lane: Lane;
}

export interface Formation {
  id: string;
  name: string;
  desc: string;
  slots: SlotDef[];
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  color: string;
  squad: Player[];
}

export interface TableRow {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  pts: number;
}

export interface Fixture {
  round: number;
  home: string;
  away: string;
  result?: { winner: string };
}
