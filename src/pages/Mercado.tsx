import { PlayerCard } from '../components/PlayerCard';
import { Button, Panel } from '../components/ui';
import { fmtMoney } from '../state/game';
import { useGame } from '../state/GameContext';

export default function Mercado() {
  const { state, dispatch } = useGame();
  return (
    <Panel title={`Mercado de transferências · saldo ${fmtMoney(state.money)}`}>
      <div className="flex flex-wrap justify-center gap-7">
        {state.market.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-2">
            <PlayerCard player={p} size="md" teamLabel="LIVRE" openable />
            <Button
              variant="primary"
              disabled={p.price > state.money}
              onClick={() => dispatch({ type: 'buy', id: p.id })}
            >
              Contratar {fmtMoney(p.price)}
            </Button>
          </div>
        ))}
        {state.market.length === 0 && <p className="py-10 text-white/50">Mercado vazio. Novos jogadores a cada rodada.</p>}
      </div>
    </Panel>
  );
}
