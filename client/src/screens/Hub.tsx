import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, ChevronRight, Users, Zap, Play, Castle, Shield, Leaf,
  Flame, Medal, BookOpen, Wifi, Target, Crown, Gamepad2,
} from 'lucide-react';
import type { MatchMode } from '@mathcity/shared';
import { CHARACTERS, CHARACTER_IDS } from '@mathcity/shared';
import { useApp } from '../lib/store.ts';
import { actions, hasStoredPlayer } from '../lib/socket.ts';
import { apiClient } from '../lib/api.ts';
import { CharacterArt } from '../components/Art.tsx';

/** Decorative isometric district, styled by the reference dashboard CSS. */
function CityHero() {
  return (
    <div className="city-map" aria-hidden="true">
      <span className="lake lake-one" />
      <span className="lake lake-two" />
      <span className="road road-one" />
      <span className="road road-two" />
      <span className="bridge-shape" />
      <span className="tree tree-one">🌳</span>
      <span className="tree tree-two">🌳</span>
      <span className="tree tree-three">🌳</span>
      <div className="building core-building"><div className="building-base" /><div className="building-top">◆</div><small>CORE</small></div>
      <div className="building tower-building"><div className="building-base" /><div className="building-top">♜</div><small>GUARD</small></div>
      <div className="building academy-building"><div className="building-base" /><div className="building-top">Σ</div><small>ACADEMY</small></div>
      <div className="building solar-building"><div className="building-base" /><div className="building-top">☀</div><small>SOLAR</small></div>
      <div className="building garden-building"><div className="building-base" /><div className="building-top">✦</div><small>GARDEN</small></div>
      <span className="unit unit-archer">🏹</span>
      <div className="map-label"><span>LAKE DISTRICT · LIVE</span></div>
    </div>
  );
}

export default function Hub() {
  const profile = useApp((s) => s.profile);
  const team = useApp((s) => s.team);
  const matchId = useApp((s) => s.matchId);
  const queue = useApp((s) => s.queue);
  const setState = useApp((s) => s.set);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile && !hasStoredPlayer()) navigate('/setup');
  }, [profile, navigate]);

  useEffect(() => {
    apiClient.season()
      .then((r) => {
        const num = r.season.name.match(/\d+/)?.[0];
        setState({ seasonLabel: num ? `SEASON ${num}` : r.season.name.toUpperCase() });
      })
      .catch(() => {});
  }, [setState]);

  useEffect(() => {
    if (matchId) navigate('/battle');
  }, [matchId, navigate]);

  if (!profile) return null;

  const play = (mode: MatchMode) => {
    actions.queueJoin(mode);
    navigate('/party');
  };

  const accuracy = profile.stats.questionsAttempted > 0
    ? Math.round((profile.stats.questionsCorrect / profile.stats.questionsAttempted) * 100)
    : 0;
  const unlocked = profile.unlockedCharacters;
  const coreHealth = 2000 + profile.seasonPoints;
  const defense = unlocked.length * 200;
  const xpPct = Math.min(100, Math.round((profile.seasonPoints % 500) / 5));

  // Real "squad": unlocked characters first, then the rest, up to 4.
  const squad = [...CHARACTER_IDS].sort((a, b) =>
    Number(unlocked.includes(b)) - Number(unlocked.includes(a))).slice(0, 4);

  return (
    <main className="hub-content">
      <section className="welcome-line">
        <div>
          <span className="eyebrow">WELCOME BACK, {profile.name.toUpperCase()}</span>
          <h1>Your district is ready.</h1>
        </div>
        <div className="rank-chip">
          <Trophy /><span>Season points<strong>{profile.seasonPoints.toLocaleString()}</strong></span>
          <small>{profile.stats.wins}W</small>
        </div>
      </section>

      <section className="hub-grid">
        <div className="main-column">
          <article className="city-card game-card">
            <div className="card-header floating-header">
              <div><span className="live-dot" /> {team ? team.name.toUpperCase() : 'YOUR DISTRICT'}</div>
              <Link className="ghost-button" to="/academy">Train up <ChevronRight /></Link>
            </div>
            <CityHero />
            <div className="district-stats">
              <div><Castle /><span><small>CORE HEALTH</small><strong>{coreHealth.toLocaleString()}</strong></span></div>
              <div><Shield /><span><small>DEFENSE</small><strong>{defense.toLocaleString()}</strong></span></div>
              <div><Leaf /><span><small>CITY HARMONY</small><strong>{accuracy}%</strong></span></div>
              <button onClick={() => play('quick')} disabled={queue.searching}><span>＋</span> BUILD</button>
            </div>
          </article>

          <article className="battle-callout">
            <div className="battle-copy">
              <span className="eyebrow">FEATURED MODE</span>
              <h2>Knowledge powers the city.</h2>
              <p>Join six teams in a live strategy match. Solve, fortify, survive the crisis, and raid your rivals.</p>
              <div className="mode-tags">
                <span><Users /> 1–4 players</span>
                <span><Zap /> live multiplayer</span>
                <span><Trophy /> ranked rules</span>
              </div>
            </div>
            <div className="battle-art" aria-hidden="true">
              <span className="mini-dragon">🐉</span><span className="mini-guardian">🛡️</span>
              <span className="spark s1">✦</span><span className="spark s2">✦</span>
            </div>
            <div className="launch-actions">
              <button className="secondary-button" onClick={() => navigate('/party')}><Users /> FORM TEAM</button>
              <button className="primary-button" onClick={() => play('quick')} disabled={queue.searching}>
                <Play fill="currentColor" /> QUICK MATCH
              </button>
            </div>
          </article>

          <div className="section-heading">
            <div><span className="eyebrow">YOUR SQUAD</span><h2>Battle-ready characters</h2></div>
            <Link className="text-button" to="/characters">View collection <ChevronRight /></Link>
          </div>
          <div className="character-row">
            {squad.map((id) => {
              const def = CHARACTERS[id];
              const isUnlocked = unlocked.includes(id);
              return (
                <article key={id} className={`character-card compact green ${isUnlocked ? '' : 'locked'}`}>
                  <div className="character-level">{isUnlocked ? 'READY' : 'LOCKED'}</div>
                  <div className="character-portrait">
                    <CharacterArt id={id} size={92} locked={!isUnlocked} />
                    <div className="portrait-glow" />
                  </div>
                  <div className="character-info">
                    <strong>{def.name}</strong>
                    <small>{def.topics[0]?.replace(/_/g, ' ') ?? 'mathematics'}</small>
                    <div className="mastery"><i style={{ width: isUnlocked ? '100%' : '40%' }} /></div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="right-column">
          <article className="game-card party-quick-card">
            <div className="party-live"><Wifi /><span>ONLINE PARTY SERVICE<strong>Cross-device live</strong></span></div>
            <p>Create a hosted invite code and play with up to four real players across devices.</p>
            <button onClick={() => navigate('/party')}><Users /> Play online <ChevronRight /></button>
          </article>

          <article className="game-card player-progress">
            <div className="card-header"><span>PLAYER PROGRESS</span><span className="level-badge">{profile.mathLevel.toUpperCase()}</span></div>
            <div className="xp-ring" style={{ background: `conic-gradient(var(--teal) ${xpPct}%, rgba(255,255,255,.08) 0)` }}>
              <div><strong>{xpPct}%</strong><small>{profile.seasonPoints.toLocaleString()} PTS</small></div>
            </div>
            <div className="streak-line">
              <Flame /><span><strong>{profile.stats.bestStreak} best streak</strong><small>{profile.stats.wins} wins · {accuracy}% accuracy</small></span>
              <span className="streak-bonus">{profile.stats.matchesPlayed}m</span>
            </div>
          </article>

          <article className="game-card quest-card">
            <div className="card-header"><span>GAME MODES</span><small>live</small></div>
            <button className="wide-ghost" onClick={() => play('ranked')} disabled={queue.searching}><Trophy /> Ranked match <ChevronRight /></button>
            <button className="wide-ghost" onClick={() => play('casual')} disabled={queue.searching}><Target /> Casual match <ChevronRight /></button>
            <button className="wide-ghost" onClick={() => navigate('/demo')}><Gamepad2 /> Demo mode <ChevronRight /></button>
            <button className="wide-ghost" onClick={() => navigate('/academy')}><BookOpen /> Training academy <ChevronRight /></button>
          </article>

          <article className="game-card leaderboard-card">
            <div className="card-header"><span>YOUR PROGRESS</span><Link to="/leaderboard" className="text-button">Leaderboard <ChevronRight /></Link></div>
            <div className="quest"><span><Medal /></span><div><strong>Advanced problems solved</strong><small>toward dragon trials</small></div><b>{profile.stats.advancedSolved}</b></div>
            <div className="quest"><span><Crown /></span><div><strong>Dragon trials completed</strong><small>mythic path</small></div><b>{profile.stats.dragonTrialsCompleted}</b></div>
            <div className="quest"><span><Trophy /></span><div><strong>MVP awards</strong><small>match + team</small></div><b>{profile.stats.matchMvpAwards + profile.stats.teamMvpAwards}</b></div>
          </article>
        </aside>
      </section>

      {matchId && (
        <div className="party-notice" style={{ marginTop: 18 }}>
          <Play /> A match is in progress. <Link to="/battle" className="text-button" style={{ display: 'inline' }}>Return to battle</Link>
        </div>
      )}
    </main>
  );
}
