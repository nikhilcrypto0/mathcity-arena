import type { MatchSnapshot, MatchTeamState, StructureId } from '@mathcity/shared';
import { STRUCTURES } from '@mathcity/shared';
import { Shield, Swords, Skull } from 'lucide-react';
import { Emblem } from './Art.tsx';
import { ProgressBar } from './ui.tsx';

const STRUCTURE_EMOJI: Record<string, string> = {
  wall: '🧱', tower: '🏹', shield: '🛡️', heart: '💚', academy: '🏛️', bridge: '🌉',
  tree: '🌳', sun: '☀️', droplet: '💧', waves: '🌊', home: '🏠', box: '📦',
};

function DistrictCard({
  team, isYours, canAttack, onAttack,
}: {
  team: MatchTeamState;
  isYours: boolean;
  canAttack: boolean;
  onAttack: (teamId: string) => void;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-3 transition-all ${
        team.knockedOut
          ? 'border-night-600 bg-night-900/40 opacity-60'
          : isYours
            ? 'border-sunrise-400/70 bg-sunrise-500/10'
            : 'border-lake-500/25 bg-night-800/70'
      }`}
      aria-label={`${team.name} district${isYours ? ' (your team)' : ''}${team.knockedOut ? ', knocked out' : ''}${team.shieldActive ? ', shielded' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Emblem kind={team.emblem} size={34} />
        <div className="min-w-0 flex-1">
          <p className="font-black text-sm truncate">{team.name} {isYours && <span className="text-sunrise-400">★</span>}</p>
          <p className="text-[10px] text-slate-400">rating {team.rating}{team.isBot ? ' · sim' : ''}</p>
        </div>
        {team.knockedOut && <Skull className="w-5 h-5 text-ember-400 shrink-0" aria-label="knocked out" />}
        {!team.knockedOut && team.shieldActive && (
          <Shield className="w-5 h-5 text-lake-300 shrink-0 animate-pulse" aria-label="shielded" />
        )}
      </div>
      <ProgressBar
        value={team.coreHealth}
        max={team.maxCoreHealth}
        color={
          team.coreHealth < team.maxCoreHealth * 0.3
            ? 'var(--color-ember-500)'
            : team.coreHealth < team.maxCoreHealth * 0.6
              ? 'var(--color-sunrise-500)'
              : 'var(--color-meadow-500)'
        }
        label={`${team.name} core health`}
      />
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] font-mono font-bold text-slate-300">
          {team.coreHealth}/{team.maxCoreHealth}
        </span>
        <span className="text-[11px]" aria-label="structures built">
          {Object.entries(team.structures).map(
            ([id, count]) => STRUCTURE_EMOJI[STRUCTURES[id as StructureId]?.icon]?.repeat(Math.min(count ?? 0, 2)),
          )}
        </span>
      </div>
      {team.units.length > 0 && (
        <p className="text-[10px] text-slate-400 mt-1">⚔ {team.units.length} unit{team.units.length === 1 ? '' : 's'} deployed</p>
      )}
      {canAttack && (
        <button
          onClick={() => onAttack(team.teamId)}
          className="mt-2 w-full py-1.5 rounded-lg bg-ember-500 hover:bg-ember-400 text-white text-xs font-black cursor-pointer transition-colors"
        >
          <Swords className="inline w-3.5 h-3.5 mr-1" aria-hidden />ATTACK
        </button>
      )}
    </div>
  );
}

export function CityMap({
  snapshot, yourTeamId, raidPhase, onAttack,
}: {
  snapshot: MatchSnapshot;
  yourTeamId: string | null;
  raidPhase: boolean;
  onAttack: (teamId: string) => void;
}) {
  const yourTeam = snapshot.teams.find((t) => t.teamId === yourTeamId);
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5" aria-label="city map of all districts">
      {snapshot.teams.map((team) => {
        const isYours = team.teamId === yourTeamId;
        const canAttack = Boolean(
          raidPhase && yourTeamId && !isYours && !team.knockedOut && !team.shieldActive &&
          yourTeam && !yourTeam.knockedOut,
        );
        return (
          <DistrictCard
            key={team.teamId}
            team={team}
            isYours={isYours}
            canAttack={canAttack}
            onAttack={onAttack}
          />
        );
      })}
    </div>
  );
}
