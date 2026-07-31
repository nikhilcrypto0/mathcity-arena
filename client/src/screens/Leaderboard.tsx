import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { LeaderboardPlayerRow, LeaderboardTeamRow, RankContext } from '@mathcity/shared';
import { useApp } from '../lib/store.ts';
import { apiClient } from '../lib/api.ts';
import { Emblem } from '../components/Art.tsx';
import { Card, SectionTitle } from '../components/ui.tsx';

type Tab = 'season' | 'all' | 'players' | 'mvp' | 'lifetime' | 'friends' | 'tournament';

const TABS: { id: Tab; label: string }[] = [
  { id: 'season', label: 'Season Top 50' },
  { id: 'all', label: 'All Teams' },
  { id: 'players', label: 'Players' },
  { id: 'mvp', label: 'MVP Leaders' },
  { id: 'lifetime', label: 'Lifetime Teams' },
  { id: 'friends', label: 'Friends' },
  { id: 'tournament', label: 'Private Tournament' },
];

const PAGE_SIZE = 10;

export default function Leaderboard() {
  const team = useApp((s) => s.team);
  const [tab, setTab] = useState<Tab>('season');
  const [teamRows, setTeamRows] = useState<LeaderboardTeamRow[]>([]);
  const [context, setContext] = useState<RankContext | null>(null);
  const [playerRows, setPlayerRows] = useState<LeaderboardPlayerRow[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
    if (tab === 'season' || tab === 'all' || tab === 'lifetime') {
      apiClient
        .teamLeaderboard(tab === 'lifetime' ? 'lifetime' : 'season', team?.id)
        .then((r) => { setTeamRows(r.top); setContext(r.context); })
        .catch(() => {});
    } else if (tab === 'players' || tab === 'mvp') {
      apiClient.playerLeaderboard(tab === 'mvp' ? 'mvp' : 'points').then((r) => setPlayerRows(r.rows)).catch(() => {});
    }
  }, [tab, team?.id]);

  const filteredTeams = useMemo(
    () => teamRows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())),
    [teamRows, query],
  );
  const filteredPlayers = useMemo(
    () => playerRows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())),
    [playerRows, query],
  );

  const showTeams = tab === 'season' || tab === 'all' || tab === 'lifetime';
  const pagedTeams = filteredTeams.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pagedPlayers = filteredPlayers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const total = showTeams ? filteredTeams.length : filteredPlayers.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4 animate-slide-up">
      <SectionTitle className="text-2xl">Leaderboards</SectionTitle>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="leaderboard tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-xl text-sm font-black cursor-pointer transition-all ${
              tab === t.id ? 'bg-lake-500/25 text-lake-300 ring-1 ring-lake-400' : 'bg-night-800/70 text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {context && tab === 'season' && context.rank > 50 && (
        <Card className="border-sunrise-500/40">
          <p className="font-black text-sunrise-300">Your team is ranked #{context.rank}.</p>
          {context.pointsToNext !== null && (
            <p className="text-sm text-slate-300">Earn {context.pointsToNext} more points to reach the next meaningful rank.</p>
          )}
          <div className="text-xs text-slate-400 mt-1">
            {context.above && <p>Above you: {context.above.name} ({context.above.seasonPoints} pts)</p>}
            {context.below && <p>Below you: {context.below.name} ({context.below.seasonPoints} pts)</p>}
          </div>
        </Card>
      )}

      {(tab === 'friends' || tab === 'tournament') ? (
        <Card>
          <p className="text-sm text-slate-300 font-bold mb-1">
            {tab === 'friends' ? 'Friends leaderboard' : 'Private tournaments'}
          </p>
          <p className="text-sm text-slate-400">
            {tab === 'friends'
              ? 'Join a party with friends and finish a match together — friend rankings build from your shared match history.'
              : 'Create a private tournament from a party using an invite code: pick match duration, rounds, team count and ranked status. Families, schools, coaching centres and community groups can run one — no teacher role required, and advanced mathematics stays freely available to all players outside tournament settings.'}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-slate-400" aria-hidden />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              placeholder={showTeams ? 'Search teams…' : 'Search players…'}
              className="flex-1 bg-transparent border-b border-night-600 focus:border-lake-400 text-sm font-bold py-1 outline-none"
              aria-label="search leaderboard"
            />
          </div>

          <div className="overflow-x-auto mc-scroll">
            {showTeams ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-2 pr-2">Rank</th>
                    <th className="pr-2">Team</th>
                    <th className="pr-2">Matches</th>
                    <th className="pr-2">Wins</th>
                    <th className="pr-2">Win %</th>
                    <th className="pr-2">Top 3</th>
                    <th className="pr-2">Avg place</th>
                    <th className="pr-2">Points</th>
                    <th className="pr-2">Streak</th>
                    <th className="pr-2">Maths %</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTeams.map((r) => (
                    <tr key={r.teamId} className={`border-t border-night-700 ${r.teamId === team?.id ? 'bg-sunrise-500/10' : ''}`}>
                      <td className="py-2 pr-2 font-black">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}</td>
                      <td className="pr-2">
                        <Link to={`/team/${r.teamId}`} className="inline-flex items-center gap-1.5 font-bold hover:text-lake-300">
                          <Emblem kind={r.emblem} size={20} />{r.name}
                        </Link>
                      </td>
                      <td className="pr-2 font-mono">{r.matchesPlayed}</td>
                      <td className="pr-2 font-mono">{r.wins}</td>
                      <td className="pr-2 font-mono">{r.winRatio}%</td>
                      <td className="pr-2 font-mono">{r.topThree}</td>
                      <td className="pr-2 font-mono">{r.averagePlacement ?? '—'}</td>
                      <td className="pr-2 font-mono font-black text-sunrise-300">{r.seasonPoints}</td>
                      <td className="pr-2 font-mono">{r.currentStreak > 0 ? `🔥${r.currentStreak}` : '—'}</td>
                      <td className="pr-2 font-mono">{r.mathsAccuracy}%</td>
                      <td className="font-mono">{r.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-2 pr-2">Rank</th>
                    <th className="pr-2">Player</th>
                    <th className="pr-2">Team</th>
                    <th className="pr-2">Matches</th>
                    <th className="pr-2">Wins</th>
                    <th className="pr-2">Match MVP</th>
                    <th className="pr-2">Team MVP</th>
                    <th className="pr-2">Maths %</th>
                    <th className="pr-2">Advanced</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPlayers.map((r) => (
                    <tr key={r.playerId} className="border-t border-night-700">
                      <td className="py-2 pr-2 font-black">#{r.rank}</td>
                      <td className="pr-2 font-bold">{r.name}</td>
                      <td className="pr-2 text-slate-400">{r.teamName ?? '—'}</td>
                      <td className="pr-2 font-mono">{r.matches}</td>
                      <td className="pr-2 font-mono">{r.wins}</td>
                      <td className="pr-2 font-mono text-sunrise-300">{r.matchMvpAwards}</td>
                      <td className="pr-2 font-mono">{r.teamMvpAwards}</td>
                      <td className="pr-2 font-mono">{r.mathsAccuracy}%</td>
                      <td className="pr-2 font-mono">{r.advancedSolved}</td>
                      <td className="font-mono font-black text-sunrise-300">{r.seasonPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-slate-500">{total} entries</p>
            <div className="flex gap-1" role="group" aria-label="pagination">
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  aria-current={page === i}
                  className={`w-8 h-8 rounded-lg text-xs font-black cursor-pointer ${page === i ? 'bg-lake-500/30 text-lake-300' : 'bg-night-800 text-slate-400'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          {tab === 'season' && (
            <p className="text-[11px] text-slate-500 mt-2">
              Ranked by: season points → wins → average placement → maths accuracy → rating → recency. Deterministic tie-breaks.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
