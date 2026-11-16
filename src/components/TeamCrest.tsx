import { memo, useId } from 'react';
import { hashSeed } from '../lib/rng';

interface Props {
  id: string;
  tag: string;
  color: string;
  size?: number;
  className?: string;
}

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

/** Brasão inventado: escudo com cor do time, emblema por hash do id (listras, estrela, raio, anel) e a sigla. */
export const TeamCrest = memo(function TeamCrest({ id, tag, color, size = 96, className = '' }: Props) {
  const uid = useId().replace(/:/g, '');
  const variant = hashSeed(id) % 4;
  const dark = shade(color, 0.35);
  const mid = shade(color, 0.75);
  return (
    <svg viewBox="0 0 100 112" width={size} height={size * 1.12} className={className} role="img" aria-label={`Brasão ${tag}`}>
      <defs>
        <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <clipPath id={`c-${uid}`}>
          <path d="M50 4 92 16v38c0 28-18 46-42 54C26 100 8 82 8 54V16z" />
        </clipPath>
      </defs>
      <path d="M50 2 95 15v40c0 30-19 49-45 57C24 104 5 85 5 55V15z" fill="#0b0f13" stroke={color} strokeWidth="3" />
      <g clipPath={`url(#c-${uid})`}>
        <rect width="100" height="112" fill={`url(#g-${uid})`} />
        {variant === 0 && [0, 1, 2, 3].map((i) => <rect key={i} x={-10 + i * 28} y="-10" width="12" height="140" transform="rotate(20 50 56)" fill="#fff" opacity="0.13" />)}
        {variant === 1 && <path d="M50 14 58 38 84 38 63 54 71 80 50 64 29 80 37 54 16 38 42 38z" fill="#fff" opacity="0.14" />}
        {variant === 2 && <path d="M58 10 30 62h20l-8 40 34-56H54z" fill="#fff" opacity="0.16" />}
        {variant === 3 && <><circle cx="50" cy="52" r="34" fill="none" stroke="#fff" strokeWidth="6" opacity="0.14" /><circle cx="50" cy="52" r="20" fill="none" stroke="#fff" strokeWidth="4" opacity="0.14" /></>}
        <path d="M0 0H100V30Q50 46 0 30Z" fill="#fff" opacity="0.1" />
      </g>
      <path d="M50 9 88 19v35c0 25-16 42-38 49C28 96 12 79 12 54V19z" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" />
      <text x="50" y="62" textAnchor="middle" fontFamily="Rajdhani, sans-serif" fontWeight="700" fontSize={tag.length > 3 ? 26 : 34} letterSpacing="2" fill="#fff" stroke={dark} strokeWidth="3" paintOrder="stroke">
        {tag}
      </text>
      <rect x="30" y="74" width="40" height="3" rx="1.5" fill={mid} />
    </svg>
  );
});
