import { useMemo } from 'react';
import { Panel } from '../components/ui';
import { USER_TEAM_ID } from '../data/players';
import { computeTable, teamById, TOTAL_ROUNDS } from '../state/game';
import { useGame } from '../state/GameContext';

export default function Tabela() {
  const { state } = useGame();
  const table = useMemo(() => computeTable(state), [state]);
  const rounds = Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Classificação">
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-widest text-white/40">
            <tr><th className="py-1">#</th><th>Time</th><th>J</th><th>V</th><th>D</th><th>Pts</th></tr>
          </thead>
          <tbody>
            {table.map((r, i) => (
              <tr key={r.teamId} className={r.teamId === USER_TEAM_ID ? 'bg-amber/15 text-amber' : ''}>
                <td className="py-1.5 pl-1">{i + 1}</td>
                <td>{teamById(state, r.teamId).name}</td>
                <td>{r.played}</td><td>{r.wins}</td><td>{r.losses}</td>
                <td className="font-display font-bold">{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Calendário">
        <div className="max-h-[520px] space-y-4 overflow-auto pr-2">
          {rounds.map((rd) => (
            <div key={rd}>
              <h3 className="mb-1 font-display text-xs font-bold uppercase tracking-widest text-white/50">Rodada {rd}</h3>
              <ul className="space-y-1 text-sm">
                {state.fixtures.filter((f) => f.round === rd).map((f) => (
                  <li key={`${f.home}-${f.away}`} className="flex justify-between rounded bg-panel2 px-3 py-1">
                    <span className={f.result?.winner === f.home ? 'font-bold text-emerald-300' : ''}>{teamById(state, f.home).name}</span>
                    <span className="text-white/30">{f.result ? '✓' : 'vs'}</span>
                    <span className={f.result?.winner === f.away ? 'font-bold text-emerald-300' : ''}>{teamById(state, f.away).name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
