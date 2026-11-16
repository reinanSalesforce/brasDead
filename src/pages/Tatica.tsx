import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DND_PLAYER } from '../components/Board';
import { MapBoard, type Compare } from '../components/MapBoard';
import { AnimatePresence } from 'motion/react';
import { CompareModal } from '../components/CompareModal';
import { HeroStatsList } from '../components/HeroStatsList';
import { PlayerCard } from '../components/PlayerCard';
import { Button, Panel } from '../components/ui';
import { FORMATION_MAP } from '../data/formations';
import { TacticsPanel } from '../components/TacticsPanel';
import { ovr } from '../data/players';
import { ROLES } from '../data/roles';
import { affinity, optimizePreLineup, slotRating, teamRating } from '../lib/rating';
import { userTeam } from '../state/game';
import { useGame, useSwapLineup } from '../state/GameContext';
import type { Player } from '../types';

const ATTR_LABELS: [keyof Player['attrs'], string][] = [
  ['mir', 'Mira'], ['mac', 'Macro'], ['sup', 'Suporte'],
  ['mov', 'Movimentação'], ['pol', 'Pool de heróis'], ['con', 'Consistência'],
];

export default function Tatica() {
  const { state, dispatch } = useGame();
  const nav = useNavigate();
  const squad = userTeam(state).squad;
  const swap = useSwapLineup();
  const f = FORMATION_MAP[state.formationId]!;
  const session = state.session;
  const heroBySlot = session?.heroBySlot;
  const [selected, setSelected] = useState<string | null>(null);
  const [cmpSlot, setCmpSlot] = useState<number | null>(null); // slot aberto no pop-up de comparação

  const byId = useMemo(() => new Map(squad.map((p) => [p.id, p])), [squad]);
  const players = state.lineup.map((id) => (id ? byId.get(id) ?? null : null));
  const bench = squad.filter((p) => !state.lineup.includes(p.id)).sort((a, b) => ovr(b) - ovr(a));
  const sel = (selected && byId.get(selected)) || players.find(Boolean) || null;
  const rating = teamRating(players, f.slots, heroBySlot);

  // Estilo EA FC: ao selecionar alguém, mostra quanto cada troca ganha/perde naquele slot (com o herói do slot)
  const selSlot = selected ? state.lineup.indexOf(selected) : -1;
  const selPlayer = selected ? byId.get(selected) ?? null : null;
  const effAt = (p: Player | null, i: number) => slotRating(p, f.slots[i]!, heroBySlot?.[i] ?? null);
  const benchDelta = new Map<string, number>();
  if (selSlot >= 0) {
    const cur = effAt(players[selSlot] ?? null, selSlot);
    bench.forEach((b) => benchDelta.set(b.id, effAt(b, selSlot) - cur));
  }
  const slotCompare: (Compare | null)[] | undefined =
    selPlayer && selSlot < 0
      ? f.slots.map((_, i) => {
          const hero = heroBySlot?.[i] ?? null;
          return {
            delta: effAt(selPlayer, i) - effAt(players[i] ?? null, i),
            aff: hero ? Math.round(affinity(selPlayer, hero) * 100) : 0,
            name: selPlayer.name,
          };
        })
      : undefined;

  // reserva solto sobre um titular → abre a comparação (a troca só acontece no botão do pop-up)
  const handleDrop = (slot: number, playerId: string) => {
    const incoming = byId.get(playerId);
    const occupied = state.lineup[slot];
    if (incoming && !state.lineup.includes(playerId) && occupied) {
      setSelected(playerId);
      setCmpSlot(slot);
      return;
    }
    swap(slot, playerId);
  };

  const bestSlotFor = (p: Player) => {
    let best = 0;
    let bd = -Infinity;
    f.slots.forEach((_, i) => {
      const d = effAt(p, i) - effAt(players[i] ?? null, i);
      if (d > bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };

  const swapHeroes = useCallback(
    (from: number, to: number) => {
      if (!heroBySlot) return;
      const next = [...heroBySlot];
      [next[from], next[to]] = [next[to] ?? null, next[from] ?? null];
      dispatch({ type: 'slotHeroes', heroBySlot: next });
    },
    [heroBySlot, dispatch],
  );

  const autoHeroes = useCallback(() => {
    if (!session) return;
    const r = optimizePreLineup(squad, f.slots, state.lineup, session.userHeroes);
    dispatch({ type: 'lineup', lineup: r.lineup });
    dispatch({ type: 'slotHeroes', heroBySlot: r.heroes });
  }, [session, squad, state.lineup, f.slots, dispatch]);

  const dropBench = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const pid = e.dataTransfer.getData(DND_PLAYER);
      if (!pid) return;
      dispatch({ type: 'lineup', lineup: state.lineup.map((id) => (id === pid ? null : id)) });
    },
    [dispatch, state.lineup],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Panel
          title={session ? 'Definir posições — pré-jogo' : 'Gerenciamento do time'}
          right={
            <div className="flex gap-2">
              <Button onClick={() => dispatch({ type: 'autoLineup' })}>Auto escalar</Button>
              {session && <Button variant="primary" onClick={autoHeroes}>Pré-escalar</Button>}
            </div>
          }
        >
          <div className="mb-3 text-[11px] uppercase tracking-[0.3em] text-white/45">Escalação fixa · 2-2-2 Clássica</div>
          <MapBoard
            formationId={state.formationId}
            lineup={state.lineup}
            squad={squad}
            heroBySlot={heroBySlot}
            onDropPlayer={handleDrop}
            onSwapHeroes={swapHeroes}
            onSelect={setSelected}
            selectedId={sel?.id}
            compare={slotCompare}
            onSwapIn={(slot: number) => setCmpSlot(slot)}
          />
          <p className="mt-3 text-center text-xs text-white/45">
            Arraste as cartas para trocar de posição{session ? ' e os chips de herói entre os slots. Clique em um titular ou reserva para ver ▲/▼ do rendimento com o herói do slot (★ = herói de assinatura)' : ''}. Bolinha:
            <span className="text-emerald-400"> ● função ideal</span>
            <span className="text-yellow-300"> ● flex</span>
            <span className="text-red-400"> ● fora de posição</span>
          </p>
        </Panel>

        <Panel title={`Reservas · ${bench.length}`}>
          <div
            className="flex min-h-[150px] flex-wrap gap-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={dropBench}
          >
            {bench.map((p) => {
              const d = benchDelta.get(p.id);
              const slotHero = selSlot >= 0 ? heroBySlot?.[selSlot] : null;
              const startDrag = (e: React.DragEvent<HTMLElement>) => {
                e.dataTransfer.setData(DND_PLAYER, p.id);
                e.dataTransfer.effectAllowed = 'move';
              };
              return session ? (
                <button
                  key={p.id}
                  type="button"
                  draggable
                  onDragStart={startDrag}
                  onClick={() => {
                    setSelected(p.id);
                    setCmpSlot(bestSlotFor(p));
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${selected === p.id ? 'border-amber bg-amber/10' : 'border-line bg-panel2 hover:border-white/30'}`}
                >
                  <span className="font-display text-xl font-bold">{ovr(p)}</span>
                  <span>
                    <span className="block text-sm font-bold uppercase tracking-wide">{p.name}</span>
                    <span className="block text-[10px] uppercase tracking-widest text-white/45">
                      {p.role === 'flex' ? 'Flex' : ROLES[p.role].label}
                    </span>
                  </span>
                  {d !== undefined && (
                    <span className={`ml-1 rounded px-1.5 py-0.5 text-xs font-bold ${d >= 0 ? 'bg-emerald-500 text-black' : 'bg-red-500/90 text-white'}`}>
                      {d >= 0 ? '▲' : '▼'}{Math.abs(d).toFixed(1)}{slotHero && p.pool.includes(slotHero) ? ' ★' : ''}
                    </span>
                  )}
                </button>
              ) : (
                <PlayerCard
                  key={p.id}
                  player={p}
                  size="sm"
                  draggable
                  onClick={() => setSelected(p.id)}
                  onDragStart={startDrag}
                />
              );
            })}
            {bench.length === 0 && <p className="text-sm text-white/40">Sem reservas. Contrate no Mercado.</p>}
          </div>
        </Panel>
      </div>

      <aside className="space-y-4">
        <Panel title="Força do time">
          <div className="flex items-end justify-between">
            <span className="font-display text-5xl font-bold text-amber">{rating.toFixed(1)}</span>
            <span className="text-xs text-white/50">{f.name}</span>
          </div>
          <p className="mt-1 text-xs text-white/50">{f.desc}</p>
        </Panel>

        {sel && (
          <Panel title={sel.name}>
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded bg-black/50 px-2 py-0.5 text-xs font-bold uppercase tracking-widest" style={{ color: sel.role === 'flex' ? '#facc15' : ROLES[sel.role].color }}>
                {sel.role === 'flex' ? 'Flex' : ROLES[sel.role].label}
              </span>
              <span className="font-display text-4xl font-bold">{ovr(sel)}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {ATTR_LABELS.map(([k, label]) => (
                <div key={k} className="flex justify-between border-b border-line/60 py-1">
                  <dt className="text-white/55">{label}</dt>
                  <dd className="font-display font-bold">{sel.attrs[k]}</dd>
                </div>
              ))}
              <div className="flex justify-between border-b border-line/60 py-1">
                <dt className="text-white/55">Idade</dt><dd className="font-display font-bold">{sel.age}</dd>
              </div>
            </dl>
            <div className="mt-4"><HeroStatsList player={sel} /></div>
          </Panel>
        )}

        <TacticsPanel />

        {session && (
          <div className="sticky bottom-3 z-30 rounded-2xl border border-amber/40 bg-ink/90 p-2 shadow-[0_0_40px_-8px_rgba(245,158,11,.5)] backdrop-blur">
            <Button variant="primary" pulse className="w-full py-3 text-base" onClick={() => nav('/partida')}>
              Iniciar partida →
            </Button>
          </div>
        )}
      </aside>
      <AnimatePresence>
        {selPlayer && selSlot < 0 && cmpSlot !== null && (
          <CompareModal
            key={selPlayer.id}
            reserve={selPlayer}
            starters={players}
            slots={f.slots}
            heroBySlot={heroBySlot ?? f.slots.map(() => null)}
            initialSlot={cmpSlot}
            onClose={() => setCmpSlot(null)}
            onSwap={(slot) => {
              swap(slot, selPlayer.id);
              setCmpSlot(null);
              setSelected(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
