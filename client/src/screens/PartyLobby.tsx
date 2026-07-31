import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, LogOut, Search, X } from 'lucide-react';
import type { CharacterId, MatchMode, TeamRole } from '@mathcity/shared';
import { CHARACTERS } from '@mathcity/shared';
import { useApp } from '../lib/store.ts';
import { actions, hasStoredPlayer } from '../lib/socket.ts';
import { Avatar, CharacterArt, Emblem } from '../components/Art.tsx';
import { Badge, Button, Card, SectionTitle } from '../components/ui.tsx';

const ROLES: { id: TeamRole; label: string }[] = [
  { id: 'commander', label: 'Commander' },
  { id: 'solver', label: 'Solver' },
  { id: 'defender', label: 'Defender' },
  { id: 'strategist', label: 'Resource Strategist' },
];

export default function PartyLobby() {
  const profile = useApp((s) => s.profile);
  const party = useApp((s) => s.party);
  const queue = useApp((s) => s.queue);
  const matchId = useApp((s) => s.matchId);
  const pushToast = useApp((s) => s.pushToast);
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!profile && !hasStoredPlayer()) navigate('/setup');
  }, [profile, navigate]);

  useEffect(() => {
    if (matchId) navigate('/battle');
  }, [matchId, navigate]);

  if (!profile) return null;

  const me = party?.members.find((m) => m.playerId === profile.id);
  const isLeader = me?.isLeader ?? false;

  if (!party) {
    return (
      <div className="max-w-xl mx-auto space-y-4 animate-slide-up">
        <SectionTitle>Friends Party</SectionTitle>
        <Card className="space-y-4">
          <p className="text-sm text-slate-300">
            Create a party and share the code, or join a friend's party. Parties hold 1-4 players
            and enter matchmaking together as one team.
          </p>
          <Button variant="gold" size="lg" className="w-full" onClick={() => actions.createParty()}>
            Create a party
          </Button>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="PARTY CODE"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl bg-night-950 border border-night-600 focus:border-lake-400 text-white font-mono font-black tracking-widest text-center"
              autoComplete="off"
              aria-label="party code"
            />
            <Button variant="primary" onClick={() => joinCode.trim() && actions.joinParty(joinCode.trim())}>
              Join
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <SectionTitle>Party Lobby</SectionTitle>
        <button
          onClick={() => { navigator.clipboard?.writeText(party.code); pushToast('Party code copied!', 'success'); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-night-800 border border-sunrise-500/40 cursor-pointer"
          aria-label={`party code ${party.code}, copy to clipboard`}
        >
          <span className="font-mono font-black text-xl tracking-widest text-sunrise-300">{party.code}</span>
          <Copy className="w-4 h-4 text-slate-400" aria-hidden />
        </button>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Emblem kind={party.teamEmblem} size={44} />
          <div>
            <p className="font-black">{party.teamName}</p>
            <p className="text-xs text-slate-400">{party.members.length}/4 players — teams of one to four are all valid</p>
          </div>
        </div>

        <ul className="space-y-3">
          {party.members.map((m) => (
            <li key={m.playerId} className="flex flex-wrap items-center gap-3 bg-night-900/60 rounded-xl px-3 py-2.5">
              <Avatar kind={m.avatar} size={40} />
              <div className="min-w-28">
                <p className="font-bold">{m.name} {m.isLeader && <Badge tone="gold">Leader</Badge>}</p>
                <p className="text-xs text-slate-400">{m.role ? ROLES.find((r) => r.id === m.role)?.label : 'No role (optional)'}</p>
              </div>
              {m.character && <CharacterArt id={m.character} size={40} />}
              <span className={`ml-auto text-sm font-black ${m.ready ? 'text-meadow-400' : 'text-slate-500'}`}>
                {m.ready ? '✓ Ready' : 'Not ready'}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {me && (
        <Card className="space-y-4">
          <div>
            <p className="text-sm font-bold text-slate-300 mb-2">Your starting character</p>
            <div className="flex flex-wrap gap-2">
              {profile.unlockedCharacters.map((id) => (
                <button
                  key={id}
                  onClick={() => actions.setCharacter(id as CharacterId)}
                  className={`rounded-xl transition-all cursor-pointer ${me.character === id ? 'ring-3 ring-sunrise-400 scale-105' : 'opacity-70 hover:opacity-100'}`}
                  aria-pressed={me.character === id}
                  aria-label={CHARACTERS[id as CharacterId]?.name}
                >
                  <CharacterArt id={id as CharacterId} size={52} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-300 mb-2">Optional role</p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => actions.setRole(me.role === r.id ? null : r.id)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-bold cursor-pointer ${
                    me.role === r.id ? 'border-lake-400 bg-lake-500/20 text-lake-300' : 'border-night-600 text-slate-300'
                  }`}
                  aria-pressed={me.role === r.id}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Roles never limit what you can do — they are a team plan, not a cage.</p>
          </div>
          <Button
            variant={me.ready ? 'secondary' : 'gold'}
            className="w-full"
            onClick={() => actions.setReady(!me.ready)}
          >
            {me.ready ? 'Cancel ready' : "I'm ready!"}
          </Button>
        </Card>
      )}

      {queue.searching ? (
        <Card glow className="text-center py-6">
          <div className="flex justify-center mb-3" aria-hidden>
            <Search className="w-10 h-10 text-lake-400 animate-float" />
          </div>
          <p className="font-black text-lg mb-1">Searching for opponents…</p>
          <p className="text-sm text-slate-400 mb-1 capitalize">{queue.mode} match · lobby of 6 teams</p>
          <p className="text-xs text-slate-500 mb-4">
            Matching prefers similar team sizes and ratings. Waiting slots fill with training-league
            (simulated) teams so nobody waits long.
          </p>
          <Button variant="danger" size="sm" onClick={() => actions.queueLeave()}>
            <X className="inline w-4 h-4 mr-1" aria-hidden />Cancel search
          </Button>
        </Card>
      ) : (
        isLeader && (
          <Card>
            <p className="text-sm font-bold text-slate-300 mb-3">Start matchmaking</p>
            <div className="grid sm:grid-cols-3 gap-2">
              {(['ranked', 'quick', 'casual'] as MatchMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={mode === 'ranked' ? 'gold' : mode === 'quick' ? 'primary' : 'secondary'}
                  onClick={() => actions.queueJoin(mode)}
                  className="capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>
          </Card>
        )
      )}

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => actions.leaveParty()}>
          <LogOut className="inline w-4 h-4 mr-1" aria-hidden />Leave party
        </Button>
      </div>
    </div>
  );
}
