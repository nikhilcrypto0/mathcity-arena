import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CharacterId, MatchPhase } from '@mathcity/shared';
import { CloudLightning, Swords } from 'lucide-react';
import { useApp } from '../lib/store.ts';
import { actions } from '../lib/socket.ts';
import { Badge, Button, Card, Countdown } from '../components/ui.tsx';
import { CityMap } from '../components/CityMap.tsx';
import { EventFeed } from '../components/EventFeed.tsx';
import { TeamPanel, Placement } from '../components/TeamPanel.tsx';
import { QuestionCard } from '../components/QuestionCard.tsx';
import { ResultsView } from '../components/ResultsView.tsx';
import { Emblem, Avatar } from '../components/Art.tsx';

const PHASE_LABELS: Record<MatchPhase, string> = {
  preparation: 'Phase 1 · Team Preparation',
  knowledge_rush: 'Phase 2 · Knowledge Rush',
  build: 'Phase 3 · Build & Fortify',
  crisis: 'Phase 4 · City Crisis',
  raid: 'Phase 5 · Open Raids',
  final_surge: 'Phase 6 · FINAL SURGE',
  finished: 'Match complete',
};

type QuestionContext = 'earn' | 'attack' | 'defense' | 'crisis';

export default function Battle() {
  const profile = useApp((s) => s.profile);
  const snapshot = useApp((s) => s.snapshot);
  const question = useApp((s) => s.question);
  const answerResult = useApp((s) => s.answerResult);
  const results = useApp((s) => s.results);
  const signal = useApp((s) => s.signal);
  const clearMatch = useApp((s) => s.clearMatch);
  const set = useApp((s) => s.set);
  const navigate = useNavigate();
  const [context, setContext] = useState<QuestionContext>('earn');
  const [advanced, setAdvanced] = useState(false);
  const [, forceTick] = useState(0);

  // Re-render countdowns every second.
  useEffect(() => {
    const timer = setInterval(() => forceTick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!snapshot && !results) {
      actions.requestSnapshot();
      const timeout = setTimeout(() => {
        if (!useApp.getState().snapshot && !useApp.getState().results) navigate('/hub');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [snapshot, results, navigate]);

  if (results && profile) {
    return (
      <div className="px-4 py-4">
        <ResultsView
          results={results}
          yourPlayerId={profile.id}
          onPlayAgain={() => { clearMatch(); navigate('/hub'); }}
          onHub={() => { clearMatch(); navigate('/hub'); }}
        />
      </div>
    );
  }

  if (!snapshot || !profile) {
    return <p className="text-center py-20 text-slate-400 font-bold">Connecting to the arena…</p>;
  }

  const yourTeam = snapshot.teams.find((t) => t.teamId === snapshot.yourTeamId);
  const phase = snapshot.phase;
  const raidPhase = phase === 'raid' || phase === 'final_surge';
  const beingRaided = Boolean(yourTeam && snapshot.teams.some((t) => t.activeRaidTarget === yourTeam.teamId));
  const raiding = Boolean(yourTeam?.activeRaidTarget);
  const crisisPrep = Boolean(snapshot.crisisWarning);

  const effectiveContext: QuestionContext =
    context === 'crisis' && !crisisPrep ? 'earn'
    : context === 'defense' && !beingRaided ? 'earn'
    : context === 'attack' && !raiding ? 'earn'
    : context;

  const contexts: { id: QuestionContext; label: string; show: boolean; accent?: boolean }[] = [
    { id: 'earn', label: advanced ? '⭐ Advanced' : 'Earn resources', show: true },
    { id: 'crisis', label: '⛈️ Crisis prep', show: crisisPrep, accent: true },
    { id: 'attack', label: '⚔️ Power attack', show: raiding, accent: true },
    { id: 'defense', label: '🛡️ Defend!', show: beingRaided, accent: true },
  ];

  return (
    <div className="px-3 py-3 max-w-[1500px] mx-auto">
      {/* Top bar */}
      <div className="mc-card px-4 py-2.5 flex flex-wrap items-center gap-3 mb-3">
        <Badge tone={phase === 'final_surge' ? 'gold' : 'lake'}>{PHASE_LABELS[phase]}</Badge>
        <span className="text-sm font-bold text-slate-300">
          Phase ends in <Countdown endsAt={snapshot.phaseEndsAt} className="text-white text-base" />
        </span>
        <span className="text-xs text-slate-500">
          Match: <Countdown endsAt={snapshot.matchEndsAt} />
        </span>
        {yourTeam && <span className="ml-auto"><Placement team={yourTeam} snapshot={snapshot} /></span>}
      </div>

      {/* Crisis warning banner */}
      {snapshot.crisisWarning && (
        <div className="rounded-2xl border-2 border-lake-400/60 bg-lake-500/10 px-4 py-3 mb-3 animate-pulse-glow" role="alert">
          <div className="flex flex-wrap items-center gap-3">
            <CloudLightning className="w-8 h-8 text-lake-300" aria-hidden />
            <div className="flex-1 min-w-48">
              <p className="font-black text-lake-300">
                {snapshot.crisisWarning.name} incoming — {snapshot.crisisWarning.baseDamage} base damage for EVERY district!
              </p>
              <p className="text-xs text-slate-300">{snapshot.crisisWarning.description}</p>
              <p className="text-xs text-slate-400 mt-0.5">Protection: {snapshot.crisisWarning.protectionOptions.join(' · ')}</p>
            </div>
            <div className="text-center">
              <Countdown endsAt={snapshot.crisisWarning.strikesAt} className="text-2xl text-lake-300" />
              <p className="text-[10px] uppercase text-slate-400">until impact</p>
            </div>
            {yourTeam && (
              <Button variant="primary" size="sm" onClick={() => { setContext('crisis'); actions.requestQuestion('crisis'); }}>
                Solve crisis question
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Signal ping */}
      {signal && Date.now() - signal.at < 5000 && (
        <div className="rounded-xl bg-sunrise-500/15 border border-sunrise-500/40 px-4 py-2 mb-3 animate-pop" role="status">
          <p className="text-sm font-black text-sunrise-300">📣 {signal.from}: {signal.signal.text}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_400px] gap-3">
        {/* Left: map + feed */}
        <div className="space-y-3">
          <CityMap
            snapshot={snapshot}
            yourTeamId={snapshot.yourTeamId}
            raidPhase={raidPhase}
            onAttack={(teamId) => actions.attack(teamId)}
          />
          <EventFeed events={snapshot.events} />
        </div>

        {/* Right: questions + team panel */}
        <div className="space-y-3">
          {phase === 'preparation' && yourTeam ? (
            <PrepPanel yourTeam={yourTeam} />
          ) : (
            <Card>
              <div className="flex flex-wrap items-center gap-1.5 mb-3" role="tablist" aria-label="question type">
                {contexts.filter((c) => c.show).map((c) => (
                  <button
                    key={c.id}
                    role="tab"
                    aria-selected={effectiveContext === c.id}
                    onClick={() => { setContext(c.id); actions.requestQuestion(c.id, c.id === 'earn' && advanced); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      effectiveContext === c.id
                        ? c.accent ? 'bg-sunrise-500/25 text-sunrise-300 ring-1 ring-sunrise-400' : 'bg-lake-500/25 text-lake-300'
                        : 'bg-night-900/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
                <label className="ml-auto flex items-center gap-1.5 text-xs font-bold text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advanced}
                    onChange={(e) => setAdvanced(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Advanced
                </label>
              </div>

              {question || answerResult ? (
                <QuestionCard
                  question={question}
                  result={answerResult}
                  onSubmit={(id, answer) => actions.answer(id, answer)}
                  onNext={() => {
                    set({ answerResult: null });
                    actions.requestQuestion(effectiveContext, effectiveContext === 'earn' && advanced);
                  }}
                />
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-400 mb-3">
                    {phase === 'knowledge_rush' && 'Answer questions to earn coins, materials, energy and mana!'}
                    {phase === 'build' && 'Keep earning — and build your district from the Build tab.'}
                    {phase === 'crisis' && 'Prepare! Solve crisis questions and build protective structures.'}
                    {raidPhase && 'Earn energy, deploy characters, and strike from the city map.'}
                  </p>
                  <Button variant="gold" onClick={() => actions.requestQuestion(effectiveContext, effectiveContext === 'earn' && advanced)}>
                    Get a question
                  </Button>
                </div>
              )}
            </Card>
          )}

          {yourTeam && phase !== 'preparation' && (
            <TeamPanel
              team={yourTeam}
              unlockedCharacters={profile.unlockedCharacters as CharacterId[]}
              playerId={profile.id}
            />
          )}

          {!yourTeam && (
            <Card>
              <p className="text-sm text-slate-400">Spectating — you are not part of this match.</p>
            </Card>
          )}

          {yourTeam?.knockedOut && (
            <Card className="border-ember-500/50">
              <p className="font-black text-ember-400 mb-1"><Swords className="inline w-4 h-4 mr-1" aria-hidden />Your district was knocked out.</p>
              <p className="text-xs text-slate-400">
                You keep every bit of learning progress and all statistics from this match.
                Watch the finale — placements are decided by knockout order.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PrepPanel({ yourTeam }: { yourTeam: { players: { playerId: string; name: string; avatar: string; role: string | null; character: string | null }[]; name: string; emblem: string } }) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <Emblem kind={yourTeam.emblem} size={44} />
        <div>
          <p className="font-black">{yourTeam.name}</p>
          <p className="text-xs text-slate-400">Review your team — the Knowledge Rush starts soon!</p>
        </div>
      </div>
      <ul className="space-y-2 mb-3">
        {yourTeam.players.map((p) => (
          <li key={p.playerId} className="flex items-center gap-2 text-sm bg-night-900/50 rounded-xl px-3 py-2">
            <Avatar kind={p.avatar} size={30} />
            <span className="font-bold">{p.name}</span>
            {p.role && <Badge tone="lake">{p.role}</Badge>}
          </li>
        ))}
      </ul>
      <div className="text-xs text-slate-400 space-y-1 bg-night-900/40 rounded-xl p-3">
        <p className="font-black text-slate-300">Match plan</p>
        <p>1. Knowledge Rush — answer questions, stack resources.</p>
        <p>2. Build & Fortify — walls, drainage, academies.</p>
        <p>3. Survive the City Crisis — same base damage for everyone.</p>
        <p>4. Open Raids — attack rivals, defend your core.</p>
        <p>5. Final Surge — every answer counts extra!</p>
      </div>
    </Card>
  );
}
