import type { Hero, Role } from '../types';

const h = (
  id: string,
  name: string,
  roles: Role[],
  power: number,
  color: string,
  color2: string,
  ult: string,
  blurb: string,
): Hero => ({ id, name, roles, power, color, color2, ult, blurb });

/**
 * Roster de heróis. Funções e força de meta são editáveis aqui —
 * o jogo muda de patch em patch, então ajuste livremente.
 */
export const HEROES: Hero[] = [
  h('abrams', 'Abrams', ['tanque', 'iniciador'], 1.02, '#b45309', '#451a03', 'Seismic Impact', 'Brutamontes que bebe vida dos inimigos e abre lutas com impacto sísmico.'),
  h('apollo', 'Apollo', ['carry', 'anticarry'], 1.0, '#ca8a04', '#422006', 'Itani Lo Sahn', 'Duelista aéreo que decide lutas com golpes precisos.'),
  h('bebop', 'Bebop', ['controle', 'iniciador'], 1.01, '#db2777', '#500724', 'Hyper Beam', 'Gancho, bombas e um raio devastador para controlar o fluxo da luta.'),
  h('billy', 'Billy', ['anticarry', 'tanque'], 1.03, '#dc2626', '#450a0a', 'Rage', 'Lutador corpo a corpo, resistente e extremamente agressivo.'),
  h('calico', 'Calico', ['anticarry', 'spirit'], 1.0, '#7c3aed', '#2e1065', 'Ava', 'Felina assassina que persegue alvos isolados.'),
  h('celeste', 'Celeste', ['suporte', 'spirit'], 0.99, '#38bdf8', '#0c4a6e', 'Celestial Burst', 'Maga de luz que cura e queima inimigos.'),
  h('drifter', 'Drifter', ['anticarry', 'controle'], 1.01, '#0f766e', '#042f2e', 'Eternal Night', 'Caçador sombrio que paralisa e executa alvos isolados.'),
  h('dynamo', 'Dynamo', ['suporte', 'controle'], 1.02, '#0891b2', '#083344', 'Singularity', 'Cura em área e Singularidade que prende a equipe inimiga.'),
  h('graves', 'Graves', ['spirit', 'controle'], 0.99, '#6d28d9', '#1e1b4b', 'Borrowed Time', 'Necromante que invoca ajudantes e controla o espaço.'),
  h('grey-talon', 'Grey Talon', ['carry'], 1.0, '#65a30d', '#1a2e05', 'Guided Owl', 'Arqueiro de longo alcance com coruja teleguiada.'),
  h('haze', 'Haze', ['anticarry', 'carry'], 1.04, '#9333ea', '#3b0764', 'Bullet Dance', 'Assassina de rajadas que adormece e elimina.'),
  h('holliday', 'Holliday', ['carry'], 0.99, '#d97706', '#451a03', 'Spirit Lasso', 'Pistoleira com laço espiritual e mira afiada.'),
  h('infernus', 'Infernus', ['carry', 'spirit'], 1.01, '#ea580c', '#431407', 'Concussive Combustion', 'Piromaníaco que queima tudo em volta.'),
  h('ivy', 'Ivy', ['suporte'], 0.99, '#16a34a', '#052e16', 'Air Drop', 'Suporte móvel com bombas de cura e proteção.'),
  h('kelvin', 'Kelvin', ['suporte', 'spirit'], 1.0, '#0ea5e9', '#082f49', 'Arctic Beam', 'Cientista do gelo; pista de gelo e raio ártico.'),
  h('lady-geist', 'Lady Geist', ['spirit', 'anticarry'], 1.02, '#e11d48', '#4c0519', 'Soul Exchange', 'Troca vida por poder e sufoca alvos com dano espiritual.'),
  h('lash', 'Lash', ['iniciador'], 1.03, '#f97316', '#431407', 'Death Slam', 'Iniciador aéreo com gancho que derruba a equipe inimiga.'),
  h('mcginnis', 'McGinnis', ['carry', 'controle'], 1.0, '#ca8a04', '#3f2a05', 'Spectral Wall', 'Engenheira de torretas que domina um ponto do mapa.'),
  h('mina', 'Mina', ['spirit', 'anticarry'], 1.02, '#be123c', '#4c0519', 'Love Bites', 'Vampira ágil com dano espiritual explosivo.'),
  h('mirage', 'Mirage', ['spirit', 'carry'], 1.03, '#d97706', '#78350f', 'Djinn\'s Mark', 'Mago de furacões; rotaciona o mapa todo com o teleporte.'),
  h('mo-krill', 'Mo & Krill', ['tanque', 'iniciador'], 0.99, '#a16207', '#3b2504', 'Combo', 'Dupla subterrânea; agarra e segura alvos.'),
  h('nurse-harrow', 'Nurse Harrow', ['suporte', 'spirit'], 1.0, '#34d399', '#064e3b', 'Leech Therapy', 'Médica de métodos duvidosos: sanguessugas que drenam inimigos e curam a equipe.'),
  h('paige', 'Paige', ['suporte', 'spirit'], 0.99, '#c084fc', '#3b0764', 'Rallying Charge', 'Bibliotecária de feitiços que inspira o time.'),
  h('paradox', 'Paradox', ['controle', 'spirit'], 1.0, '#0d9488', '#042f2e', 'Paradoxical Swap', 'Manipula o tempo; troca de lugar com inimigos.'),
  h('pocket', 'Pocket', ['carry', 'anticarry'], 1.04, '#c026d3', '#4a044e', 'Affliction', 'Mágico escorregadio; some e reaparece com dano brutal.'),
  h('rem', 'Rem', ['suporte'], 0.98, '#f472b6', '#500724', 'Naptime', 'Suporte brincalhão que dorme inimigos.'),
  h('seven', 'Seven', ['spirit'], 1.01, '#facc15', '#422006', 'Storm Cloud', 'Tempestade viva; dano em área massivo.'),
  h('shiv', 'Shiv', ['anticarry', 'carry'], 1.01, '#b91c1c', '#450a0a', 'Killing Blow', 'Lutador de lâminas com execução final.'),
  h('silver', 'Silver', ['anticarry', 'tanque'], 0.99, '#94a3b8', '#1e293b', 'Lycan Form', 'Homem-lobo; transforma-se para esmagar.'),
  h('sinclair', 'Sinclair', ['controle', 'spirit'], 1.0, '#7c3aed', '#2e1065', 'Vexing Vortex', 'Mágico de ilusões; silencia e embaralha lutas.'),
  h('venator', 'Venator', ['carry'], 0.99, '#475569', '#0f172a', 'Execution', 'Atirador de elite com tiro de execução.'),
  h('victor', 'Victor', ['tanque', 'spirit'], 1.0, '#65a30d', '#1a2e05', 'Final Experiment', 'Monstro de Frankenstein; absorve e devolve dano.'),
  h('vindicta', 'Vindicta', ['carry', 'anticarry'], 1.01, '#4f46e5', '#1e1b4b', 'Assassinate', 'Atiradora aérea; assassina alvos de qualquer lugar.'),
  h('viscous', 'Viscous', ['controle', 'tanque'], 1.0, '#22c55e', '#052e16', 'Cube', 'Gosma gigante; domina o espaço da luta.'),
  h('vyper', 'Vyper', ['carry', 'anticarry'], 0.98, '#059669', '#022c22', 'Slither', 'Assassina veloz de lâminas e veneno.'),
  h('warden', 'Warden', ['carry', 'tanque'], 1.0, '#1d4ed8', '#172554', 'Last Stand', 'Sargento de armadura pesada; segura posição.'),
  h('wraith', 'Wraith', ['carry'], 1.02, '#9a3412', '#431407', 'Telekinesis', 'Carry das cartas; levanta alvos e castiga com tiros.'),
  h('yamato', 'Yamato', ['anticarry', 'carry'], 1.02, '#dc2626', '#450a0a', 'Shadow Transformation', 'Samurai de lâminas rápidas e golpes de execução.'),
  h('doorman', 'The Doorman', ['controle', 'suporte'], 1.04, '#a16207', '#2a1a05', 'Doorway', 'Controla o espaço com portas e relógios.'),
  h('baba', 'Baba', ['spirit', 'tanque'], 1.0, '#a855f7', '#3b0764', 'Threadsap', 'Bruxa que briga na linha de frente com novelo amaldiçoado que drena o espírito dos inimigos.'),
  h('deadman-danny', 'Deadman Danny', ['carry', 'iniciador'], 1.0, '#f97316', '#431407', 'Rocket Jetpack', 'Vendedor explosivo com lança-foguetes e jetpack para surpreender os alvos.'),
  h('rat-king', 'Rat King', ['tanque', 'controle'], 1.0, '#84cc16', '#1a2e05', 'Swarm of Rats', 'Tanque do esgoto que comanda enxames de ratos e granadas de sucata.'),
  h('solomon', 'Solomon', ['controle', 'spirit'], 1.0, '#64748b', '#0f172a', 'Checkmate', 'Mestre do xadrez que posiciona bispos, cavalos e torres antes do xeque-mate final.'),
  h('violet', 'Violet', ['suporte', 'controle'], 1.0, '#ec4899', '#500724', 'Living Ink', 'Artista ágil: tinta que fortalece aliados e atrapalha inimigos.'),
]

export const HERO_MAP: Record<string, Hero> = Object.fromEntries(
  HEROES.map((x) => [x.id, x]),
);

export const heroesByRole = (role: Role): Hero[] =>
  HEROES.filter((x) => x.roles.includes(role));

/**
 * Retrato do herói, carregado direto do CDN da Deadlock Wiki (hotlink no navegador).
 * Se a imagem falhar, o app cai no gradiente com monograma.
 */
export const heroImageUrl = (h: Hero): string | null => {
  const file = h.name.replace(/ /g, '_').replace(/&/g, '%26');
  return `https://cdn.deadlock.wiki/${file}_card.png`;
};

/**
 * Retrato grande (fundo transparente) usado nos cartões de resultado do DeadChaps:
 * /draft-heroes-portrait/<Nome sem espaços>.webp — "Mo & Krill" vira MoAndKrill.
 */
export const heroPortraitUrl = (h: Hero): string => {
  const file = h.id === 'mo-krill' ? 'MoAndKrill' : h.name.replace(/\s+/g, '');
  return `https://www.deadchaps.gg/draft-heroes-portrait/${file}.webp`;
};

/** Ícone quadrado 128×128 (mesmo enquadramento para todos os heróis) — usado no mapa e nos avatares. */
export const heroIconUrl = (h: Hero): string => {
  const file = h.name.replace(/ /g, '_').replace(/&/g, '%26');
  return `https://cdn.deadlock.wiki/${file}.png`;
};
