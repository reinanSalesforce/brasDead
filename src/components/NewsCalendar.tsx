import { useMemo, useState } from 'react';
import { fmtDate, roundDate, buildNews, type NewsKind } from '../data/news';
import { USER_TEAM_ID } from '../data/players';
import { teamById, TOTAL_ROUNDS, type GameState } from '../state/game';
import { Panel } from './ui';

const KIND: Record<NewsKind, { label: string; color: string; icon: string }> = {
  jogador: { label: 'Jogadores', color: '#f59e0b', icon: '👤' },
  campeonato: { label: 'Campeonato', color: '#38bdf8', icon: '🏆' },
  mercado: { label: 'Mercado', color: '#34d399', icon: '💰' },
};

function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return (
    <div className="flex flex-wrap gap-1" role="tablist">
      {items.map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={`rounded px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-[0.16em] transition ${
            value === k ? 'bg-amber text-black' : 'bg-white/5 text-white/55 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function NewsPanel({ state }: { state: GameState }) {
  const [tab, setTab] = useState<NewsKind | 'todas'>('todas');
  const news = useMemo(() => buildNews(state), [state]);
  const list = news.filter((n) => tab === 'todas' || n.kind === tab);
  return (
    <Panel
      title="Notícias"
      right={
        <Tabs
          value={tab}
          onChange={setTab}
          items={[['todas', 'Todas'], ['jogador', 'Jogadores'], ['campeonato', 'Campeonato'], ['mercado', 'Mercado']]}
        />
      }
    >
      <ul className="space-y-2">
        {list.map((n, i) => (
          <li
            key={n.id}
            className="fade-in group flex gap-3 rounded-lg border border-line bg-panel2/60 p-3 transition hover:border-white/25 hover:bg-panel2"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg"
              style={{ background: `${KIND[n.kind].color}22`, boxShadow: `inset 0 0 0 1px ${KIND[n.kind].color}55` }}
              aria-hidden
            >
              {KIND[n.kind].icon}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
                <span className="font-bold" style={{ color: KIND[n.kind].color }}>{KIND[n.kind].label}</span>
                <span className="text-white/35">· {n.when}</span>
              </div>
              <h3 className="font-display text-base font-bold leading-snug">{n.title}</h3>
              <p className="text-sm leading-snug text-white/65">{n.text}</p>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="py-6 text-center text-sm text-white/40">Sem notícias nesta categoria.</li>}
      </ul>
    </Panel>
  );
}

export function CalendarPanel({ state }: { state: GameState }) {
  const [tab, setTab] = useState<'meus' | 'liga'>('meus');
  const rounds = Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1);

  return (
    <Panel title="Calendário" right={<Tabs value={tab} onChange={setTab} items={[['meus', 'Meus jogos'], ['liga', 'Campeonato']]} />}>
      {tab === 'meus' ? (
        <ol className="space-y-1.5">
          {rounds.map((rd) => {
            const f = state.fixtures.find((x) => x.round === rd && (x.home === USER_TEAM_ID || x.away === USER_TEAM_ID));
            if (!f) return null;
            const oppId = f.home === USER_TEAM_ID ? f.away : f.home;
            const won = f.result ? f.result.winner === USER_TEAM_ID : null;
            const current = rd === state.round;
            return (
              <li
                key={rd}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${current ? 'border-amber/60 bg-amber/10' : 'border-line bg-panel2/50'}`}
              >
                <div className="w-14 text-center leading-tight">
                  <div className="font-display text-[10px] uppercase tracking-widest text-white/45">R{rd}</div>
                  <div className="text-[11px] capitalize text-white/70">{fmtDate(roundDate(rd))}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    <span className="text-white/45">{f.home === USER_TEAM_ID ? 'vs ' : '@ '}</span>
                    {teamById(state, oppId).name}
                  </div>
                </div>
                {won === null ? (
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${current ? 'bg-amber text-black' : 'bg-white/10 text-white/50'}`}>
                    {current ? 'Próximo' : 'Agendado'}
                  </span>
                ) : (
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${won ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {won ? 'Vitória' : 'Derrota'}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="space-y-3">
          {rounds.map((rd) => {
            const fixtures = state.fixtures.filter((x) => x.round === rd);
            const status = rd < state.round ? 'Encerrada' : rd === state.round ? 'Em andamento' : 'Em breve';
            return (
              <details key={rd} open={rd === state.round} className="group rounded-lg border border-line bg-panel2/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
                  <span className="font-display text-sm font-bold uppercase tracking-wider">Rodada {rd}</span>
                  <span className="text-[11px] capitalize text-white/50">{fmtDate(roundDate(rd))}</span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${rd === state.round ? 'bg-sky-400/20 text-sky-300' : 'bg-white/10 text-white/45'}`}>{status}</span>
                </summary>
                <ul className="space-y-1 px-3 pb-3 text-xs">
                  {fixtures.map((f) => (
                    <li key={`${f.home}-${f.away}`} className="flex justify-between gap-2">
                      <span className={f.result?.winner === f.home ? 'font-bold text-emerald-300' : 'text-white/80'}>{teamById(state, f.home).tag}</span>
                      <span className="flex-1 truncate text-center text-white/40">{teamById(state, f.home).name} × {teamById(state, f.away).name}</span>
                      <span className={f.result?.winner === f.away ? 'font-bold text-emerald-300' : 'text-white/80'}>{teamById(state, f.away).tag}</span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
          <div className="flex items-center justify-between rounded-lg border border-dashed border-amber/40 px-3 py-2 text-sm">
            <span className="font-display font-bold uppercase tracking-wider text-amber">🏆 Final da liga</span>
            <span className="capitalize text-white/60">{fmtDate(roundDate(TOTAL_ROUNDS))}</span>
          </div>
        </div>
      )}
    </Panel>
  );
}
