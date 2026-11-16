import { Component, type ButtonHTMLAttributes, type ErrorInfo, type ReactNode } from 'react';

export function Panel({
  title, right, children, className = '',
}: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-panel/80 backdrop-blur ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white/70">{title}</h2>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
  pulse?: boolean;
};
export function Button({ variant = 'ghost', pulse, className = '', ...rest }: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-display text-sm font-bold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40';
  const v = {
    primary: 'bg-amber text-black hover:bg-amber-300',
    ghost: 'border border-line bg-panel2 text-white/85 hover:border-amber/60 hover:text-white',
    danger: 'border border-red-500/40 bg-red-950/50 text-red-300 hover:bg-red-900/60',
  }[variant];
  return <button type="button" className={`${base} ${v} ${pulse ? 'btn-pulse' : ''} ${className}`} {...rest} />;
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel2 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">{label}</div>
      <div className="font-display text-xl font-bold">{value}</div>
    </div>
  );
}

interface EBState { error: Error | null }
export class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-red-500/40 bg-red-950/40 p-6 text-center">
        <h1 className="font-display text-2xl font-bold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-white/70">{this.state.error.message}</p>
        <Button
          className="mt-4"
          variant="primary"
          onClick={() => {
            try { localStorage.removeItem('brasdead:v5'); } catch { /* ignore */ }
            location.hash = '#/painel';
            location.reload();
          }}
        >
          Reiniciar jogo
        </Button>
      </div>
    );
  }
}
