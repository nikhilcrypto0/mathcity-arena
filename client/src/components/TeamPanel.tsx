import { useState } from 'react';
import type { CharacterId, MatchTeamState, StructureId } from '@mathcity/shared';
import { CHARACTERS, STRUCTURES, STRUCTURE_IDS, TEAM_SIGNALS } from '@mathcity/shared';
import { Coins, Hammer, Zap, Sparkles, Shield as ShieldIcon, Box } from 'lucide-react';
import { actions } from '../lib/socket.ts';
import { Avatar, CharacterArt } from './Art.tsx';
import { Badge } from './ui.tsx';

function ResourceChips({ team }: { team: MatchTeamState }) {
  const r = team.resources;
  const chips = [
    { icon: <Coins className="w-3.5 h-3.5" aria-hidden />, label: 'coins', value: r.coins, color: 'text-sunrise-300' },
    { icon: <Hammer className="w-3.5 h-3.5" aria-hidden />, label: 'materials', value: r.materials, color: 'text-orange-300' },
    { icon: <Zap className="w-3.5 h-3.5" aria-hidden />, label: 'energy', value: r.energy, color: 'text-lake-300' },
    { icon: <Sparkles className="w-3.5 h-3.5" aria-hidden />, label: 'mana', value: r.mana, color: 'text-purple-300' },
    { icon: <ShieldIcon className="w-3.5 h-3.5" aria-hidden />, label: 'defense', value: Math.round(r.defense), color: 'text-meadow-400' },
    { icon: <Box className="w-3.5 h-3.5" aria-hidden />, label: 'tokens', value: r.tokens, color: 'text-slate-300' },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5" aria-label="team resources">
      {chips.map((c) => (
        <span key={c.label} className={`flex items-center gap-1 bg-night-900/70 rounded-lg px-2 py-1 text-xs font-black ${c.color}`} aria-label={`${c.value} ${c.label}`}>
          {c.icon} {c.value}
          <span className="sr-only">{c.label}</span>
        </span>
      ))}
    </div>
  );
}

function BuildMenu({ team }: { team: MatchTeamState }) {
  const r = team.resources;
  return (
    <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto mc-scroll pr-1">
      {STRUCTURE_IDS.map((id) => {
        const def = STRUCTURES[id];
        const count = team.structures[id] ?? 0;
        const maxed = count >= def.maxCount;
        const affordable = r.coins >= def.cost.coins && r.materials >= def.cost.materials && r.tokens >= def.cost.tokens;
        return (
          <button
            key={id}
            onClick={() => actions.build(id as StructureId)}
            disabled={maxed || !affordable}
            title={def.strategicPurpose}
            className={`text-left rounded-xl border p-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
              maxed ? 'border-meadow-500/40 bg-meadow-500/10'
              : affordable ? 'border-lake-500/30 bg-night-900/60 hover:border-lake-400'
              : 'border-night-600 bg-night-900/40 opacity-50'
            }`}
          >
            <p className="text-xs font-black truncate">{def.name} {count > 0 && <span className="text-meadow-400">×{count}</span>}</p>
            <p className="text-[10px] text-slate-400 truncate">{def.strategicPurpose}</p>
            <p className="text-[10px] font-bold text-sunrise-300">
              {maxed ? 'MAX BUILT' : `${def.cost.coins}c · ${def.cost.materials}m${def.cost.tokens ? ` · ${def.cost.tokens}t` : ''}`}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function DeployMenu({ team, unlocked }: { team: MatchTeamState; unlocked: CharacterId[] }) {
  const r = team.resources;
  const teamAdvanced = team.players.reduce((s, p) => s + p.contribution.advancedSolved, 0);
  return (
    <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto mc-scroll pr-1">
      {unlocked.map((id) => {
        const def = CHARACTERS[id];
        const deployed = team.dragonDeployedThisMatch[id] ?? 0;
        const spent = def.maxPerMatch !== null && deployed >= def.maxPerMatch;
        const affordable = r.energy >= def.deployCost.energy && r.mana >= def.deployCost.mana;
        return (
          <button
            key={id}
            onClick={() => actions.deploy(id)}
            disabled={spent || !affordable}
            className={`flex items-center gap-2 rounded-xl border p-1.5 text-left transition-all cursor-pointer disabled:cursor-not-allowed ${
              spent ? 'border-night-600 opacity-40'
              : affordable ? 'border-lake-500/30 bg-night-900/60 hover:border-lake-400'
              : 'border-night-600 bg-night-900/40 opacity-50'
            }`}
            title={def.abilities.join(' · ')}
          >
            <CharacterArt id={id} size={38} />
            <span className="min-w-0">
              <span className="block text-[11px] font-black truncate">{def.name.split(' ')[0]}</span>
              <span className="block text-[10px] text-lake-300 font-bold">{def.deployCost.energy}⚡{def.deployCost.mana > 0 ? ` ${def.deployCost.mana}✨` : ''}</span>
              {spent && <span className="block text-[9px] text-slate-400">used this match</span>}
            </span>
          </button>
        );
      })}
      {unlocked.some((id) => CHARACTERS[id].tier === 'dragon') && (
        <p className="col-span-2 text-[10px] text-slate-400">
          Dragons also need correct ADVANCED answers from your team this match (you have {teamAdvanced}).
        </p>
      )}
    </div>
  );
}

export function TeamPanel({
  team, unlockedCharacters, playerId,
}: {
  team: MatchTeamState;
  unlockedCharacters: CharacterId[];
  playerId: string;
}) {
  const [tab, setTab] = useState<'team' | 'build' | 'deploy' | 'signals'>('team');
  const tabs = [
    { id: 'team' as const, label: 'Team' },
    { id: 'build' as const, label: 'Build' },
    { id: 'deploy' as const, label: 'Deploy' },
    { id: 'signals' as const, label: 'Signals' },
  ];

  return (
    <div className="mc-card p-3">
      <ResourceChips team={team} />
      <div className="flex gap-1 mt-3 mb-2" role="tablist" aria-label="team actions">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${
              tab === t.id ? 'bg-lake-500/25 text-lake-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <ul className="space-y-1.5" aria-label="teammates and contributions">
          {team.players.map((p) => {
            const c = p.contribution;
            return (
              <li key={p.playerId} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${p.playerId === playerId ? 'bg-sunrise-500/10' : 'bg-night-900/50'}`}>
                <Avatar kind={p.avatar} size={28} />
                <span className="text-xs font-bold truncate flex-1">{p.name}{p.playerId === playerId ? ' (you)' : ''}</span>
                <span className="text-[10px] font-mono text-meadow-400" title="correct answers">✓{c.questionsCorrect}</span>
                <span className="text-[10px] font-mono text-ember-400" title="attack damage">⚔{c.attackDamage}</span>
                <span className="text-[10px] font-mono text-lake-300" title="damage blocked">🛡{c.defenseBlocked}</span>
              </li>
            );
          })}
        </ul>
      )}
      {tab === 'build' && <BuildMenu team={team} />}
      {tab === 'deploy' && <DeployMenu team={team} unlocked={unlockedCharacters} />}
      {tab === 'signals' && (
        <div className="grid grid-cols-2 gap-1.5" aria-label="preset team signals">
          {TEAM_SIGNALS.map((s) => (
            <button
              key={s.id}
              onClick={() => actions.sendSignal(s.id)}
              className="rounded-xl border border-night-600 bg-night-900/60 hover:border-lake-400 px-2 py-2 text-xs font-bold text-left cursor-pointer"
            >
              {s.text}
            </button>
          ))}
          <p className="col-span-2 text-[10px] text-slate-500">
            Preset signals keep team talk safe — no open chat in matches.
          </p>
        </div>
      )}
    </div>
  );
}

export function SignalToast() {
  return null;
}

export function Placement({ team, snapshot }: { team: MatchTeamState; snapshot: { teams: MatchTeamState[] } }) {
  const activeSorted = [...snapshot.teams].sort((a, b) => {
    if (a.knockedOut !== b.knockedOut) return a.knockedOut ? 1 : -1;
    return b.coreHealth - a.coreHealth;
  });
  const position = activeSorted.findIndex((t) => t.teamId === team.teamId) + 1;
  return (
    <Badge tone={position <= 2 ? 'gold' : 'lake'}>
      Live placement: #{position} of {snapshot.teams.length}
    </Badge>
  );
}
