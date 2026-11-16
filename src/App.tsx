import { lazy, Suspense } from 'react';
import { HashRouter, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { SpotlightProvider } from './components/Spotlight';
import { ErrorBoundary } from './components/ui';
import { fmtMoney, TOTAL_ROUNDS } from './state/game';
import { GameProvider, useGame } from './state/GameContext';

const Painel = lazy(() => import('./pages/Painel'));
const Elenco = lazy(() => import('./pages/Elenco'));
const Tatica = lazy(() => import('./pages/Tatica'));
const Mercado = lazy(() => import('./pages/Mercado'));
const Tabela = lazy(() => import('./pages/Tabela'));
const Draft = lazy(() => import('./pages/Draft'));
const Partida = lazy(() => import('./pages/Partida'));

const LINKS = [
  ['painel', 'Painel'],
  ['elenco', 'Elenco'],
  ['tatica', 'Tática'],
  ['mercado', 'Mercado'],
  ['tabela', 'Tabela'],
] as const;

function Layout() {
  const { state } = useGame();
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-16">
      <header className="sticky top-0 z-30 -mx-4 mb-6 flex flex-wrap items-center gap-4 border-b border-line bg-ink/85 px-4 py-3 backdrop-blur">
        <div className="font-display text-2xl font-bold tracking-[0.12em]">
          <span className="text-amber">BRAS</span>DEAD
        </div>
        <nav className="flex flex-1 flex-wrap gap-1" aria-label="Principal">
          {LINKS.map(([to, label]) => (
            <NavLink
              key={to}
              to={`/${to}`}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 font-display text-sm font-bold uppercase tracking-[0.16em] transition ${
                  isActive ? 'bg-amber text-black' : 'text-white/60 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-xs text-white/60">
          <span>Rodada <b className="text-white">{Math.min(state.round, TOTAL_ROUNDS)}</b>/{TOTAL_ROUNDS}</span>
          <span className="font-display text-base font-bold text-emerald-300">{fmtMoney(state.money)}</span>
        </div>
      </header>
      <ErrorBoundary>
        <Suspense fallback={<div className="p-10 text-center text-white/50">Carregando…</div>}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export function App() {
  return (
    <GameProvider>
      <SpotlightProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/painel" replace />} />
            <Route path="painel" element={<Painel />} />
            <Route path="elenco" element={<Elenco />} />
            <Route path="tatica" element={<Tatica />} />
            <Route path="mercado" element={<Mercado />} />
            <Route path="tabela" element={<Tabela />} />
            <Route path="draft" element={<Draft />} />
            <Route path="partida" element={<Partida />} />
            <Route path="*" element={<Navigate to="/painel" replace />} />
          </Route>
        </Routes>
      </HashRouter>
      </SpotlightProvider>
    </GameProvider>
  );
}
