import { useState } from 'react';
import { PlayerCard } from '../components/PlayerCard';
import { Button, Panel } from '../components/ui';
import { ovr } from '../data/players';
import { ROLE_ORDER, ROLES } from '../data/roles';
import { fmtMoney, userTeam } from '../state/game';
import { useGame } from '../state/GameContext';
import type { Role } from '../types';

export default function Elenco() {
  const { state, dispatch } = useGame();
  const squad = userTeam(state).squad;
  const [filter, setFilter] = useState<Role | 'all'>('all');
  const list = squad
    .filter((p) => filter === 'all' || p.role === filter)
    .sort((a, b) => ovr(b) - ovr(a));

  return (
    <Panel
      title={`Elenco · ${squad.length} jogadores`}
      right={
        <div className="flex flex-wrap gap-1">
          <Button variant={filter === 'all' ? 'primary' : 'ghost'} onClick={() => setFilter('all')}>Todos</Button>
          {ROLE_ORDER.map((r) => (
            <Button key={r} variant={filter === r ? 'primary' : 'ghost'} onClick={() => setFilter(r)}>
              {ROLES[r].label}
            </Button>
          ))}
        </div>
      }
    >
      <div className="flex flex-wrap justify-center gap-7">
        {list.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-2">
            <PlayerCard player={p} size="lg" openable />
            <Button
              variant="danger"
              disabled={squad.length <= 6}
              onClick={() => dispatch({ type: 'sell', id: p.id })}
            >
              Vender {fmtMoney(Math.round(p.price * 0.8))}
            </Button>
          </div>
        ))}
        {list.length === 0 && <p className="py-10 text-white/50">Nenhum jogador nessa função.</p>}
      </div>
    </Panel>
  );
}
