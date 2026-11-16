import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BanTile, DraftStage, type Stamp } from '../components/DraftStage';
import { DraftBackdrop, DraftComplete, HeroTile, IntroSplash, OPP_COLOR, PhaseBanner, PickSlot, StepBar, TimerRing, USER_COLOR } from '../components/DraftFx';
import { motion } from 'motion/react';
import { Button } from '../components/ui';
import { FORMATION_MAP, FORMATIONS } from '../data/formations';
import { HEROES, HERO_MAP } from '../data/heroes';
import { ROLE_ORDER, ROLES } from '../data/roles';
import {
  aiChoose, applyStep, buildSequence, emptyDraft, isDone, takenIds,
  BANS_PER_TEAM, PICKS_PER_TEAM, type Actor, type DraftState,
} from '../lib/draft';
import { affinity, optimizePreLineup } from '../lib/rating';
import { hashSeed, mulberry32 } from '../lib/rng';
import { nextFixture, opponentOf, teamById, userTeam } from '../state/game';
import { useGame } from '../state/GameContext';
import type { Role } from '../types';

const TURN_SECONDS = 30;

export default function Draft() {
  const { state, dispatch } = useGame();
  const nav = useNavigate();
  const fx = nextFixture(state);
  const userFirst = state.round % 2 === 1;
  const seq = useMemo(() => buildSequence(userFirst), [userFirst]);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Role | 'todas'>('todas');
  const [query, setQuery] = useState('');
  const [left, setLeft] = useState(TURN_SECONDS);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [intro, setIntro] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<{ label: string; id: number } | null>(null);
  const rng = useRef(mulberry32(hashSeed(`draft-${state.round}`)));
  const finished = useRef(false);

  const me = userTeam(state);
  const opp = fx ? teamById(state, opponentOf(fx)) : null;
  const step = seq[draft.step];
  const done = isDone(draft, seq);
  const taken = useMemo(() => takenIds(draft), [draft]);

  const needs = useCallback(
    (actor: Actor): Role[] =>
      actor === 'user'
        ? FORMATION_MAP[state.formationId]!.slots.map((s) => s.role)
        : FORMATIONS[0]!.slots.map((s) => s.role),
    [state.formationId],
  );

  const suggest = useCallback(
    (s: DraftState): string => {
      const st = seq[s.step]!;
      const threat = st.actor === 'user' ? opp?.squad.flatMap((p) => p.pool) : me.squad.flatMap((p) => p.pool);
      const mine = st.actor === 'user' ? me.squad : (opp?.squad ?? []);
      // só pesa a afinidade ao escolher; no ban o que importa é tirar o herói do rival
      const fit = st.kind === 'pick' ? (id: string) => Math.max(0, ...mine.map((p) => affinity(p, id))) : undefined;
      return aiChoose(s, st, needs(st.actor), rng.current, threat, fit);
    },
    [seq, needs, opp, me.squad],
  );

  const commit = useCallback(
    (heroId: string) => {
      const st = seq[draft.step];
      if (st) {
        setStamp({ heroId, kind: st.kind, who: st.actor === 'user' ? me.name : (opp?.name ?? ''), id: Date.now() });
      }
      setDraft((d) => applyStep(d, seq, heroId));
      setSelected(null);
      setLeft(TURN_SECONDS);
    },
    [seq, draft.step, me.name, opp?.name],
  );

  // abertura (VS) e faixas de fase
  useEffect(() => {
    const t = setTimeout(() => {
      setIntro(false);
      setPhase({ label: 'Fase de banimento', id: 0 });
    }, 2000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (phase?.id !== 0) return;
    const t = setTimeout(() => setPhase(null), 1700);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (draft.step !== 6) return;
    setPhase({ label: 'Fase de escolha', id: 6 });
    const t = setTimeout(() => setPhase(null), 1800);
    return () => clearTimeout(t);
  }, [draft.step]);

  // o carimbo (BANIDO / ESCOLHIDO) some depois de um instante
  useEffect(() => {
    if (!stamp) return;
    const t = setTimeout(() => setStamp(null), 1700);
    return () => clearTimeout(t);
  }, [stamp]);

  // IA joga na sua vez
  useEffect(() => {
    if (!step || step.actor !== 'opp' || done) return;
    const t = setTimeout(() => commit(suggest(draft)), draft.step === 0 ? 4200 : 2600);
    return () => clearTimeout(t);
  }, [draft, step, done, commit, suggest]);

  // cronômetro do usuário
  useEffect(() => {
    if (!step || step.actor !== 'user' || done) return;
    const id = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(id);
  }, [step, done, draft.step]);

  useEffect(() => {
    if (left <= 0 && step?.actor === 'user' && !done) commit(selected ?? suggest(draft));
  }, [left, step, done, commit, suggest, draft, selected]);

  // fim do draft → monta sessão e vai para "Definir posições"
  useEffect(() => {
    if (!done || finished.current || !fx) return;
    finished.current = true;
    const f = FORMATION_MAP[state.formationId]!;
    // pré-escalação: melhor combinação jogador + herói para o draft feito
    const pre = optimizePreLineup(me.squad, f.slots, state.lineup, draft.picks.user);
    const heroBySlot = pre.heroes;
    const t = setTimeout(() => {
      dispatch({ type: 'lineup', lineup: pre.lineup });
      dispatch({
        type: 'session',
        session: {
          oppId: opponentOf(fx), userFirst, bans: draft.bans, userHeroes: draft.picks.user,
          oppHeroes: draft.picks.opp, heroBySlot,
        },
      });
      setReady(true);
    }, 1900);
    return () => clearTimeout(t);
  }, [done, fx, state.formationId, state.lineup, me.squad, draft, dispatch, nav, userFirst]);

  const fullDraft = useCallback(() => {
    let d = draft;
    while (!isDone(d, seq)) d = applyStep(d, seq, suggest(d));
    setDraft(d);
  }, [draft, seq, suggest]);

  const visible = useMemo(
    () =>
      HEROES.filter((h) => (filter === 'todas' || h.roles.includes(filter)) &&
        h.name.toLowerCase().includes(query.toLowerCase())),
    [filter, query],
  );

  if (!fx || !opp) return <Navigate to="/painel" replace />;

  // quem do seu elenco rende mais com o herói em pré-visualização
  let bestFor: string | null = null;
  if (selected) {
    const ranked = me.squad.map((p) => ({ p, a: Math.round(affinity(p, selected) * 100) })).sort((x, y) => y.a - x.a)[0];
    if (ranked) bestFor = ranked.a > 0 ? `Melhor com ele: ${ranked.p.name} — ${ranked.a}%` : 'Ninguém do elenco joga com ele (afinidade baixa)';
  }

  const myTurn = step?.actor === 'user' && !done;
  const phaseLabel = !step ? 'Draft concluído' : step.kind === 'ban' ? `Fase de banimento ${draft.step + 1}` : `Fase de escolha ${draft.step - 5}`;
  const prompt = done
    ? 'Montando a partida…'
    : myTurn
      ? `Sua vez · ${step.kind === 'ban' ? 'banir um herói' : 'escolher um herói'}`
      : `${opp.name} ${step?.kind === 'ban' ? 'banindo' : 'escolhendo'}…`;

  const turnColor = step?.actor === 'opp' && !done ? OPP_COLOR : USER_COLOR;
  const nextPickIdx = (actor: Actor) =>
    step?.kind === 'pick' && step.actor === actor && !done ? draft.picks[actor].length : -1;

  const col = (actor: Actor, color: string, title: string, name: string, side: 'left' | 'right') => (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, x: side === 'left' ? -50 : 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.6, type: 'spring', stiffness: 90, damping: 16 }}
    >
      <div className={side === 'right' ? 'text-right' : ''}>
        <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color }}>● {title}</div>
        <div className="font-display text-xl font-bold uppercase" style={{ textShadow: `0 0 18px ${color}55` }}>{name}</div>
      </div>
      <div className={`text-[10px] uppercase tracking-widest text-white/35 ${side === 'right' ? 'text-right' : ''}`}>
        Bans ({draft.bans[actor].length}/{BANS_PER_TEAM})
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: BANS_PER_TEAM }, (_, i) => (
          <BanTile key={i} color={color} heroId={draft.bans[actor][i]} />
        ))}
      </div>
      <div className={`pt-2 text-[10px] uppercase tracking-widest text-white/35 ${side === 'right' ? 'text-right' : ''}`}>
        Picks ({draft.picks[actor].length}/{PICKS_PER_TEAM})
      </div>
      {Array.from({ length: PICKS_PER_TEAM }, (_, i) => (
        <PickSlot key={i} index={i} side={side} color={color} heroId={draft.picks[actor][i]} next={nextPickIdx(actor) === i} />
      ))}
    </motion.div>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0c10]" style={{ boxShadow: `0 0 80px -30px ${turnColor}88` }}>
      <DraftBackdrop color={turnColor} />
      <IntroSplash user={me} opp={opp} round={state.round} show={intro} />
      <DraftComplete show={ready} user={me} opp={opp} userPicks={draft.picks.user} oppPicks={draft.picks.opp} onContinue={() => nav('/tatica')} />
      <PhaseBanner label={phase?.label ?? null} id={phase?.id ?? 0} />
      {stamp && <div key={stamp.id} className={`draft-flash ${stamp.kind === 'ban' ? 'flash-ban' : 'flash-pick'}`} />}

      <div key={stamp?.kind === 'ban' ? stamp.id : 'idle'} className={`relative ${stamp?.kind === 'ban' ? 'draft-shake' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="min-w-[180px]">
            <div className="text-[10px] uppercase tracking-[0.4em] text-white/45">Rodada {state.round} · Jogo 1</div>
            <div className="font-display text-xl font-bold uppercase tracking-[0.3em]">{phaseLabel}</div>
            <div className={`mt-1 text-[11px] font-bold uppercase tracking-[0.25em] ${myTurn ? 'text-red-300' : 'ping-soft text-white/45'}`}>{prompt}</div>
          </div>
          <StepBar seq={seq} step={draft.step} />
          <TimerRing left={left} total={TURN_SECONDS} active={myTurn} color={USER_COLOR} />
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[230px_minmax(0,1fr)_230px]">
          {col('user', USER_COLOR, 'Mão Âmbar · você', me.name, 'left')}

          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7, type: 'spring', stiffness: 90, damping: 18 }}
          >
            <DraftStage
              stamp={stamp}
              previewId={myTurn ? (hovered ?? selected) : null}
              thinking={!myTurn && !done && step ? `${opp.name} ${step.kind === 'ban' ? 'banindo' : 'escolhendo'}` : null}
              idleText={done ? 'Draft concluído' : 'Selecione um herói'}
              hint={bestFor}
              kind={step?.kind ?? 'ban'}
            />
            <div className="flex flex-wrap items-center gap-1">
              {(['todas', ...ROLE_ORDER] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFilter(r)}
                  className={`rounded px-3 py-1.5 font-display text-xs font-bold uppercase tracking-[0.18em] transition ${
                    filter === r ? 'bg-amber text-black shadow-[0_0_16px_-2px_#f59e0b]' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {r === 'todas' ? 'Todas' : ROLES[r].label}
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar heróis"
              aria-label="Buscar heróis"
              className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-amber/60 focus:shadow-[0_0_20px_-6px_#f59e0b]"
            />
            <div className="grid max-h-[430px] grid-cols-3 gap-1.5 overflow-auto pr-1 sm:grid-cols-4 md:grid-cols-5">
              {visible.map((h, i) => {
                const isTaken = taken.has(h.id);
                const isBanned = draft.bans.user.includes(h.id) || draft.bans.opp.includes(h.id);
                return (
                  <HeroTile
                    key={h.id}
                    hero={h}
                    index={i}
                    selected={selected === h.id}
                    disabled={isTaken || !myTurn}
                    banned={isBanned}
                    taken={isTaken}
                    onPick={setSelected}
                    onHover={setHovered}
                  />
                );
              })}
            </div>
            {selected && (
              <p className="rounded border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70">
                <b className="text-white">{HERO_MAP[selected]?.name}</b> — {HERO_MAP[selected]?.blurb} Ult: <i>{HERO_MAP[selected]?.ult}</i>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                pulse={myTurn && !!selected}
                disabled={!myTurn || !selected}
                onClick={() => selected && commit(selected)}
              >
                {step?.kind === 'pick' ? 'Pronto' : 'Banir'}{selected ? ` · ${HERO_MAP[selected]?.name}` : ''}
              </Button>
              <Button disabled={!myTurn} onClick={() => commit(suggest(draft))}>Sugestão automática</Button>
              <Button className="border-dashed" disabled={done} onClick={fullDraft}>✦ Gerar draft completo</Button>
            </div>
          </motion.div>

          {col('opp', OPP_COLOR, 'Chama Safira · rival', opp.name, 'right')}
        </div>
      </div>
    </div>
  );
}
