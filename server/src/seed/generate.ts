import type { MatchHistoryEntry, SeasonInfo } from '@mathcity/shared';
import { SEASON_PLACEMENT_POINTS } from '@mathcity/shared';
import { makeRng, type Rng } from '../questions/rng.ts';
import { makeBotTeam, BOT_TEAM_NAMES } from '../game/bots.ts';
import { getDb, loadStore, scheduleSave } from '../store.ts';

const SEED = 424242;
const TEAM_COUNT = 64;
const SIZE_CYCLE = [4, 3, 3, 3]; // 64 teams → 208 synthetic players

function seasonPoints(placement: number, rng: Rng): number {
  if (placement <= SEASON_PLACEMENT_POINTS.length) return SEASON_PLACEMENT_POINTS[placement - 1];
  return rng.int(10, 35);
}

function placementFor(accuracy: number, rng: Rng): number {
  // Stronger teams land better placements, with noise.
  const skill = Math.max(0, Math.min(1, (accuracy - 0.35) / 0.6));
  const roll = rng.next() * 0.5 + skill * 0.5;
  return Math.max(1, Math.min(6, 7 - Math.ceil(roll * 6)));
}

/** Only the most recent slice of matches counts toward the current season. */
const SEASON_MATCH_WINDOW = 12;

/** Deterministically generate demo data: teams, players, seasons, histories. */
export function seedDb(): { teams: number; players: number } {
  const db = getDb();
  const rng = makeRng(SEED);
  const now = Date.now();

  // Two completed seasons for history + the live one.
  const previous: { season: SeasonInfo; championTeamId: string | null; badges: Record<string, string[]> }[] = [];

  const teamIds: string[] = [];
  for (let i = 0; i < TEAM_COUNT; i++) {
    const namePrefix = i < BOT_TEAM_NAMES.length
      ? undefined
      : `${BOT_TEAM_NAMES[i % BOT_TEAM_NAMES.length]} ${Math.floor(i / BOT_TEAM_NAMES.length) + 1}`;
    const made = makeBotTeam(rng, i, {
      teamSize: SIZE_CYCLE[i % SIZE_CYCLE.length],
      namePrefix,
      accuracy: 0.38 + rng.next() * 0.55,
    });
    const accuracy = made.bot.accuracy;
    const matches = rng.int(6, 42);
    const s = made.team.stats;
    s.matchesPlayed = matches;
    const history: MatchHistoryEntry[] = [];

    for (let m = 0; m < matches; m++) {
      const placement = placementFor(accuracy, rng);
      s.placementSum += placement;
      if (placement === 1) {
        s.wins += 1;
        s.winStreak += 1;
        s.bestWinStreak = Math.max(s.bestWinStreak, s.winStreak);
      } else {
        s.winStreak = 0;
        if (placement === 2) s.second += 1;
        if (placement === 3) s.third += 1;
      }
      const attempted = rng.int(24, 60);
      const correct = Math.round(attempted * Math.min(0.97, accuracy + rng.next() * 0.1));
      s.questionsAttempted += attempted;
      s.questionsCorrect += correct;
      s.crisisFaced += 1;
      if (rng.next() < accuracy + 0.15) s.crisisSurvived += 1;
      const points = seasonPoints(placement, rng);
      if (m >= matches - SEASON_MATCH_WINDOW) made.team.seasonPoints += points;
      s.lifetimePoints += points;
      if (m < 10) {
        history.push({
          matchId: `seed_match_${i}_${m}`,
          endedAt: now - rng.int(1, 26) * 24 * 3600 * 1000,
          mode: rng.next() < 0.6 ? 'ranked' : 'quick',
          placement,
          teams: 6,
          victoryScore: Math.round((30 + accuracy * 50 + rng.next() * 20) * 10) / 10,
          seasonPointsGained: points,
          wasMvp: false,
        });
      }
    }
    if (s.wins > 0) s.trophies.push('champion');
    if (accuracy > 0.75) {
      s.dragonsDeployed.standard = rng.int(1, 8);
      s.dragonsDeployed.elite = rng.int(0, 3);
    }
    db.teams[made.team.id] = made.team;
    db.teamHistory[made.team.id] = history.sort((a, b) => b.endedAt - a.endedAt);
    teamIds.push(made.team.id);

    for (const profile of made.profiles) {
      const ps = profile.stats;
      const played = Math.round(matches * (0.7 + rng.next() * 0.3));
      ps.matchesPlayed = played;
      ps.wins = Math.round(s.wins * (played / matches));
      ps.topThree = Math.round((s.wins + s.second + s.third) * (played / matches));
      ps.questionsAttempted = rng.int(8, 18) * played;
      ps.questionsCorrect = Math.round(ps.questionsAttempted * Math.min(0.97, accuracy + rng.next() * 0.12));
      ps.advancedSolved = accuracy > 0.65 ? rng.int(0, 4) * played : 0;
      ps.teamMvpAwards = rng.int(0, Math.max(1, Math.floor(played / 3)));
      ps.matchMvpAwards = accuracy > 0.7 ? rng.int(0, Math.floor(played / 6)) : 0;
      ps.bestStreak = rng.int(2, 14);
      ps.attackImpact = rng.int(0, 400) * played;
      ps.defenseImpact = rng.int(0, 300) * played;
      ps.assists = rng.int(0, 5) * played;
      ps.dragonTrialsCompleted = profile.unlockedCharacters.filter((c) => c.startsWith('dragon')).length;
      profile.seasonPoints = Math.round(made.team.seasonPoints * (0.8 + rng.next() * 0.4));
      db.players[profile.id] = profile;
    }
  }

  // Previous seasons with champions and badges.
  for (let seasonIndex = 1; seasonIndex <= 2; seasonIndex++) {
    const champion = rng.pick(teamIds);
    const top10 = rng.shuffle(teamIds).slice(0, 10);
    const badges: Record<string, string[]> = {};
    badges[champion] = ['Season Champion'];
    for (const id of top10) badges[id] = [...(badges[id] ?? []), 'Top 10'];
    const start = now - (3 - seasonIndex) * 30 * 24 * 3600 * 1000;
    previous.push({
      season: {
        id: `season_seed_${seasonIndex}`,
        name: `Season ${seasonIndex} — ${seasonIndex === 1 ? 'Lake Tana' : 'Highlands'}`,
        startedAt: start,
        endsAt: start + 30 * 24 * 3600 * 1000,
        kind: 'monthly',
      },
      championTeamId: champion,
      badges,
    });
    const championTeam = db.teams[champion];
    if (championTeam && !championTeam.badges.includes('Season Champion')) {
      championTeam.badges.push('Season Champion');
    }
  }
  db.previousSeasons = previous;
  db.season = {
    id: 'season_3',
    name: 'Season 3 — Blue Nile',
    startedAt: now - 9 * 24 * 3600 * 1000,
    endsAt: now + 21 * 24 * 3600 * 1000,
    kind: 'monthly',
  };

  scheduleSave();
  return { teams: TEAM_COUNT, players: Object.keys(db.players).length };
}

// CLI entry: npm run seed
if (process.argv[1] && process.argv[1].endsWith('generate.ts')) {
  loadStore();
  const db = getDb();
  db.teams = {};
  db.players = {};
  db.teamHistory = {};
  db.playerHistory = {};
  const { teams, players } = seedDb();
  console.log(`[seed] generated ${teams} synthetic teams and ${players} synthetic players`);
  setTimeout(() => process.exit(0), 800);
}
