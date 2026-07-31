import type { CharacterId, PlayerProfile, StructureId, Team } from '@mathcity/shared';
import { DEFAULT_RATING } from '@mathcity/shared';
import { newCode, newId } from '../ids.ts';
import type { Rng } from '../questions/rng.ts';

// Synthetic names only — never real children's data.
export const BOT_FIRST_NAMES = [
  'Abel', 'Almaz', 'Bereket', 'Bethel', 'Dawit', 'Eden', 'Eyob', 'Fikir',
  'Hana', 'Henok', 'Kalkidan', 'Lidya', 'Mekdes', 'Nahom', 'Rahel', 'Robel',
  'Selam', 'Samri', 'Tsion', 'Yared', 'Yonas', 'Zala', 'Marta', 'Noah',
] as const;

export const BOT_TEAM_NAMES = [
  'Blue Nile Coders', 'Lakeside Lions', 'Tana Titans', 'Bridge Builders',
  'Highland Hawks', 'Papyrus Pilots', 'Sunrise Solvers', 'Delta Dynamos',
  'Falls Falcons', 'Skyline Scholars', 'River Rangers', 'Peak Pioneers',
  'Zenith Zebras', 'Crater Cranes', 'Monsoon Mavericks', 'Aurora Architects',
] as const;

export interface BotProfile {
  accuracy: number;      // 0..1 chance to answer correctly
  aggression: number;    // 0..1 tendency to attack
  buildOrder: StructureId[];
  characters: CharacterId[];
}

export interface BotTeamSetup {
  team: Team;
  profiles: PlayerProfile[];
  bot: BotProfile;
}

const BUILD_ORDERS: StructureId[][] = [
  ['drainage', 'walls', 'emergency_shelter', 'archer_tower', 'garden'],
  ['walls', 'shield_tower', 'emergency_shelter', 'drainage', 'solar_station'],
  ['solar_station', 'drainage', 'warehouse', 'walls', 'math_academy'],
  ['emergency_shelter', 'garden', 'water_storage', 'walls', 'archer_tower'],
];

export function makeBotTeam(
  rng: Rng,
  index: number,
  opts?: { accuracy?: number; teamSize?: number; namePrefix?: string },
): BotTeamSetup {
  const teamId = newId('team');
  const size = opts?.teamSize ?? rng.int(2, 4);
  const accuracy = opts?.accuracy ?? 0.5 + rng.next() * 0.4;
  const teamName = opts?.namePrefix ?? BOT_TEAM_NAMES[index % BOT_TEAM_NAMES.length];

  const characters: CharacterId[] = ['scout', 'archer'];
  if (accuracy > 0.6) characters.push('guardian', 'giant');
  if (accuracy > 0.7) characters.push('engineer', 'healer');
  if (accuracy > 0.8) characters.push('necromancer', 'dragon_standard');

  const profiles: PlayerProfile[] = [];
  for (let i = 0; i < size; i++) {
    const name = `${rng.pick(BOT_FIRST_NAMES)}${rng.int(2, 99)}`;
    profiles.push({
      id: newId('bot'),
      name,
      avatar: rng.pick(['lion', 'ibis', 'hippo', 'fish', 'crane', 'monkey'] as const),
      mathLevel: accuracy > 0.7 ? 'champion' : accuracy > 0.55 ? 'builder' : 'explorer',
      language: 'en',
      createdAt: Date.now(),
      teamId,
      unlockedCharacters: characters,
      trials: {},
      stats: {
        matchesPlayed: 0, wins: 0, topThree: 0, teamMvpAwards: 0, matchMvpAwards: 0,
        questionsAttempted: 0, questionsCorrect: 0, advancedSolved: 0,
        dragonTrialsCompleted: 0, bestStreak: 0, attackImpact: 0, defenseImpact: 0, assists: 0,
      },
      seasonPoints: 0,
      isSynthetic: true,
    });
  }

  const team: Team = {
    id: teamId,
    name: teamName,
    emblem: ['blue_nile', 'lake_star', 'bridge', 'sunrise', 'papyrus', 'mountain', 'lightning', 'falls'][index % 8],
    code: newCode(),
    memberIds: profiles.map((p) => p.id),
    createdAt: Date.now(),
    rating: DEFAULT_RATING + Math.round((accuracy - 0.65) * 400),
    seasonPoints: 0,
    stats: {
      matchesPlayed: 0, wins: 0, second: 0, third: 0, winStreak: 0, bestWinStreak: 0,
      placementSum: 0, questionsAttempted: 0, questionsCorrect: 0, contributionSum: 0,
      crisisSurvived: 0, crisisFaced: 0,
      dragonsDeployed: { standard: 0, elite: 0, mythic: 0 },
      trophies: [], lifetimePoints: 0, highestLifetimeRank: null,
    },
    badges: [],
    isSynthetic: true,
  };

  return {
    team,
    profiles,
    bot: {
      accuracy,
      aggression: 0.3 + rng.next() * 0.6,
      buildOrder: BUILD_ORDERS[index % BUILD_ORDERS.length],
      characters,
    },
  };
}
