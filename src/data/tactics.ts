import { hashSeed } from '../lib/rng';

/** Modificadores aplicados pela simulação da partida. Escalas: -1…1 (exceto souls/early/late, ~1). */
export interface TacticMods {
  fight: number; // disposição para lutas de equipe
  push: number; // pressão nas lanes / derrubar prédios
  obj: number; // Mid Boss e Urna de Almas
  gank: number; // rotações e emboscadas
  souls: number; // multiplicador de almas no farm
  early: number; // multiplicador de força até ~18 min
  late: number; // multiplicador de força depois
}

export interface Tactic {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  pros: string;
  cons: string;
  mods: TacticMods;
}

const base: TacticMods = { fight: 0, push: 0, obj: 0, gank: 0, souls: 1, early: 1, late: 1 };

export const NEUTRAL_MODS: TacticMods = base;

export const TACTICS: Tactic[] = [
  {
    id: 'equilibrado', name: 'Equilibrado', icon: '⚖️',
    blurb: 'Joga conforme o mapa pede: farm nas lanes, luta quando há vantagem.',
    pros: 'Sem fraquezas claras', cons: 'Sem pico de força', mods: base,
  },
  {
    id: 'agressivo', name: 'Agressivo', icon: '🔥',
    blurb: 'Força lutas cedo, empurra lanes e derruba Guardiões o quanto antes.',
    pros: 'Fortíssimo no early e nas lutas', cons: 'Menos almas; fraco se o jogo se arrastar',
    mods: { ...base, fight: 0.6, push: 0.7, gank: 0.4, souls: 0.95, early: 1.03, late: 0.98 },
  },
  {
    id: 'passivo', name: 'Passivo', icon: '🛡️',
    blurb: 'Foca em farm seguro, evita lutas arriscadas e pune erros do rival.',
    pros: 'Muitas almas, poucas mortes', cons: 'Lento para pressionar prédios',
    mods: { ...base, fight: -0.3, push: -0.6, obj: 0.2, gank: -0.5, souls: 1.15, early: 0.98, late: 1.03 },
  },
  {
    id: 'rotacao', name: 'Rotação / Gank', icon: '🥷',
    blurb: 'Heróis rotacionam entre lanes para emboscar alvos isolados.',
    pros: 'Abates rápidos e lanes instáveis para o rival', cons: 'Exposto se a emboscada falhar',
    mods: { ...base, gank: 1, fight: 0.2, push: 0.1, souls: 0.95, early: 1.02 },
  },
  {
    id: 'objetivos', name: 'Foco em objetivos', icon: '👹',
    blurb: 'Prioriza Mid Boss, Urna de Almas e Rejuvenescedor antes de lutar.',
    pros: 'Controle dos buffs e do ritmo do jogo', cons: 'Abre mão de pressão nas lanes',
    mods: { ...base, obj: 1, push: 0.2, souls: 1.05 },
  },
  {
    id: 'escalonamento', name: 'Escalonamento', icon: '📈',
    blurb: 'Aguenta o começo, junta almas e vira o jogo no fim.',
    pros: 'Domina o late game', cons: 'Sofre nos primeiros minutos',
    mods: { ...base, push: -0.2, souls: 1.2, early: 0.95, late: 1.06 },
  },
  {
    id: 'split', name: 'Split Push', icon: '🗡️',
    blurb: 'Pressiona várias lanes ao mesmo tempo e foge das lutas diretas.',
    pros: 'Derruba prédios rápido', cons: 'Perde lutas de equipe e objetivos',
    mods: { ...base, push: 0.9, fight: -0.6, gank: -0.2, obj: -0.3 },
  },
];

export const TACTIC_MAP: Record<string, Tactic> = Object.fromEntries(TACTICS.map((t) => [t.id, t]));
export const DEFAULT_TACTIC = 'equilibrado';

export const modsOf = (id: string | undefined): TacticMods => (TACTIC_MAP[id ?? DEFAULT_TACTIC] ?? TACTICS[0]!).mods;

/** Estilo de cada rival: fixo por time (varia entre as 7 opções). */
export const opponentTactic = (teamId: string): Tactic => TACTICS[hashSeed(`style-${teamId}`) % TACTICS.length]!;
