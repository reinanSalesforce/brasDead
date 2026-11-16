import { LANES } from '../data/roles';
import type { Lane, Role, Side } from '../types';
import { NEUTRAL_MODS, type TacticMods } from '../data/tactics';
import { baseXY, laneXY } from './mapgeo';
import { clamp, pick, type Rng } from './rng';

export interface Unit {
  id: string;
  side: Side;
  player: string;
  heroId: string;
  hero: string;
  ult: string;
  role: Role;
  lane: Lane;
  rating: number;
}

type LaneFlags = Record<Lane, { A: boolean; B: boolean }>;
export interface ObjState {
  guardian: LaneFlags;
  walker: LaneFlags;
  shrine: { A: number; B: number };
  patron: { A: number; B: number }; // 3 = intacto
  midboss: 'vivo' | Side;
}

export type EventKind =
  | 'start' | 'farm' | 'trade' | 'kill' | 'gank' | 'urn' | 'guardian' | 'walker'
  | 'midboss' | 'teamfight' | 'shrine' | 'patron' | 'end';

export interface SimEvent {
  idx: number;
  min: number;
  kind: EventKind;
  title: string;
  text: string;
  focus: string[];
  pos: Record<string, [number, number]>;
  dead: string[];
  kills: { A: number; B: number };
  souls: { A: number; B: number };
  obj: ObjState;
  side?: Side; // quem protagonizou
}

export interface UnitStat { kills: number; deaths: number; souls: number }
export interface SimResult {
  events: SimEvent[];
  winner: Side;
  stats: Record<string, UnitStat>;
  durationMin: number;
}

const laneName = (l: Lane) => LANES[l].label.toLowerCase();
const nm = (u: Unit) => `${u.player} (${u.hero})`;
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const other = (s: Side): Side => (s === 'A' ? 'B' : 'A');

const KILL_WEIGHT: Record<Role, number> = {
  carry: 3, anticarry: 3, spirit: 2.6, controle: 1.4, iniciador: 1.4, suporte: 0.8, tanque: 0.8,
};

export function simulateMatch(
  unitsA: Unit[],
  unitsB: Unit[],
  rng: Rng,
  names: { A: string; B: string },
  mods: { A: TacticMods; B: TacticMods } = { A: NEUTRAL_MODS, B: NEUTRAL_MODS },
): SimResult {
  const mean = (k: 'push' | 'obj' | 'gank') => (mods.A[k] + mods.B[k]) / 2;
  const units = [...unitsA, ...unitsB];
  const byId = new Map(units.map((u) => [u.id, u]));
  const stats: Record<string, UnitStat> = Object.fromEntries(
    units.map((u) => [u.id, { kills: 0, deaths: 0, souls: 0 }]),
  );
  const obj: ObjState = {
    guardian: { amarelo: { A: true, B: true }, azul: { A: true, B: true }, verde: { A: true, B: true } },
    walker: { amarelo: { A: true, B: true }, azul: { A: true, B: true }, verde: { A: true, B: true } },
    shrine: { A: 2, B: 2 },
    patron: { A: 3, B: 3 },
    midboss: 'vivo',
  };
  const front: Record<Lane, number> = { amarelo: 0.5, azul: 0.5, verde: 0.5 };
  const kills = { A: 0, B: 0 };
  const souls = { A: 0, B: 0 };
  const events: SimEvent[] = [];
  let dead = new Set<string>();
  let minute = 0;
  let urns = 0;
  let winner: Side | null = null;

  const strength = (s: Side, ids?: string[]) => {
    const list = (s === 'A' ? unitsA : unitsB).filter(
      (u) => !dead.has(u.id) && (!ids || ids.includes(u.id)),
    );
    const stage = minute < 18 ? mods[s].early : mods[s].late;
    return list.reduce((a, u) => a + u.rating * stage, 0);
  };
  const lead = () => clamp((souls.A - souls.B) / 12000, -0.9, 0.9); // vantagem de almas (limitada: evita bola de neve)

  const inLane = (s: Side, l: Lane) =>
    (s === 'A' ? unitsA : unitsB).filter((u) => u.lane === l && !dead.has(u.id));
  const alive = (s: Side) => (s === 'A' ? unitsA : unitsB).filter((u) => !dead.has(u.id));

  const give = (s: Side, n: number, ids: Unit[]) => {
    souls[s] += n;
    ids.forEach((u) => (stats[u.id]!.souls += Math.round(n / Math.max(1, ids.length))));
  };

  const killUnit = (killer: Unit, victim: Unit) => {
    dead.add(victim.id);
    kills[killer.side]++;
    stats[killer.id]!.kills++;
    stats[victim.id]!.deaths++;
    give(killer.side, 250 + Math.round(rng() * 150), [killer]);
  };

  const pickWeighted = (list: Unit[]): Unit => {
    const tot = list.reduce((a, u) => a + KILL_WEIGHT[u.role], 0);
    let r = rng() * tot;
    for (const u of list) {
      r -= KILL_WEIGHT[u.role];
      if (r <= 0) return u;
    }
    return list[list.length - 1] as Unit;
  };

  /** posições de todas as unidades; `override` leva um grupo a um ponto fixo */
  const positions = (
    override?: { ids: string[]; at: (u: Unit, i: number) => [number, number] },
  ): Record<string, [number, number]> => {
    const out: Record<string, [number, number]> = {};
    const lanes: Lane[] = ['amarelo', 'azul', 'verde'];
    for (const s of ['A', 'B'] as Side[]) {
      const list = s === 'A' ? unitsA : unitsB;
      let deadIdx = 0;
      lanes.forEach((l) => {
        const here = list.filter((u) => u.lane === l);
        here.forEach((u, i) => {
          if (dead.has(u.id)) {
            out[u.id] = baseXY(s, deadIdx++);
            return;
          }
          const off = s === 'A' ? -0.06 : 0.06;
          const [x, y] = laneXY(l, front[l] + off + (i - (here.length - 1) / 2) * 0.035);
          out[u.id] = [x + (i - (here.length - 1) / 2) * 9, y];
        });
      });
    }
    if (override) {
      override.ids.forEach((id, i) => {
        const u = byId.get(id)!;
        if (!dead.has(id)) out[id] = override.at(u, i);
      });
    }
    return out;
  };

  const snap = (
    kind: EventKind, title: string, text: string, focus: Unit[], side?: Side,
    override?: Parameters<typeof positions>[0],
  ) => {
    events.push({
      idx: events.length, min: Math.round(minute * 10) / 10, kind, title, text,
      focus: focus.map((u) => u.id), pos: positions(override), dead: [...dead],
      kills: { ...kills }, souls: { ...souls },
      obj: JSON.parse(JSON.stringify(obj)) as ObjState, side,
    });
  };

  const fightAt = (l: Lane, t: number) => (u: Unit, i: number): [number, number] => {
    const [x, y] = laneXY(l, t + (u.side === 'A' ? -0.03 : 0.03));
    return [x + (i % 3) * 9 - 9, y + (i % 2) * 7];
  };
  const centerAt = (u: Unit, i: number): [number, number] => [
    310 + (u.side === 'A' ? -22 : 22) + (i % 3) * 9, 290 + (u.side === 'A' ? 12 : -12) + (i % 4) * 5,
  ];

  // ---------- abertura ----------
  snap('start', 'Início de partida',
    `${names.A} e ${names.B} descem para as lanes. Os 12 heróis saem das bases rumo às lanes amarela, azul e verde.`, []);
  minute = 1;
  snap('start', 'Chegada nas lanes',
    'Primeiras waves de tropas colidem. Os jogadores começam a conectar as orbes de almas.', []);

  // ---------- eventos ----------
  const duel = (l: Lane): { a: Unit; b: Unit; winner: Side } | null => {
    const a = inLane('A', l);
    const b = inLane('B', l);
    if (!a.length || !b.length) return null;
    const p = sigmoid((strength('A', a.map((u) => u.id)) / a.length -
      strength('B', b.map((u) => u.id)) / b.length) / 12 + lead());
    const wA = rng() < p;
    return { a: pickWeighted(a), b: pickWeighted(b), winner: wA ? 'A' : 'B' };
  };

  const shift = (l: Lane, s: Side, amt: number) => {
    front[l] = clamp(front[l] + (s === 'A' ? amt : -amt), 0.04, 0.96);
  };

  const teamfight = (where: 'center' | Lane, t: number, bonus: Side | null, title: string): Side => {
    const sA = strength('A'), sB = strength('B');
    const p = sigmoid((sA - sB) / 55 + (mods.A.fight - mods.B.fight) * 0.3 + lead() * 1.0 + (bonus === 'A' ? 0.5 : bonus === 'B' ? -0.5 : 0));
    const win: Side = rng() < p ? 'A' : 'B';
    const lose = other(win);
    const losers = alive(lose);
    const winners = alive(win);
    const nLoss = Math.min(losers.length, 1 + Math.floor(rng() * 3)); // 1–3 baixas
    const nWinLoss = Math.min(winners.length - 1, rng() < 0.55 ? 1 : 0);
    const fallen: string[] = [];
    const killers: Unit[] = [];
    for (let i = 0; i < nLoss; i++) {
      const pool = losers.filter((u) => !dead.has(u.id));
      if (!pool.length) break;
      const v = pick(rng, pool);
      const k = pickWeighted(winners.filter((u) => !dead.has(u.id)));
      killUnit(k, v);
      fallen.push(nm(v));
      killers.push(k);
    }
    for (let i = 0; i < nWinLoss; i++) {
      const v = winners.filter((u) => !dead.has(u.id))[Math.floor(rng() * winners.length)];
      const k = pickWeighted(alive(lose));
      if (v && k) killUnit(k, v);
    }
    give(win, 900 + Math.round(rng() * 500), alive(win));
    const opener = pick(rng, winners.filter((u) => u.role === 'iniciador' || u.role === 'tanque').concat(winners));
    const star = killers.find((k) => k.id !== opener.id) ?? killers[0] ?? pickWeighted(alive(win));
    const text =
      `${nm(opener)} abre a luta com ${opener.ult}. ${nm(star)} aproveita o caos e ${killers.length > 1 ? 'lidera a limpa' : 'fecha a conta'}: ` +
      `${fallen.length ? fallen.join(', ') + (fallen.length > 1 ? ' caem' : ' cai') : 'ninguém cai'}. ${names[win]} vence o confronto por ${kills[win]}–${kills[lose]} no acumulado.`;
    const ids = [...alive('A'), ...alive('B'), ...[...dead].map((i) => byId.get(i)!)].map((u) => u.id);
    snap('teamfight', title, text, [opener, star], win, {
      ids,
      at: where === 'center' ? centerAt : fightAt(where, t),
    });
    return win;
  };

  let guard = 0;
  while (!winner && guard++ < 90) {
    minute += 0.8 + rng() * 1.5;
    dead = new Set(); // respawn entre eventos
    const late = minute > 18 || guard > 34;
    const lanes: Lane[] = ['amarelo', 'azul', 'verde'];
    // fim de jogo: o time com vantagem de almas aumenta a pressão em todas as lanes
    if (late) lanes.forEach((x) => shift(x, souls.A >= souls.B ? 'A' : 'B', 0.05));

    // prédios disponíveis para empurrar
    const pushable: { s: Side; l: Lane; what: 'guardian' | 'walker' | 'base' }[] = [];
    for (const l of lanes) {
      const t = front[l];
      if (t >= 0.66 && obj.guardian[l].B) pushable.push({ s: 'A', l, what: 'guardian' });
      else if (t >= 0.78 && !obj.guardian[l].B && obj.walker[l].B) pushable.push({ s: 'A', l, what: 'walker' });
      else if (t >= 0.78 && !obj.guardian[l].B && !obj.walker[l].B) pushable.push({ s: 'A', l, what: 'base' });
      if (t <= 0.34 && obj.guardian[l].A) pushable.push({ s: 'B', l, what: 'guardian' });
      else if (t <= 0.22 && !obj.guardian[l].A && obj.walker[l].A) pushable.push({ s: 'B', l, what: 'walker' });
      else if (t <= 0.22 && !obj.guardian[l].A && !obj.walker[l].A) pushable.push({ s: 'B', l, what: 'base' });
    }

    const r = rng();
    const l = pick(rng, lanes);

    // 1) empurrão decisivo
    if (pushable.length && (r < 0.55 + 0.18 * mean('push') || late)) {
      const target = pick(rng, pushable);
      const atk = target.s, def = other(atk);
      if (target.what === 'base') {
        const win = teamfight(target.l, atk === 'A' ? 0.93 : 0.07, atk, `Ataque ao Patrono de ${names[def]}`);
        if (win === atk) {
          if (obj.shrine[def] > 0) {
            obj.shrine[def]--;
            snap('shrine', 'Santuário destruído',
              `${names[atk]} derruba um Santuário de ${names[def]}. Restam ${obj.shrine[def]}. O Patrono fica exposto.`, [pickWeighted(alive(atk))], atk);
          } else {
            obj.patron[def]--;
            if (obj.patron[def] <= 0) {
              winner = atk;
              snap('end', `Patrono de ${names[def]} cai!`,
                `A última fase do Patrono desaba. ${names[atk]} vence a partida com ${kills[atk]} abates e ${(souls[atk] / 1000).toFixed(1)}k de almas.`,
                [pickWeighted(alive(atk))], atk);
            } else {
              snap('patron', 'Patrono ferido',
                `${names[atk]} derruba uma fase do Patrono de ${names[def]} (${obj.patron[def]} restante${obj.patron[def] > 1 ? 's' : ''}).`,
                [pickWeighted(alive(atk))], atk);
            }
          }
        } else {
          shift(target.l, def, 0.2);
        }
        continue;
      }
      // guardião ou walker
      const fightT = target.what === 'guardian' ? (atk === 'A' ? 0.7 : 0.3) : (atk === 'A' ? 0.85 : 0.15);
      const win = teamfight(target.l, fightT, atk, `Luta na lane ${laneName(target.l)}`);
      if (win === atk) {
        const hero = pickWeighted(alive(atk));
        if (target.what === 'guardian') {
          obj.guardian[target.l][def] = false;
          give(atk, 1200, alive(atk));
          snap('guardian', `Guardião cai na lane ${laneName(target.l)}`,
            `${nm(hero)} derruba o Guardião de ${names[def]} na lane ${laneName(target.l)}. Equipe de ${names[atk]} embolsa +1.2k de almas e avança.`, [hero], atk);
        } else {
          obj.walker[target.l][def] = false;
          give(atk, 1800, alive(atk));
          snap('walker', `Walker destruído na lane ${laneName(target.l)}`,
            `${names[atk]} derruba o Walker na lane ${laneName(target.l)}. A rota até a base de ${names[def]} fica aberta.`, [hero], atk);
        }
        shift(target.l, atk, 0.1);
      } else {
        shift(target.l, def, 0.18);
        shift(target.l, atk, -0.0);
      }
      continue;
    }

    // 2) Mid Boss
    if (minute > 13 && obj.midboss === 'vivo' && r < 0.72 + 0.2 * mean('obj')) {
      const win = teamfight('center', 0, null, 'Mid Boss');
      const hero = pickWeighted(alive(win));
      obj.midboss = win;
      give(win, 1500, alive(win));
      lanes.forEach((x) => shift(x, win, 0.1));
      snap('midboss', 'Mid Boss derrubado',
        `${names[win]} abate o Mid Boss e ${nm(hero)} coleta o Rejuvenescedor. Todas as lanes ganham pressão e a próxima luta chega com buff.`, [hero], win);
      continue;
    }

    // 3) Urna de Almas
    if (minute > 6 && urns < Math.floor(minute / 8) && r < 0.8 + 0.12 * mean('obj')) {
      urns++;
      const win: Side = rng() < sigmoid((strength('A') / alive('A').length - strength('B') / alive('B').length) / 12 + lead()) ? 'A' : 'B';
      const hero = pickWeighted(alive(win));
      give(win, 1000, [hero]);
      shift(l, win, 0.07);
      snap('urn', 'Urna de Almas',
        `A Urna de Almas surge. ${nm(hero)} pega a urna e a entrega na lane ${laneName(l)} sob pressão — +1k de almas para ${names[win]}.`, [hero], win);
      continue;
    }

    // 4) eventos de lane
    const d = duel(l);
    if (!d) continue;
    const winU = d.winner === 'A' ? d.a : d.b;
    const loseU = d.winner === 'A' ? d.b : d.a;
    const rr = rng();
    if (rr < 0.28) {
      give(winU.side, Math.round(450 * mods[winU.side].souls), [winU]);
      shift(l, winU.side, 0.06);
      snap('farm', `Farm na lane ${laneName(l)}`,
        pick(rng, [
          `${nm(winU)} limpa a wave inteira na lane ${laneName(l)} e converte as orbes: +450 almas.`,
          `${nm(winU)} nega as orbes de ${nm(loseU)} e estabiliza a lane ${laneName(l)} para ${names[winU.side]}.`,
        ]), [winU], winU.side, { ids: [winU.id], at: (u) => laneXY(l, front[l] + (u.side === 'A' ? -0.04 : 0.04)) });
    } else if (rr < 0.55) {
      shift(l, winU.side, 0.08);
      give(winU.side, 200, [winU]);
      snap('trade', `Troca de dano — lane ${laneName(l)}`,
        pick(rng, [
          `${nm(winU)} vence a troca contra ${nm(loseU)}: dano a distância e ${winU.ult} forçam o recuo.`,
          `${nm(loseU)} erra o posicionamento; ${nm(winU)} pune e empurra a wave na lane ${laneName(l)}.`,
        ]), [winU, loseU], winU.side, { ids: [winU.id, loseU.id], at: fightAt(l, front[l]) });
    } else if (rr < 0.8 - 0.15 * mean('gank')) {
      killUnit(winU, loseU);
      shift(l, winU.side, 0.1);
      snap('kill', `${winU.player} elimina ${loseU.player}`,
        `${nm(winU)} acerta ${winU.ult} e elimina ${nm(loseU)} na lane ${laneName(l)}. ${names[winU.side]} abre ${kills[winU.side]}–${kills[other(winU.side)]}.`,
        [winU, loseU], winU.side, { ids: [winU.id, loseU.id], at: fightAt(l, front[l]) });
    } else {
      // gank: rotação de outra lane
      const from = pick(rng, lanes.filter((x) => x !== l));
      const gankers = inLane(winU.side, from).filter((u) => u.role !== 'tanque');
      const g = gankers.length ? pickWeighted(gankers) : winU;
      killUnit(g, loseU);
      shift(l, winU.side, 0.12);
      snap('gank', `Gank de ${g.player}`,
        `${nm(g)} rotaciona da lane ${laneName(from)} para a ${laneName(l)} e surpreende ${nm(loseU)} com ${g.ult}. Abate limpo.`,
        [g, loseU], winU.side, { ids: [g.id, loseU.id], at: fightAt(l, front[l]) });
    }
  }

  if (!winner) {
    winner = strength('A') >= strength('B') ? 'A' : 'B';
    snap('end', 'Fim de jogo',
      `Após uma longa partida, ${names[winner]} impõe a vantagem de almas e derruba o Patrono.`, [], winner);
  }

  return { events, winner, stats, durationMin: Math.round(minute) };
}
