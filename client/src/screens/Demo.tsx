import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import type { MatchPhase } from '@mathcity/shared';
import { useApp } from '../lib/store.ts';
import { actions } from '../lib/socket.ts';
import { Badge, Button, Card, Countdown, SectionTitle } from '../components/ui.tsx';
import { CityMap } from '../components/CityMap.tsx';
import { EventFeed } from '../components/EventFeed.tsx';
import { ResultsView } from '../components/ResultsView.tsx';

const PHASE_LABELS: Record<MatchPhase, string> = {
  preparation: 'Team Preparation',
  knowledge_rush: 'Knowledge Rush — teams answer mathematics to earn resources',
  build: 'Build & Fortify — districts under construction',
  crisis: 'CITY CRISIS — the flood hits every team with the same base damage',
  raid: 'Open Raid Period — attacks and defenses',
  final_surge: 'FINAL SURGE — last strategic pushes',
  finished: 'Final placements!',
};

export default function Demo() {
  const snapshot = useApp((s) => s.snapshot);
  const results = useApp((s) => s.results);
  const demo = useApp((s) => s.demo);
  const clearMatch = useApp((s) => s.clearMatch);
  const [started, setStarted] = useState(false);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => forceTick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => { actions.demoStop(); clearMatch(); }, [clearMatch]);

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 px-4 animate-slide-up">
        <SectionTitle className="text-3xl mb-3">Demo Mode</SectionTitle>
        <p className="text-slate-300 mb-2">
          One click launches a complete simulated match: <strong>6 teams, 18 synthetic players</strong> —
          matchmaking, Knowledge Rush, district building, a global flood with the same 1,000 base damage
          for every team, raids, dragons, knockouts, live placements, MVPs and the podium.
        </p>
        <p className="text-xs text-slate-500 mb-8">
          Everything runs through the real game engine — the demo simulates players, not features.
          Understandable in about 90 seconds. All names are synthetic.
        </p>
        <Button variant="gold" size="lg" onClick={() => { clearMatch(); actions.demoStart(); setStarted(true); }}>
          ▶ Launch Full Demo Match
        </Button>
      </div>
    );
  }

  if (results) {
    return (
      <div className="px-4 py-4">
        <div className="text-center mb-2">
          <Badge tone="gold">DEMO — final results</Badge>
        </div>
        <ResultsView
          results={results}
          yourPlayerId={null}
          onPlayAgain={() => { clearMatch(); actions.demoControl('reset'); }}
          onHub={() => { clearMatch(); actions.demoStop(); setStarted(false); }}
        />
      </div>
    );
  }

  if (!snapshot) {
    return <p className="text-center py-20 text-slate-400 font-bold">Preparing the demo arena…</p>;
  }

  return (
    <div className="px-3 py-3 max-w-[1400px] mx-auto">
      <div className="mc-card px-4 py-2.5 flex flex-wrap items-center gap-3 mb-3">
        <Badge tone="gold">DEMO</Badge>
        <span className="text-sm font-bold text-slate-200">{PHASE_LABELS[snapshot.phase]}</span>
        <span className="text-xs text-slate-400">
          Phase: <Countdown endsAt={snapshot.phaseEndsAt} />
        </span>
        <div className="ml-auto flex items-center gap-1.5" role="group" aria-label="demo controls">
          <Button variant="secondary" size="sm" onClick={() => actions.demoControl(demo.paused ? 'play' : 'pause')} aria-label={demo.paused ? 'auto play' : 'pause'}>
            {demo.paused ? <Play className="w-4 h-4" aria-hidden /> : <Pause className="w-4 h-4" aria-hidden />}
            <span className="ml-1">{demo.paused ? 'Auto Play' : 'Pause'}</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => actions.demoControl('next')} aria-label="next event">
            <SkipForward className="w-4 h-4" aria-hidden /><span className="ml-1">Next Event</span>
          </Button>
          {[1, 2, 4].map((speed) => (
            <Button
              key={speed}
              variant={demo.speed === speed ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => actions.demoControl('speed', speed)}
              aria-pressed={demo.speed === speed}
            >
              {speed}x
            </Button>
          ))}
          <Button variant="danger" size="sm" onClick={() => { clearMatch(); actions.demoControl('reset'); }} aria-label="reset demo">
            <RotateCcw className="w-4 h-4" aria-hidden /><span className="ml-1">Reset</span>
          </Button>
        </div>
      </div>

      {snapshot.crisisWarning && (
        <div className="rounded-2xl border-2 border-lake-400/60 bg-lake-500/10 px-4 py-3 mb-3" role="alert">
          <p className="font-black text-lake-300">
            🌊 {snapshot.crisisWarning.name}: {snapshot.crisisWarning.baseDamage} base damage for EVERY team —
            only preparation changes the outcome. Impact in <Countdown endsAt={snapshot.crisisWarning.strikesAt} />.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-3">
        <CityMap snapshot={snapshot} yourTeamId={null} raidPhase={false} onAttack={() => {}} />
        <div className="space-y-3">
          <Card>
            <SectionTitle className="mb-2 text-sm">What you are watching</SectionTitle>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li>• 18 synthetic players answering real bank questions</li>
              <li>• Resources → structures → crisis prep → raids</li>
              <li>• The flood applies the SAME base damage to all six districts</li>
              <li>• Final damage differs only through preparation (shown per team)</li>
              <li>• Watch for dragons, shields, knockouts and the podium</li>
            </ul>
          </Card>
          <EventFeed events={snapshot.events} />
        </div>
      </div>
    </div>
  );
}
