import type { Lane, Role } from '../types';

export interface RoleInfo {
  label: string;
  short: string;
  color: string;
  desc: string;
}

export const ROLES: Record<Role, RoleInfo> = {
  carry: {
    label: 'Carry',
    short: 'CAR',
    color: '#f59e0b',
    desc: 'Dano contínuo de arma (gun carry). Escala com itens de armas e farm.',
  },
  anticarry: {
    label: 'Anti-Carry',
    short: 'ANT',
    color: '#ef4444',
    desc: 'Assassino/caçador: persegue e elimina carries e alvos frágeis.',
  },
  spirit: {
    label: 'Spirit Carry',
    short: 'SPI',
    color: '#a855f7',
    desc: 'Dano de habilidades (Spirit Power). Rajadas de magia e ultimates decisivos.',
  },
  suporte: {
    label: 'Suporte',
    short: 'SUP',
    color: '#34d399',
    desc: 'Cura, escudos e buffs. Mantém o time vivo nas lutas.',
  },
  tanque: {
    label: 'Tanque',
    short: 'TNK',
    color: '#60a5fa',
    desc: 'Linha de frente. Absorve dano e protege a equipe.',
  },
  iniciador: {
    label: 'Iniciador',
    short: 'INI',
    color: '#fb923c',
    desc: 'Abre as lutas com mobilidade e engage em área.',
  },
  controle: {
    label: 'Controle',
    short: 'CTR',
    color: '#22d3ee',
    desc: 'Disruptor: stuns, silêncios, lentidão e controle de espaço.',
  },
};

export const ROLE_ORDER: Role[] = [
  'carry',
  'anticarry',
  'spirit',
  'suporte',
  'tanque',
  'iniciador',
  'controle',
];

export const LANES: Record<Lane, { label: string; color: string }> = {
  amarelo: { label: 'Amarela', color: '#facc15' },
  azul: { label: 'Azul', color: '#38bdf8' },
  verde: { label: 'Verde', color: '#4ade80' },
};
