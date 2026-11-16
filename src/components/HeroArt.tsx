import { memo, useState } from 'react';
import { HERO_MAP, heroIconUrl, heroImageUrl } from '../data/heroes';
import { ROLES } from '../data/roles';

const initials = (name: string) =>
  name
    .replace('The ', '')
    .split(/[\s&]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Arte estilizada do herói (gradiente + monograma + faixas) — troque por imagens reais quando quiser. */
export const HeroArt = memo(function HeroArt({
  heroId,
  className = '',
  mono = true,
}: {
  heroId: string;
  className?: string;
  mono?: boolean;
}) {
  const h = HERO_MAP[heroId];
  const [failed, setFailed] = useState(false);
  if (!h) return <div className={className} />;
  const role = ROLES[h.roles[0]!];
  const url = heroImageUrl(h);
  const showImg = !!url && !failed;
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(120% 90% at 70% 15%, ${h.color} 0%, ${h.color2} 55%, #05080a 100%)`,
      }}
      aria-hidden
    >
      <div
        className="absolute -left-[20%] top-[10%] h-[160%] w-[38%] rotate-[18deg] opacity-30"
        style={{ background: `linear-gradient(${role.color}, transparent)` }}
      />
      <div
        className="absolute right-[8%] top-[-10%] h-[150%] w-[12%] rotate-[18deg] opacity-25"
        style={{ background: `linear-gradient(#fff, transparent)` }}
      />
      {showImg && (
        <img
          src={url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 18%' }}
        />
      )}
      {mono && !showImg && (
        <span
          className="absolute inset-0 flex items-center justify-center font-display font-bold leading-none text-white/20"
          style={{ fontSize: '9em', letterSpacing: '-0.05em' }}
        >
          {initials(h.name)}
        </span>
      )}
    </div>
  );
});

export const HeroAvatar = memo(function HeroAvatar({
  heroId,
  size = 40,
  ring,
  dim,
}: {
  heroId: string;
  size?: number;
  ring?: string;
  dim?: boolean;
}) {
  const h = HERO_MAP[heroId];
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md"
      style={{
        width: size, height: size, fontSize: size / 3,
        boxShadow: `0 0 0 2px ${ring ?? '#233741'}`, opacity: dim ? 0.35 : 1,
        filter: dim ? 'grayscale(1)' : undefined,
      }}
      title={h?.name}
    >
      <HeroArt heroId={heroId} className="relative h-full w-full" mono={false} />
      {h && !failed ? (
        <img
          src={heroIconUrl(h)}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        h && (
          <span className="absolute inset-0 flex items-center justify-center font-display text-[1.3em] font-bold text-white/90 drop-shadow">
            {initials(h.name)}
          </span>
        )
      )}
    </div>
  );
});
