import type { MatchResults } from '@mathcity/shared';
import { Trophy, Crown, Medal } from 'lucide-react';
import { Emblem } from './Art.tsx';
import { Badge, Button, Card, SectionTitle } from './ui.tsx';

const SCORE_LABELS: Record<string, string> = {
  battle: 'Battle 30%',
  mathematics: 'Mathematics 25%',
  survival: 'Survival 15%',
  crisis: 'City Crisis 10%',
  development: 'Development 10%',
  resourceEfficiency: 'Efficiency 5%',
  teamwork: 'Teamwork 5%',
};

function PodiumBlock({ results }: { results: MatchResults }) {
  const podium = results.teams.slice(0, 3);
  const order = [podium[1], podium[0], podium[2]].filter(Boolean);
  const heights = ['h-24', 'h-32', 'h-20'];
  const colors = ['bg-slate-500/40', 'bg-sunrise-500/50', 'bg-orange-800/50'];
  return (
    <div className="flex items-end justify-center gap-3 py-4" aria-label="winners podium">
      {order.map((team, i) => (
        <div key={team.teamId} className="flex flex-col items-center animate-slide-up" style={{ animationDelay: `${i * 0.15}s` }}>
          {team.placement === 1 && <Crown className="w-7 h-7 text-sunrise-400 mb-1" aria-hidden />}
          <Emblem kind={team.emblem} size={team.placement === 1 ? 64 : 52} />
          <p className="font-black text-sm mt-1 max-w-28 truncate">{team.name}</p>
          <p className="text-xs text-slate-400">{team.victoryScore.toFixed(1)} pts</p>
          <div className={`${heights[i]} ${colors[i]} w-24 rounded-t-xl mt-2 flex items-start justify-center pt-2`}>
            <span className="text-2xl font-black">#{team.placement}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResultsView({
  results, yourPlayerId, onPlayAgain, onHub,
}: {
  results: MatchResults;
  yourPlayerId: string | null;
  onPlayAgain: () => void;
  onHub: () => void;
}) {
  const mvp = results.players.find((p) => p.playerId === results.matchMvpId);
  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-slide-up pb-10">
      <div className="text-center pt-4">
        <SectionTitle className="text-2xl">Match complete!</SectionTitle>
        <p className="text-sm text-slate-400 capitalize">{results.mode} match · {results.teams.length} teams</p>
      </div>

      <PodiumBlock results={results} />

      {mvp && (
        <Card glow className="text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Match MVP</p>
          <p className="text-2xl font-black text-sunrise-300">
            <Trophy className="inline w-6 h-6 mr-1 -mt-1" aria-hidden />{mvp.name}
          </p>
          <p className="text-sm text-slate-300">
            {mvp.contributionPercent}% contribution · {mvp.accuracy}% accuracy · {mvp.advancedSolved} advanced solved · MVP score {mvp.mvpScore}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-2" aria-label="top MVP candidates">
            {results.mvpCandidates.map((c, i) => (
              <Badge key={c.playerId} tone={i === 0 ? 'gold' : 'slate'}>
                {i + 1}. {c.name} ({c.score})
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle className="mb-3">Full placement table</SectionTitle>
        <div className="overflow-x-auto mc-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-2">#</th>
                <th className="pr-2">Team</th>
                <th className="pr-2">Score</th>
                <th className="pr-2">Core</th>
                <th className="pr-2">Maths</th>
                <th className="pr-2">Crisis dmg</th>
                <th className="pr-2">Season pts</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {results.teams.map((t) => (
                <tr key={t.teamId} className={`border-t border-night-700 ${t.placement === 1 ? 'bg-sunrise-500/5' : ''}`}>
                  <td className="py-2 pr-2 font-black">
                    {t.placement === 1 ? <Crown className="inline w-4 h-4 text-sunrise-400" aria-label="champion" /> : t.placement <= 3 ? <Medal className="inline w-4 h-4 text-lake-300" aria-hidden /> : null} {t.placement}
                  </td>
                  <td className="pr-2 font-bold">
                    <span className="inline-flex items-center gap-1.5"><Emblem kind={t.emblem} size={22} />{t.name}{t.knockedOut && <Badge tone="red">KO</Badge>}</span>
                  </td>
                  <td className="pr-2 font-mono">{t.victoryScore.toFixed(1)}</td>
                  <td className="pr-2 font-mono">{t.coreHealth}</td>
                  <td className="pr-2 font-mono">{t.mathsAccuracy}%</td>
                  <td className="pr-2 font-mono">{t.crisisReport ? t.crisisReport.finalDamage : '—'}</td>
                  <td className="pr-2 font-mono text-meadow-400">+{t.seasonPointsGained}</td>
                  <td className={`font-mono ${t.ratingChange > 0 ? 'text-meadow-400' : t.ratingChange < 0 ? 'text-ember-400' : 'text-slate-400'}`}>
                    {t.ratingChange > 0 ? '+' : ''}{t.ratingChange}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <SectionTitle className="mb-3">Score breakdown — champion</SectionTitle>
          {Object.entries(results.teams[0]?.scoreBreakdown ?? {}).map(([key, value]) => (
            <div key={key} className="mb-2">
              <div className="flex justify-between text-xs font-bold mb-0.5">
                <span className="text-slate-300">{SCORE_LABELS[key] ?? key}</span>
                <span className="text-lake-300">{value}</span>
              </div>
              <div className="h-2 rounded-full bg-night-900 overflow-hidden">
                <div className="h-full bg-lake-500 rounded-full" style={{ width: `${Math.min(100, (value / 30) * 100)}%` }} />
              </div>
            </div>
          ))}
          {results.teams[0]?.crisisReport && (
            <div className="mt-3 text-xs text-slate-300 bg-night-900/60 rounded-xl p-3" aria-label="crisis breakdown">
              {results.teams[0].crisisReport.breakdownLines.map((line, i) => (
                <p key={i} className={i === results.teams[0].crisisReport!.breakdownLines.length - 1 ? 'font-black text-lake-300 mt-1' : ''}>{line}</p>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle className="mb-3">Player contributions</SectionTitle>
          <div className="space-y-3 max-h-80 overflow-y-auto mc-scroll pr-1">
            {results.teams.map((t) => (
              <div key={t.teamId}>
                <p className="text-xs font-black text-slate-400 mb-1">#{t.placement} {t.name}</p>
                {results.players.filter((p) => p.teamId === t.teamId).map((p) => (
                  <div key={p.playerId} className={`flex items-center gap-2 text-xs py-1 ${p.playerId === yourPlayerId ? 'text-sunrise-300 font-black' : ''}`}>
                    <span className="w-32 truncate font-bold">
                      {p.name}
                      {p.isTeamMvp && <span title="Team MVP"> ⭐</span>}
                      {p.isMatchMvp && <span title="Match MVP"> 🏆</span>}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-night-900 overflow-hidden">
                      <div className="h-full bg-meadow-500 rounded-full" style={{ width: `${p.contributionPercent}%` }} />
                    </div>
                    <span className="font-mono w-9 text-right">{p.contributionPercent}%</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-400">
        {results.awards.bestAttack && <Badge tone="red">Best attack: {results.teams.find((t) => t.teamId === results.awards.bestAttack!.teamId)?.name} ({results.awards.bestAttack.value})</Badge>}
        {results.awards.bestDefense && <Badge tone="lake">Best defense: {results.teams.find((t) => t.teamId === results.awards.bestDefense!.teamId)?.name} ({results.awards.bestDefense.value})</Badge>}
        {results.awards.bestCrisis && <Badge tone="green">Best crisis: {results.teams.find((t) => t.teamId === results.awards.bestCrisis!.teamId)?.name} (only {results.awards.bestCrisis.value} dmg)</Badge>}
      </div>

      <div className="flex justify-center gap-3 pt-2">
        <Button variant="gold" size="lg" onClick={onPlayAgain}>Play again</Button>
        <Button variant="secondary" size="lg" onClick={onHub}>Return to Hub</Button>
      </div>
    </div>
  );
}
