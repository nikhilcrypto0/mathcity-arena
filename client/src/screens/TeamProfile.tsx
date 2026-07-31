import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { CharacterId } from '@mathcity/shared';
import { apiClient } from '../lib/api.ts';
import { Avatar, CharacterArt, Emblem } from '../components/Art.tsx';
import { Badge, Card, SectionTitle, Stat } from '../components/ui.tsx';

type TeamProfileData = Awaited<ReturnType<typeof apiClient.teamProfile>>;

export default function TeamProfile() {
  const { teamId } = useParams<{ teamId: string }>();
  const [data, setData] = useState<TeamProfileData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (teamId) apiClient.teamProfile(teamId).then(setData).catch(() => setError(true));
  }, [teamId]);

  if (error) return <p className="text-center py-20 text-slate-400 font-bold">Team not found.</p>;
  if (!data) return <p className="text-center py-20 text-slate-400 font-bold">Loading team…</p>;

  const { team, members, history } = data;
  const s = team.stats;
  const accuracy = s.questionsAttempted > 0 ? Math.round((s.questionsCorrect / s.questionsAttempted) * 100) : 0;
  const characterMastery = new Set(members.flatMap((m) => m.unlockedCharacters));

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-slide-up">
      <Link to="/leaderboard" className="inline-flex items-center gap-1 text-sm font-bold text-lake-300">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Leaderboard
      </Link>

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Emblem kind={team.emblem} size={72} />
          <div className="flex-1 min-w-52">
            <SectionTitle className="text-2xl">{team.name}</SectionTitle>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {data.seasonRank && <Badge tone="gold">Season rank #{data.seasonRank}</Badge>}
              {data.lifetimeRank && <Badge tone="lake">Lifetime rank #{data.lifetimeRank}</Badge>}
              <Badge tone="slate">Rating {team.rating}</Badge>
              {team.badges.map((b) => <Badge key={b} tone="gold">🏅 {b}</Badge>)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Stat label="Matches" value={s.matchesPlayed} />
          <Stat label="Wins" value={s.wins} accent />
          <Stat label="Win ratio" value={`${data.winRatio}%`} />
          <Stat label="Top 3" value={s.wins + s.second + s.third} />
          <Stat label="Avg place" value={s.matchesPlayed ? (s.placementSum / s.matchesPlayed).toFixed(1) : '—'} />
          <Stat label="Maths" value={`${accuracy}%`} />
          <Stat label="Season pts" value={team.seasonPoints} accent />
          <Stat label="Best streak" value={s.bestWinStreak} />
          <Stat label="Crisis survived" value={`${s.crisisSurvived}/${s.crisisFaced}`} />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <SectionTitle className="mb-3">Members</SectionTitle>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.playerId} className="flex items-center gap-3 bg-night-900/50 rounded-xl px-3 py-2">
                <Avatar kind={m.avatar} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{m.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {m.stats.matchesPlayed} matches · {m.stats.matchMvpAwards ?? 0} MVP · {m.seasonPoints} pts
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle className="mb-3">MVP & mastery</SectionTitle>
          <p className="text-sm text-slate-300 mb-2">
            MVP awards: <span className="font-black text-sunrise-300">
              {members.reduce((sum, m) => sum + (m.stats.matchMvpAwards ?? 0) + (m.stats.teamMvpAwards ?? 0), 0)}
            </span>
          </p>
          <p className="text-sm text-slate-300 mb-2">
            Dragons deployed: 🐉 {s.dragonsDeployed.standard} · ⚡ {s.dragonsDeployed.elite} · 👑 {s.dragonsDeployed.mythic}
          </p>
          <p className="text-xs font-bold text-slate-400 mb-1">Character mastery across the team:</p>
          <div className="flex flex-wrap gap-1">
            {[...characterMastery].map((id) => (
              <CharacterArt key={id} id={id as CharacterId} size={36} />
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle className="mb-3">Match history</SectionTitle>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">No matches recorded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {history.map((h) => (
              <li key={h.matchId} className="flex items-center gap-3 text-sm bg-night-900/50 rounded-xl px-3 py-2">
                <span className={`font-black w-8 ${h.placement === 1 ? 'text-sunrise-400' : h.placement <= 3 ? 'text-lake-300' : 'text-slate-400'}`}>
                  #{h.placement}
                </span>
                <span className="capitalize text-slate-400 w-16">{h.mode}</span>
                <span className="font-mono">{h.victoryScore.toFixed(1)} score</span>
                <span className="font-mono text-meadow-400 ml-auto">+{h.seasonPointsGained} pts</span>
                <span className="text-[11px] text-slate-500">{new Date(h.endedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
