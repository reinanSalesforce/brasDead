import { motion } from 'motion/react';
import { useMemo } from 'react';
import { ovr, USER_TEAM_ID } from '../data/players';
import { computeTable, fmtMoney, teamPower, userTeam, type GameState } from '../state/game';
import { TeamCrest } from './TeamCrest';

function Cell({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel2/70 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-[0.2em] text-white/45">{label}</div>
      <div className="font-display text-xl font-bold leading-tight" style={{ color: accent }}>{value}</div>
    </div>
  );
}

/** "Meu time": brasão, nome e a campanha (vitórias, derrotas, posição, elenco, OVR, abates e mais). */
export function MyTeamCard({ state }: { state: GameState }) {
  const me = userTeam(state);
  const stats = useMemo(() => {
    const row = computeTable(state).find((r) => r.teamId === USER_TEAM_ID)!;
    const pos = computeTable(state).findIndex((r) => r.teamId === USER_TEAM_ID) + 1;
    const kills = state.history.reduce((a, h) => a + h.kills[0], 0);
    const deaths = state.history.reduce((a, h) => a + h.kills[1], 0);
    const best = [...me.squad].sort((a, b) => ovr(b) - ovr(a))[0]!;
    return {
      row, pos, kills, deaths, best,
      winRate: row.played ? Math.round((row.wins / row.played) * 100) : 0,
      avgAge: (me.squad.reduce((a, p) => a + p.age, 0) / me.squad.length).toFixed(1),
      power: Math.round(teamPower(me, state.formationId)),
    };
  }, [state, me]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-line bg-panel/80"
      style={{ boxShadow: `0 0 40px -22px ${me.color}` }}
    >
      <div className="relative flex items-center gap-4 p-4" style={{ background: `linear-gradient(120deg, ${me.color}26, transparent 70%)` }}>
        <motion.div whileHover={{ rotate: [0, -4, 4, 0], scale: 1.06 }} transition={{ duration: 0.5 }} style={{ filter: `drop-shadow(0 0 14px ${me.color}88)` }}>
          <TeamCrest id={me.id} tag={me.tag} color={me.color} size={64} />
        </motion.div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Meu time</div>
          <div className="truncate font-display text-2xl font-bold uppercase leading-tight" style={{ color: me.color }}>{me.name}</div>
          <div className="text-xs text-white/55">{stats.pos}º na liga · {fmtMoney(state.money)}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        <Cell label="Vitórias" value={stats.row.wins} accent="#34d399" />
        <Cell label="Derrotas" value={stats.row.losses} accent="#f87171" />
        <Cell label="Aproveit." value={`${stats.winRate}%`} />
        <Cell label="Jogadores" value={me.squad.length} />
        <Cell label="OVR time" value={stats.power} accent="#f59e0b" />
        <Cell label="Idade média" value={stats.avgAge} />
        <Cell label="Abates" value={`${stats.kills}–${stats.deaths}`} />
        <Cell label="Pontos" value={stats.row.pts} />
        <Cell label="Craque" value={`${stats.best.name} ${ovr(stats.best)}`} />
      </div>
    </motion.section>
  );
}
