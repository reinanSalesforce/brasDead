import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useMemo, useState } from 'react';
import { HERO_MAP, HEROES, heroImageUrl, heroPortraitUrl } from '../data/heroes';
import { ROLES } from '../data/roles';

export interface Stamp {
  heroId: string;
  kind: 'ban' | 'pick';
  who: string; // nome do time que agiu
  id: number;
}

interface Props {
  stamp: Stamp | null;
  previewId: string | null;
  thinking: string | null; // "TIME BANINDO" enquanto o rival pensa
  idleText: string;
  kind: 'ban' | 'pick'; // ação da vez
  hint?: string | null; // ex.: "Melhor com ele: 1worst — 94%"
}

const ACTION = {
  ban: { idle: 'Banir', done: 'Banido', color: '#ff4d6d' },
  pick: { idle: 'Escolher', done: 'Escolhido', color: '#34d399' },
} as const;

/** Cartão no estilo "resultado de partida": título colorido, nome em negrito, subtítulo e retrato à direita. */
function ResultBanner({ heroId, kind, done, hint }: { heroId: string; kind: 'ban' | 'pick'; done: boolean; hint?: string | null }) {
  const h = HERO_MAP[heroId];
  const [portraitFailed, setPortraitFailed] = useState(false);
  if (!h) return null;
  const url = (portraitFailed ? heroImageUrl(h) : heroPortraitUrl(h)) ?? undefined;
  const act = ACTION[kind];
  const title = done ? act.done : act.idle;
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `linear-gradient(95deg, #0a0d12 0%, #0d1117 38%, ${h.color2} 100%)`,
        borderBottom: `3px solid ${act.color}`,
        boxShadow: `inset 0 -26px 40px -26px ${act.color}66`,
      }}
    >
      <div
        className="absolute inset-y-0 right-0 w-[64%] transition-[filter] duration-500"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 30%)',
          maskImage: 'linear-gradient(to right, transparent 0%, #000 30%)',
          filter: done && kind === 'ban' ? 'grayscale(1) brightness(.6)' : undefined,
        }}
      >
        <div className="absolute inset-0" style={{ background: `radial-gradient(85% 120% at 78% 15%, ${h.color}aa, transparent 72%)` }} />
        <img
          key={url}
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setPortraitFailed(true)}
          className="stage-hero absolute -top-[6%] right-[2%] h-[118%] w-auto max-w-none object-contain object-right-top"
          style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.55))' }}
        />
      </div>
      <div className="stage-ring pointer-events-none absolute right-[18%] top-1/2 h-40 w-40 -translate-y-1/2 rounded-full" style={{ borderColor: `${h.color}` }} />
      <div className="stage-shine pointer-events-none absolute inset-0" />
      <div className="absolute inset-y-0 left-0 flex w-[58%] flex-col justify-center gap-1 px-7">
        <div className="stage-title font-display text-[2.6rem] font-bold uppercase leading-none tracking-wide" style={{ color: act.color, textShadow: `0 0 18px ${act.color}55` }}>
          {title}
        </div>
        <div className="mt-1 font-display text-xl font-bold uppercase tracking-wider text-white" aria-label={h.name}>
          {[...h.name].map((c, i) => (
            <span key={i} className="spot-char" style={{ animationDelay: `${120 + i * 28}ms` }} aria-hidden>{c === ' ' ? '\u00a0' : c}</span>
          ))}
        </div>
        <div className="text-xs text-white/65">
          {h.roles.map((r) => ROLES[r].label).join(' · ')}
          {hint && !done ? <span className="text-amber-300"> · {hint}</span> : null}
        </div>
      </div>
    </div>
  );
}

/** Estado ocioso: heróis passando em silhueta, varredura de scanner e texto pulsando. */
function IdleCarousel({ text }: { text: string }) {
  const order = useMemo(() => [...HEROES].sort(() => Math.random() - 0.5).slice(0, 14), []);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % order.length), 2200);
    return () => clearInterval(t);
  }, [order.length]);
  const h = order[i]!;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.img
          key={h.id}
          src={heroPortraitUrl(h)}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
          initial={{ opacity: 0, x: 40, scale: 1.05 }}
          animate={{ opacity: 0.38, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="absolute right-[6%] top-0 h-[118%] w-auto max-w-none object-contain"
          style={{ filter: 'grayscale(1) brightness(.9) contrast(1.2)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 35%)', maskImage: 'linear-gradient(to right, transparent 0%, #000 35%)' }}
        />
      </AnimatePresence>
      <div className="stage-scan pointer-events-none absolute inset-0" />
      <div className="relative flex h-full flex-col items-start justify-center gap-1 px-8">
        <div className="text-[10px] uppercase tracking-[0.5em] text-white/40">Draft</div>
        <div className="ping-soft font-display text-3xl font-bold uppercase tracking-[0.25em] text-white/70">{text}</div>
        <div className="h-0.5 w-24 bg-gradient-to-r from-amber to-transparent" />
      </div>
    </div>
  );
}

/** Palco central do draft: pré-visualização, "pensando…" do rival e carimbo BANIDO. */
export const DraftStage = memo(function DraftStage({ stamp, previewId, thinking, idleText, hint, kind }: Props) {
  const shown = stamp?.heroId ?? previewId;
  const h = shown ? HERO_MAP[shown] : null;
  const banned = stamp?.kind === 'ban';
  return (
    <div className="relative h-[190px] overflow-hidden rounded-md border border-red-900/40 bg-black/50" aria-live="polite">
      {h && shown ? (
        <div key={`${shown}-${stamp?.id ?? 'p'}`} className="stage-in absolute inset-0">
          <ResultBanner heroId={shown} kind={stamp?.kind ?? kind} done={!!stamp} hint={hint} />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          {thinking ? (
            <>
              <div className="text-[10px] uppercase tracking-[0.35em] text-white/50">{thinking}</div>
              <div className="ping-soft font-display text-2xl font-bold uppercase tracking-[0.5em] text-white/40">Pensando…</div>
            </>
          ) : (
            <IdleCarousel text={idleText} />
          )}
        </div>
      )}
      {stamp && (
        <div key={stamp.id} className="pointer-events-none absolute inset-0 flex flex-col items-end justify-center gap-1 pr-10">
          <div className={`stamp ${banned ? 'stamp-ban' : 'stamp-pick'}`}>{banned ? 'Banido' : 'Escolhido'}</div>
          <div className="stamp-who text-[10px] uppercase tracking-[0.3em] text-white/70">{stamp.who}</div>
        </div>
      )}
    </div>
  );
});

/** Casa quadrada de ban: retrato apagado + risco vermelho diagonal. */
export function BanTile({ heroId, color }: { heroId?: string; color: string }) {
  const h = heroId ? HERO_MAP[heroId] : null;
  const url = h ? heroImageUrl(h) : null;
  return (
    <div
      className="relative aspect-square overflow-hidden rounded-[3px] border bg-black/50"
      style={{ borderColor: h ? '#7f1d2d' : '#ffffff1a', boxShadow: h ? '0 0 10px #ff2d5533' : undefined }}
      title={h?.name}
    >
      {h ? (
        <div key={heroId} className="ban-in absolute inset-0">
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${h.color}, ${h.color2})`, filter: 'grayscale(.9) brightness(.5)' }} />
          {url && <img src={url} alt={h.name} referrerPolicy="no-referrer" draggable={false} className="absolute inset-0 h-full w-full object-cover object-top" style={{ filter: 'grayscale(1) brightness(.6) contrast(1.1)' }} />}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
            <line className="ban-slash" x1="6" y1="94" x2="94" y2="6" stroke="#ff4d6d" strokeWidth="5" strokeLinecap="round" pathLength="1" style={{ filter: 'drop-shadow(0 0 3px #ff2d55)' }} />
          </svg>
        </div>
      ) : (
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-1/3 w-1/3 opacity-25" fill="none" stroke={color} strokeWidth="1.6" aria-hidden>
          <path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6z" />
        </svg>
      )}
    </div>
  );
}
