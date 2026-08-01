import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Crown } from 'lucide-react';
import type { CharacterId } from '@mathcity/shared';
import { apiClient } from '../lib/api.ts';
import { Avatar, CharacterArt, Emblem } from '../components/Art.tsx';

type TeamProfileData = Awaited<ReturnType<typeof apiClient.teamProfile>>;

function StatTile({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{ display: 'grid', gap: 2, padding: '10px 6px', borderRight: '1px solid var(--line)' }}>
      <strong style={{ fontSize: 16, color: accent ? 'var(--teal)' : 'white' }}>{value}</strong>
      <small style={{ fontSize: 7, letterSpacing: '.1em', color: 'var(--muted)', fontWeight: 900 }}>{label.toUpperCase()}</small>
    </div>
  );
}

export default function TeamProfile() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<TeamProfileData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (teamId) apiClient.teamProfile(teamId).then(setData).catch(() => setError(true));
  }, [teamId]);

  if (error) return <main className="subpage"><p style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)', fontWeight: 700 }}>Team not found.</p></main>;
  if (!data) return <main className="subpage"><p style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)', fontWeight: 700 }}>Loading team…</p></main>;

  const { team, members, history } = data;
  const s = team.stats;
  const accuracy = s.questionsAttempted > 0 ? Math.round((s.questionsCorrect / s.questionsAttempted) * 100) : 0;
  const characterMastery = new Set(members.flatMap((m) => m.unlockedCharacters));
  const mvpTotal = members.reduce((sum, m) => sum + (m.stats.matchMvpAwards ?? 0) + (m.stats.teamMvpAwards ?? 0), 0);

  return (
    <main className="subpage">
      <button className="back-button" onClick={() => navigate('/leaderboard')}><ArrowLeft /> Back to Leaderboards</button>

      <section className="subpage-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Emblem kind={team.emblem} size={72} />
          <div>
            <span className="eyebrow">TEAM PROFILE</span>
            <h1>{team.name}</h1>
            <p>Rating {team.rating} · {team.seasonPoints} season points{team.badges.length ? ` · ${team.badges.join(', ')}` : ''}</p>
          </div>
        </div>
        {data.seasonRank && <div className="rank-chip"><Trophy /><span>Season rank<strong>#{data.seasonRank}</strong></span></div>}
      </section>

      <article className="game-card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', textAlign: 'center' }}>
          <StatTile label="Matches" value={s.matchesPlayed} />
          <StatTile label="Wins" value={s.wins} accent />
          <StatTile label="Win %" value={`${data.winRatio}%`} />
          <StatTile label="Top 3" value={s.wins + s.second + s.third} />
          <StatTile label="Avg place" value={s.matchesPlayed ? (s.placementSum / s.matchesPlayed).toFixed(1) : '—'} />
          <StatTile label="Maths" value={`${accuracy}%`} />
          <StatTile label="Best streak" value={s.bestWinStreak} />
          <StatTile label="Crisis" value={`${s.crisisSurvived}/${s.crisisFaced}`} />
        </div>
      </article>

      <div className="training-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        <article className="game-card leaderboard-card">
          <div className="card-header"><span>MEMBERS</span><small>{members.length}</small></div>
          {members.map((m, i) => (
            <div key={m.playerId} className="leader-row">
              <b>{i + 1}</b>
              <Avatar kind={m.avatar} size={30} />
              <span><strong>{m.name}</strong><small>{m.stats.matchesPlayed} matches · {m.stats.matchMvpAwards ?? 0} MVP</small></span>
              <em>{m.seasonPoints} pts</em>
            </div>
          ))}
        </article>

        <div style={{ display: 'grid', gap: 18 }}>
          <article className="game-card" style={{ padding: 18 }}>
            <div className="card-header" style={{ height: 'auto', padding: '0 0 12px' }}><span><Crown size={13} style={{ verticalAlign: -2, marginRight: 6 }} />MVP &amp; MASTERY</span></div>
            <p style={{ fontSize: 12, color: '#bed0df', marginBottom: 8 }}>MVP awards: <strong style={{ color: 'var(--gold)' }}>{mvpTotal}</strong></p>
            <p style={{ fontSize: 12, color: '#bed0df', marginBottom: 12 }}>Dragons deployed: 🐉 {s.dragonsDeployed.standard} · ⚡ {s.dragonsDeployed.elite} · 👑 {s.dragonsDeployed.mythic}</p>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.1em', color: 'var(--muted)', marginBottom: 8 }}>CHARACTER MASTERY ACROSS THE TEAM</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[...characterMastery].map((id) => <CharacterArt key={id} id={id as CharacterId} size={38} />)}
            </div>
          </article>

          <article className="game-card leaderboard-card">
            <div className="card-header"><span>MATCH HISTORY</span><small>{history.length}</small></div>
            {history.length === 0
              ? <p style={{ padding: '12px 14px', fontSize: 11, color: 'var(--muted)' }}>No matches recorded yet.</p>
              : history.slice(0, 10).map((h) => (
                  <div key={h.matchId} className="leader-row">
                    <b>{h.placement}</b>
                    <span className="emblem" style={{ ['--emblem' as string]: h.placement === 1 ? '#ffcc66' : '#5b78a4' }}>{h.placement}</span>
                    <span><strong style={{ textTransform: 'capitalize' }}>{h.mode}</strong><small>{h.victoryScore.toFixed(1)} score</small></span>
                    <em>+{h.seasonPointsGained}</em>
                  </div>
                ))}
          </article>
        </div>
      </div>
    </main>
  );
}
