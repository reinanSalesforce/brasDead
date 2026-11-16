import { HERO_MAP } from '../data/heroes';
import { affinity } from '../lib/rating';
import type { Player } from '../types';
import { HeroAvatar } from './HeroArt';

export const affinityColor = (pct: number) => (pct >= 70 ? '#34d399' : pct >= 40 ? '#facc15' : '#f87171');

/** Heróis mais jogados do jogador, com partidas, vitórias e afinidade (nota que entra na partida). */
export function HeroStatsList({ player, limit = 6 }: { player: Player; limit?: number }) {
  const rows = Object.entries(player.heroStats ?? {})
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, limit);
  if (!rows.length) return null;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/40">
        <span>Heróis mais jogados</span>
        <span>{player.source ? 'dados reais' : 'estimado'}</span>
      </div>
      <ul className="space-y-1">
        {rows.map(([id, st]) => {
          const pct = Math.round(affinity(player, id) * 100);
          return (
            <li key={id} className="flex items-center gap-2 text-xs">
              <HeroAvatar heroId={id} size={22} />
              <span className="w-24 truncate font-semibold">{HERO_MAP[id]?.name}</span>
              <span className="w-16 text-white/55">{st.games}j · {Math.round(st.winRate)}%</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded bg-white/10">
                <span className="block h-full rounded" style={{ width: `${pct}%`, background: affinityColor(pct) }} />
              </span>
              <span className="w-8 text-right font-display font-bold" style={{ color: affinityColor(pct) }}>{pct}%</span>
            </li>
          );
        })}
      </ul>
      {player.source && <div className="mt-1 text-[9px] text-white/30">{player.source}</div>}
    </div>
  );
}
