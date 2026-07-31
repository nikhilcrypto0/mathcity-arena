import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Swords, Trophy, GraduationCap, Users, Zap, Target, History } from 'lucide-react';
import type { MatchHistoryEntry, MatchMode } from '@mathcity/shared';
import { CHARACTER_IDS } from '@mathcity/shared';
import { useApp } from '../lib/store.ts';
import { actions, hasStoredPlayer } from '../lib/socket.ts';
import { apiClient } from '../lib/api.ts';
import { Avatar, CharacterArt, Emblem } from '../components/Art.tsx';
import { Badge, Button, Card, SectionTitle, Stat } from '../components/ui.tsx';

export default function Hub() {
  const profile = useApp((s) => s.profile);
  const team = useApp((s) => s.team);
  const matchId = useApp((s) => s.matchId);
  const queue = useApp((s) => s.queue);
  const navigate = useNavigate();
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [seasonName, setSeasonName] = useState('');

  useEffect(() => {
    if (!profile && !hasStoredPlayer()) navigate('/setup');
  }, [profile, navigate]);

  useEffect(() => {
    if (profile) apiClient.playerHistory(profile.id).then((r) => setHistory(r.history)).catch(() => {});
    apiClient.season().then((r) => setSeasonName(r.season.name)).catch(() => {});
  }, [profile?.id]);

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
  const unlockedCount = profile.unlockedCharacters.length;

  return (
    <div className="grid lg:grid-cols-3 gap-6 animate-slide-up">
      {/* Profile column */}
      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <Avatar kind={profile.avatar} size={56} />
            <div>
              <p className="font-black text-lg">{profile.name}</p>
              <Badge tone="gold">{profile.seasonPoints} season pts</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Stat label="Matches" value={profile.stats.matchesPlayed} />
            <Stat label="Wins" value={profile.stats.wins} accent />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="MVPs" value={profile.stats.matchMvpAwards + profile.stats.teamMvpAwards} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <SectionTitle>Team</SectionTitle>
            {team && <Link to={`/team/${team.id}`} className="text-xs font-bold text-lake-300">View profile →</Link>}
          </div>
          {team ? (
            <div className="flex items-center gap-3">
              <Emblem kind={team.emblem} size={48} />
              <div>
                <p className="font-black">{team.name}</p>
                <p className="text-xs text-slate-400">
                  Invite code: <span className="font-mono font-bold text-sunrise-300">{team.code}</span> · rating {team.rating}
                </p>
              </div>
            </div>
          ) : (
            <TeamJoiner />
          )}
        </Card>

        <Card>
          <SectionTitle className="mb-2">Character collection</SectionTitle>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {CHARACTER_IDS.slice(0, 10).map((id) => (
              <CharacterArt key={id} id={id} size={42} locked={!profile.unlockedCharacters.includes(id)} />
            ))}
          </div>
          <p className="text-xs text-slate-400 mb-2">{unlockedCount} of 10 unlocked — learn mathematics to unlock more.</p>
          <Link to="/academy"><Button variant="secondary" size="sm"><GraduationCap className="inline w-4 h-4 mr-1" aria-hidden />Training Academy</Button></Link>
        </Card>
      </div>

      {/* Play column */}
      <div className="space-y-4">
        <Card glow>
          <SectionTitle className="mb-1">Enter the arena</SectionTitle>
          <p className="text-xs text-slate-400 mb-4">{seasonName}</p>
          <div className="space-y-2.5">
            <Button variant="gold" size="lg" className="w-full" onClick={() => play('ranked')} disabled={queue.searching}>
              <Trophy className="inline w-5 h-5 mr-2" aria-hidden />Ranked Match — climb the season
            </Button>
            <Button variant="primary" size="lg" className="w-full" onClick={() => play('quick')} disabled={queue.searching}>
              <Zap className="inline w-5 h-5 mr-2" aria-hidden />Quick Match — jump straight in
            </Button>
            <Button variant="secondary" size="lg" className="w-full" onClick={() => play('casual')} disabled={queue.searching}>
              <Target className="inline w-5 h-5 mr-2" aria-hidden />Casual — practice without ranked stakes
            </Button>
            <Link to="/party" className="block">
              <Button variant="secondary" size="lg" className="w-full">
                <Users className="inline w-5 h-5 mr-2" aria-hidden />Friends Party — play with a code
              </Button>
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Solo players welcome — smaller teams get a transparent resource bonus, never easier mathematics.
          </p>
        </Card>

        {matchId && (
          <Card className="border-sunrise-500/50">
            <p className="font-black text-sunrise-300 mb-2">A match is in progress!</p>
            <Link to="/battle"><Button variant="gold" className="w-full"><Swords className="inline w-4 h-4 mr-1" aria-hidden />Return to battle</Button></Link>
          </Card>
        )}
      </div>

      {/* History column */}
      <div className="space-y-4">
        <Card>
          <SectionTitle className="mb-3"><History className="inline w-5 h-5 mr-1" aria-hidden />Match history</SectionTitle>
          {history.length === 0 ? (
            <p className="text-sm text-slate-400">No matches yet — your story starts with the first one.</p>
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 8).map((h) => (
                <li key={h.matchId} className="flex items-center justify-between text-sm bg-night-900/60 rounded-xl px-3 py-2">
                  <span className={`font-black w-10 ${h.placement === 1 ? 'text-sunrise-400' : h.placement <= 3 ? 'text-lake-300' : 'text-slate-400'}`}>
                    #{h.placement}
                  </span>
                  <span className="text-slate-400 capitalize">{h.mode}</span>
                  <span className="font-bold">{h.victoryScore.toFixed(0)} pts</span>
                  <span className="text-meadow-400 font-bold">+{h.seasonPointsGained}</span>
                  {h.wasMvp && <Badge tone="gold">MVP</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <SectionTitle className="mb-2">Training progress</SectionTitle>
          <p className="text-sm text-slate-300 mb-1">
            Advanced problems solved: <span className="font-black text-sunrise-300">{profile.stats.advancedSolved}</span>
          </p>
          <p className="text-sm text-slate-300 mb-1">
            Dragon trials completed: <span className="font-black text-lake-300">{profile.stats.dragonTrialsCompleted}</span>
          </p>
          <p className="text-sm text-slate-300">
            Best answer streak: <span className="font-black text-meadow-400">{profile.stats.bestStreak}</span>
          </p>
        </Card>
      </div>
    </div>
  );
}

function TeamJoiner() {
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  if (mode === 'idle') {
    return (
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => setMode('create')}>Create team</Button>
        <Button variant="secondary" size="sm" onClick={() => setMode('join')}>Join with code</Button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <input
        value={mode === 'create' ? name : code}
        onChange={(e) => (mode === 'create' ? setName(e.target.value) : setCode(e.target.value))}
        placeholder={mode === 'create' ? 'Team name' : 'Team code'}
        className="flex-1 px-3 py-2 rounded-xl bg-night-950 border border-night-600 focus:border-lake-400 text-white font-bold text-sm"
        autoComplete="off"
      />
      <Button
        variant="gold"
        size="sm"
        onClick={() => {
          if (mode === 'create' && name.trim()) actions.createTeam(name.trim(), 'blue_nile');
          if (mode === 'join' && code.trim()) actions.joinTeam(code.trim());
          setMode('idle');
        }}
      >
        Go
      </Button>
    </div>
  );
}
