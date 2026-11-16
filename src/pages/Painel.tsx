import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarPanel, NewsPanel } from '../components/NewsCalendar';
import { PlayerCard } from '../components/PlayerCard';
import { MyTeamCard } from '../components/MyTeamCard';
import { Button, Panel } from '../components/ui';
import { ovr, USER_TEAM_ID } from '../data/players';
import {
  computeTable, nextFixture, opponentOf, teamById, teamPower, TOTAL_ROUNDS, userTeam,
} from '../state/game';
import { useGame } from '../state/GameContext';

export default function Painel() {
  const { state, dispatch } = useGame();
  const nav = useNavigate();
  const me = userTeam(state);
  const table = useMemo(() => computeTable(state), [state]);
  const fx = nextFixture(state);
  const over = state.round > TOTAL_ROUNDS || !fx;
  const opp = fx ? teamById(state, opponentOf(fx)) : null;
  const pos = table.findIndex((r) => r.teamId === USER_TEAM_ID) + 1;

  const stars = useMemo(
    () => [...me.squad].sort((a, b) => ovr(b) - ovr(a)).slice(0, 3),
    [me.squad],
  );
  const myPower = Math.round(teamPower(me, state.formationId));
  const oppPower = opp ? Math.round(teamPower(opp)) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Panel title="Estrelas do elenco">
          <div className="flex flex-wrap justify-center gap-6">
            {stars.map((p) => (
              <PlayerCard key={p.id} player={p} size="lg" openable />
            ))}
          </div>
        </Panel>

        <Panel title={over ? 'Temporada encerrada' : `Rodada ${state.round} — próximo jogo`}>
          {over || !opp ? (
            <div className="text-center">
              <p className="mb-1 font-display text-3xl font-bold">
                {pos === 1 ? '🏆 Campeões!' : `Você terminou em ${pos}º`}
              </p>
              <p className="mb-4 text-sm text-white/60">Reinicie para uma nova temporada.</p>
              <Button variant="primary" onClick={() => dispatch({ type: 'reset' })}>Nova temporada</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="font-display text-2xl font-bold text-amber">{me.name}</div>
                  <div className="text-xs text-white/50">Mão Âmbar · OVR {myPower}</div>
                </div>
                <div className="font-display text-xl text-white/40">VS</div>
                <div className="text-center">
                  <div className="font-display text-2xl font-bold text-sky-300">{opp.name}</div>
                  <div className="text-xs text-white/50">Chama Safira · OVR {oppPower}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to="/tatica"><Button>Definir posições</Button></Link>
                <Button variant="primary" pulse onClick={() => nav('/draft')}>Iniciar Draft</Button>
              </div>
            </div>
          )}
        </Panel>

        <NewsPanel state={state} />

        {state.history.length > 0 && (
          <Panel title="Últimos resultados">
            <ul className="space-y-1 text-sm">
              {[...state.history].reverse().map((h) => (
                <li key={h.round} className="flex justify-between rounded bg-panel2 px-3 py-1.5">
                  <span>R{h.round} · {teamById(state, h.oppId).name}</span>
                  <span className={h.won ? 'text-emerald-300' : 'text-red-300'}>
                    {h.won ? 'Vitória' : 'Derrota'} {h.kills[0]}–{h.kills[1]}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <div className="space-y-6">
        <MyTeamCard state={state} />
        <Panel title="Classificação">
          <ol className="space-y-1 text-sm">
            {table.map((r, i) => (
              <li
                key={r.teamId}
                className={`flex items-center justify-between rounded px-2 py-1 ${r.teamId === USER_TEAM_ID ? 'bg-amber/15 text-amber' : ''}`}
              >
                <span>{i + 1}. {teamById(state, r.teamId).name}</span>
                <span className="font-display font-bold">{r.pts}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <CalendarPanel state={state} />
      </div>
    </div>
  );
}
