import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ovr } from '../data/players';
import { ROLES } from '../data/roles';
import type { Player } from '../types';
import { HeroStatsList } from './HeroStatsList';
import { PlayerCard, tierOf } from './PlayerCard';

import { SpotCtx } from './spotlightContext';

const ATTRS: [keyof Player['attrs'], string][] = [
  ['mir', 'Mira'], ['mov', 'Movimentação'], ['mac', 'Macro'], ['pol', 'Pool de heróis'], ['sup', 'Suporte'], ['con', 'Consistência'],
];

/** Conta de 0 até `to` (efeito de revelação). */
function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setV(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + 300;
    const tick = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / 600));
      setV(Math.round(to * (1 - (1 - k) ** 2)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v}</>;
}

function SpotlightModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const tier = tierOf(ovr(player));
  const chars = useMemo(() => [...player.name.toUpperCase()], [player.name]);

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="spot-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/80 p-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Carta de ${player.name}`}
      onClick={onClose}
    >
      <div className="flex flex-wrap items-center justify-center gap-10" onClick={(e) => e.stopPropagation()}>
        <div className="spot-pop relative">
          <div className="spot-flash" style={{ background: `radial-gradient(circle, ${tier.accent}, transparent 60%)` }} />
          <PlayerCard player={player} size="xl" />
        </div>
        <div className="w-[320px] space-y-4 rounded-2xl border border-line bg-panel/90 p-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">
              {player.role === 'flex' ? 'Flex' : ROLES[player.role].label} · {tier.name}
            </div>
            <h2 className="font-display text-3xl font-bold tracking-[0.1em]">
              {chars.map((c, i) => (
                <span key={i} className="spot-char" style={{ animationDelay: `${400 + i * 25}ms` }}>
                  {c === ' ' ? ' ' : c}
                </span>
              ))}
            </h2>
            <div className="font-display text-5xl font-bold" style={{ color: tier.accent }}>
              <CountUp to={ovr(player)} />
            </div>
          </div>
          <dl className="space-y-1.5 text-sm">
            {ATTRS.map(([k, label]) => (
              <div key={k}>
                <div className="flex justify-between text-white/70">
                  <dt>{label}</dt>
                  <dd className="font-display font-bold text-white">{player.attrs[k]}</dd>
                </div>
                <div className="h-1 overflow-hidden rounded bg-white/10">
                  <div className="h-full rounded" style={{ width: `${player.attrs[k]}%`, background: tier.accent, transition: 'width .8s cubic-bezier(.22,1,.36,1) .3s' }} />
                </div>
              </div>
            ))}
          </dl>
          <HeroStatsList player={player} />
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-zinc-100 py-2 font-display text-sm font-bold uppercase tracking-[0.16em] text-black hover:bg-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export function SpotlightProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const open = useCallback((p: Player) => setPlayer(p), []);
  const close = useCallback(() => setPlayer(null), []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <SpotCtx.Provider value={value}>
      {children}
      {player && <SpotlightModal player={player} onClose={close} />}
    </SpotCtx.Provider>
  );
}
