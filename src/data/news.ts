import { HEROES } from './heroes';
import { USER_TEAM_ID } from './players';
import { hashSeed, mulberry32, pick, type Rng } from '../lib/rng';
import { computeTable, opponentOf, nextFixture, teamById, TOTAL_ROUNDS, type GameState } from '../state/game';
import type { Player } from '../types';

export type NewsKind = 'jogador' | 'campeonato' | 'mercado';

export interface NewsItem {
  id: string;
  kind: NewsKind;
  title: string;
  text: string;
  when: string; // "há 2 h"
}

/** Primeira rodada da temporada (as demais saem de 7 em 7 dias). */
export const SEASON_START = new Date(2026, 10, 22);

export const roundDate = (round: number): Date => {
  const d = new Date(SEASON_START);
  d.setDate(d.getDate() + (round - 1) * 7);
  return d;
};

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');

const heroName = (r: Rng) => pick(r, HEROES).name;
const when = (r: Rng) => pick(r, ['há 1 h', 'há 3 h', 'há 5 h', 'ontem', 'há 2 dias', 'há 3 dias']);

/** Notícias inventadas, mas ligadas ao estado do jogo (elenco, tabela, rival, resultados). */
export function buildNews(s: GameState): NewsItem[] {
  const r = mulberry32(hashSeed(`news-${s.round}`));
  const me = teamById(s, USER_TEAM_ID);
  const fx = nextFixture(s);
  const opp = fx ? teamById(s, opponentOf(fx)) : null;
  const table = computeTable(s);
  const leader = teamById(s, table[0]!.teamId);
  const star = [...me.squad].sort((a, b) => b.attrs.mir - a.attrs.mir)[0] as Player;
  const bySkill = [...me.squad].sort((a, b) => b.attrs.mir + b.attrs.con - (a.attrs.mir + a.attrs.con));
  const rookie = [...bySkill.slice(3)].sort((a, b) => a.age - b.age)[0] ?? (bySkill[bySkill.length - 1] as Player);
  const rivalStar = opp ? [...opp.squad].sort((a, b) => b.attrs.mir - a.attrs.mir)[0] : undefined;
  const last = s.history[s.history.length - 1];
  const items: NewsItem[] = [];
  const add = (kind: NewsKind, title: string, text: string) =>
    items.push({ id: `${kind}-${items.length}`, kind, title, text, when: when(r) });

  if (last) {
    const o = teamById(s, last.oppId);
    add(
      'campeonato',
      last.won ? `${me.name} vence ${o.name} por ${last.kills[0]}–${last.kills[1]}` : `${o.name} derruba ${me.name} por ${last.kills[1]}–${last.kills[0]}`,
      last.won
        ? 'A torcida foi à loucura: o time controlou as lanes e fechou o Patrono sem sustos.'
        : 'Treinador admite falhas no draft e promete mudanças para a próxima rodada.',
    );
  }
  if (opp) {
    add('campeonato', `Rodada ${s.round}: ${me.name} x ${opp.name}`, `O confronto abre a rodada em ${fmtDate(roundDate(s.round))}. ${opp.name} chega com OVR ${Math.round(opp.squad.reduce((a, p) => a + (p.attrs.mir + p.attrs.con) / 2, 0) / opp.squad.length)} de média.`);
  }
  if (table[0]!.pts > 0) {
    add('campeonato', `${leader.name} lidera a liga`, `Com ${table[0]!.pts} pontos, ${leader.name} abre ${table[0]!.pts - (table[1]?.pts ?? 0)} de vantagem na ponta. Faltam ${Math.max(0, TOTAL_ROUNDS - s.round + 1)} rodadas.`);
  } else {
    add('campeonato', 'Liga Brasileira de Deadlock começa em breve', `Oito equipes disputam ${TOTAL_ROUNDS} rodadas. ${me.name} estreia em ${fmtDate(roundDate(1))} e a final da liga será em ${fmtDate(roundDate(TOTAL_ROUNDS))}.`);
  }
  add('campeonato', 'Liga Brasileira de Deadlock confirma transmissão ao vivo', 'Todas as partidas da temporada terão narração em português e câmera no mapa inteiro.');
  add('campeonato', 'Meta do patch: heróis de controle em alta', `${heroName(r)}, ${heroName(r)} e ${heroName(r)} lideram o pick rate na rodada. Bans em ${heroName(r)} aumentaram 18%.`);

  add('jogador', `${star.name} em chamas nos treinos`, `A mira de ${star.name} chegou a ${star.attrs.mir} e o técnico já fala em recorde de abates pelo ${me.name}.`);
  add('jogador', `${rookie.name}, ${rookie.age} anos, pede chance no time titular`, `A promessa de ${me.name} diz estar pronta e treina ${heroName(r)} todos os dias.`);
  if (rivalStar && opp) add('jogador', `${rivalStar.name} é o jogador a ser parado`, `O destaque do ${opp.name} tem ${rivalStar.attrs.mir} de mira e costuma abrir as lutas com ${heroName(r)}.`);
  const other = pick(r, me.squad);
  add('jogador', `${other.name} testa novo herói no scrim`, `Fontes do ${me.name} dizem que ${other.name} treinou ${heroName(r)} por horas — pode surpreender no draft.`);

  const cheap = s.market[0];
  add('mercado', cheap ? `${cheap.name} está livre no mercado` : 'Mercado esquenta', cheap ? `Jogador de ${cheap.role === 'flex' ? 'função flex' : cheap.role} pede ${Math.round(cheap.price / 1000)} mil. Vários clubes monitoram.` : 'Clubes aguardam a próxima janela para novas contratações.');
  add('mercado', `Patrocinador renova com ${me.name}`, 'O contrato de patrocínio foi estendido até o fim da temporada, com bônus por títulos.');

  // embaralha de leve mantendo variedade
  return items.sort(() => r() - 0.5).slice(0, 10);
}
