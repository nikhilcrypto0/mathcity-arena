import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Search, ChevronRight, Users, Crown } from 'lucide-react';
import type { LeaderboardPlayerRow, LeaderboardTeamRow, RankContext } from '@mathcity/shared';
import { useApp } from '../lib/store.ts';
import { apiClient } from '../lib/api.ts';
import { Emblem } from '../components/Art.tsx';

type Tab = 'season' | 'players' | 'mvp' | 'lifetime' | 'friends' | 'tournament';

const TABS: { id: Tab; label: string }[] = [
  { id: 'season', label: 'Season Top 50' },
  { id: 'lifetime', label: 'Lifetime Teams' },
  { id: 'players', label: 'Players' },
  { id: 'mvp', label: 'MVP Leaders' },
  { id: 'friends', label: 'Friends' },
  { id: 'tournament', label: 'Private Tournament' },
];

const PAGE_SIZE = 12;

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: '8px 13px', borderRadius: 9, border: '1px solid var(--line)', cursor: 'pointer',
    fontSize: 10, fontWeight: 900, letterSpacing: '.05em',
    background: active ? 'rgba(57,217,154,.14)' : '#0d2b43',
    color: active ? '#8df3cd' : '#91a9bf',
    borderColor: active ? 'rgba(57,217,154,.4)' : 'var(--line)',
  };
}

export default function Leaderboard() {
  const team = useApp((s) => s.team);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('season');
  const [teamRows, setTeamRows] = useState<LeaderboardTeamRow[]>([]);
  const [context, setContext] = useState<RankContext | null>(null);
  const [playerRows, setPlayerRows] = useState<LeaderboardPlayerRow[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
    if (tab === 'season' || tab === 'lifetime') {
      apiClient.teamLeaderboard(tab === 'lifetime' ? 'lifetime' : 'season', team?.id)
        .then((r) => { setTeamRows(r.top); setContext(r.context); }).catch(() => {});
    } else if (tab === 'players' || tab === 'mvp') {
      apiClient.playerLeaderboard(tab === 'mvp' ? 'mvp' : 'points').then((r) => setPlayerRows(r.rows)).catch(() => {});
    }
  }, [tab, team?.id]);

  const showTeams = tab === 'season' || tab === 'lifetime';
  const filteredTeams = useMemo(() => teamRows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())), [teamRows, query]);
  const filteredPlayers = useMemo(() => playerRows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())), [playerRows, query]);
  const total = showTeams ? filteredTeams.length : filteredPlayers.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pagedTeams = filteredTeams.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pagedPlayers = filteredPlayers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const isInfo = tab === 'friends' || tab === 'tournament';

  return (
    <main className="subpage">
      <button className="back-button" onClick={() => navigate('/hub')}><ArrowLeft /> Back to Game Hub</button>

      <section className="subpage-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span className="academy-emblem"><Trophy /></span>
          <div>
            <span className="eyebrow">LEADERBOARDS</span>
            <h1>Season standings.</h1>
            <p>Ranked by season points, wins, average placement, mathematics accuracy, rating and recency — with deterministic tie-breaks.</p>
          </div>
        </div>
        {!isInfo && <div className="collection-count"><strong>{total}</strong><span>{showTeams ? 'teams' : 'players'}</span></div>}
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }} role="tablist" aria-label="leaderboard tabs">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {context && tab === 'season' && context.rank > 50 && (
        <div className="party-notice" style={{ marginBottom: 16 }}>
          <Trophy />
          <div>
            <strong>Your team is ranked #{context.rank}.</strong>
            {context.pointsToNext !== null && <p>Earn {context.pointsToNext} more points to reach the next meaningful rank.</p>}
          </div>
        </div>
      )}

      {isInfo ? (
        <div className="party-notice">
          {tab === 'friends' ? <Users /> : <Crown />}
          <div>
            <strong>{tab === 'friends' ? 'Friends leaderboard' : 'Private tournaments'}</strong>
            <p>{tab === 'friends'
              ? 'Join a party with friends and finish a match together — friend rankings build from your shared match history. (Coming soon.)'
              : 'Private tournaments with invite codes are planned. For now, play ranked matches to climb the season ladder. (Coming soon.)'}</p>
          </div>
        </div>
      ) : (
        <article className="game-card leaderboard-card">
          <div className="card-header">
            <span>{showTeams ? 'TEAM STANDINGS' : 'PLAYER STANDINGS'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={13} style={{ color: 'var(--muted)' }} />
              <input
                value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }}
                placeholder={showTeams ? 'Search teams' : 'Search players'} aria-label="search leaderboard"
                style={{ background: 'transparent', border: 0, color: 'white', fontSize: 11, fontWeight: 700, outline: 'none', width: 120 }}
              />
            </div>
          </div>

          {showTeams
            ? pagedTeams.map((r) => (
                <Link key={r.teamId} to={`/team/${r.teamId}`} className={`leader-row ${r.teamId === team?.id ? 'you' : ''}`} style={{ textDecoration: 'none' }}>
                  <b>{r.rank}</b>
                  <Emblem kind={r.emblem} size={30} />
                  <span><strong>{r.name}</strong><small>{r.seasonPoints} pts · {r.mathsAccuracy}% maths · {r.wins}W</small></span>
                  <em>{r.rating}</em>
                </Link>
              ))
            : pagedPlayers.map((r) => (
                <div key={r.playerId} className="leader-row">
                  <b>{r.rank}</b>
                  <span className="emblem" style={{ ['--emblem' as string]: '#5b78a4' }}>{r.name.charAt(0).toUpperCase()}</span>
                  <span><strong>{r.name}</strong><small>{r.teamName ?? 'No team'} · {r.seasonPoints} pts · {tab === 'mvp' ? `${r.matchMvpAwards} MVP` : `${r.mathsAccuracy}% maths`}</small></span>
                  <em>{r.advancedSolved} adv</em>
                </div>
              ))}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 13px 4px' }}>
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>{total} entries</span>
            <div style={{ display: 'flex', gap: 5 }} role="group" aria-label="pagination">
              {Array.from({ length: Math.min(pages, 6) }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} aria-current={page === i ? 'page' : undefined}
                  style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--line)', cursor: 'pointer', fontSize: 10, fontWeight: 900,
                    background: page === i ? 'rgba(57,217,154,.18)' : '#0d2b43', color: page === i ? '#8df3cd' : '#91a9bf' }}>
                  {i + 1}
                </button>
              ))}
              {showTeams && <Link to="/hub" className="text-button" style={{ marginLeft: 6 }}>Hub <ChevronRight /></Link>}
            </div>
          </div>
        </article>
      )}
    </main>
  );
}
