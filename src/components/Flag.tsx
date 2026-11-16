export function BrFlag({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={className} role="img" aria-label="Brasil">
      <rect width="28" height="20" rx="2.5" fill="#1da845" />
      <path d="M14 3 25 10 14 17 3 10z" fill="#f7d417" />
      <circle cx="14" cy="10" r="4.2" fill="#2a4ea8" />
      <path d="M10 9.2c2.6-.6 5.4-.2 8 1.2" stroke="#fff" strokeWidth=".7" fill="none" />
    </svg>
  );
}
