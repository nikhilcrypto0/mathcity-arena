import type { MatchPlayerContribution, MatchTeamState } from '@mathcity/shared';
import {
  BONUS_POINTS,
  CONTRIBUTION_WEIGHTS,
  MATCH_MVP_WEIGHTS,
  MVP_MIN_QUESTIONS,
  RATING_K,
  SEASON_PARTICIPATION_MAX,
  SEASON_PARTICIPATION_MIN,
  SEASON_PLACEMENT_POINTS,
  VICTORY_SCORE_WEIGHTS,
} from '@mathcity/shared';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------
// Contribution
// ---------------------------------------------------------------------------

export interface ContributionComponents {
  mathematics: number;
  battle: number;
  defense: number;
  resources: number;
  crisis: number;
  teamwork: number;
}

export function contributionComponents(c: MatchPlayerContribution): ContributionComponents {
  return {
    mathematics: c.questionsCorrect * 10 + c.difficultySum * 2 + c.advancedSolved * 15,
    battle: c.attackDamage,
    defense: c.defenseBlocked + c.shieldsActivated * 25 + c.repairs * 15,
    resources: c.resourcesEarned * 0.5 + c.buildingsBuilt * 20,
    crisis: c.crisisSolved * 40 + c.crisisPrepared * 10,
    teamwork: c.assists * 20 + c.dragonTrialAnswers * 10 + c.finalSurgeActions * 5,
  };
}

/** Raw (unnormalized) contribution score for one player within their team. */
export function rawContribution(
  player: MatchPlayerContribution,
  teamMembers: MatchPlayerContribution[],
): number {
  const mine = contributionComponents(player);
  const totals: ContributionComponents = {
    mathematics: 0, battle: 0, defense: 0, resources: 0, crisis: 0, teamwork: 0,
  };
  for (const member of teamMembers) {
    const comp = contributionComponents(member);
    for (const key of Object.keys(totals) as (keyof ContributionComponents)[]) {
      totals[key] += comp[key];
    }
  }
  let score = 0;
  let usedWeight = 0;
  for (const key of Object.keys(CONTRIBUTION_WEIGHTS) as (keyof ContributionComponents)[]) {
    if (totals[key] > 0) {
      score += CONTRIBUTION_WEIGHTS[key] * (mine[key] / totals[key]);
      usedWeight += CONTRIBUTION_WEIGHTS[key];
    }
  }
  return usedWeight > 0 ? score / usedWeight : 0;
}

/**
 * Normalize raw contribution scores to integer percentages that total EXACTLY
 * 100 for the team. Rounding differences go to the player with the largest
 * unrounded remainder (deterministic tie-break by index). If every player has
 * zero raw contribution, the contribution is divided equally.
 */
export function normalizeContributions(raws: number[]): number[] {
  const n = raws.length;
  if (n === 0) return [];
  const sum = raws.reduce((s, v) => s + v, 0);
  const shares = sum > 0 ? raws.map((v) => (v / sum) * 100) : raws.map(() => 100 / n);

  const floors = shares.map(Math.floor);
  let remaining = 100 - floors.reduce((s, v) => s + v, 0);
  const remainders = shares
    .map((share, index) => ({ index, frac: share - Math.floor(share) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);

  const result = [...floors];
  for (let i = 0; i < remaining; i++) {
    result[remainders[i % n].index] += 1;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Match Victory Score (0-100 per team)
// ---------------------------------------------------------------------------

export interface VictoryScoreInput {
  damageDealt: number;
  damageBlocked: number;
  bestBattleInMatch: number;
  accuracy: number;           // 0..1
  advancedSolved: number;
  coreHealth: number;
  maxCoreHealth: number;
  knockedOut: boolean;
  survivalFraction: number;   // 0..1 of match duration survived
  crisisBase: number;
  crisisFinal: number;
  structuresBuilt: number;
  resourcesEarned: number;
  resourcesSpent: number;
  assists: number;
  rolesFilled: number;
}

export function victoryScoreBreakdown(input: VictoryScoreInput): Record<string, number> {
  const battleRaw = input.damageDealt + input.damageBlocked;
  const battle = input.bestBattleInMatch > 0 ? (battleRaw / input.bestBattleInMatch) * 100 : 0;
  const mathematics = clamp(input.accuracy * 70 + Math.min(input.advancedSolved, 10) * 3, 0, 100);
  const survival = input.knockedOut
    ? clamp(input.survivalFraction * 50, 0, 50)
    : clamp((input.coreHealth / input.maxCoreHealth) * 100, 0, 100);
  const crisis = input.crisisBase > 0
    ? clamp((1 - input.crisisFinal / input.crisisBase) * 100, 0, 100)
    : 0;
  const development = clamp(input.structuresBuilt * 14, 0, 100);
  const spentRatio = input.resourcesEarned > 0 ? input.resourcesSpent / input.resourcesEarned : 0;
  const resourceEfficiency = clamp(spentRatio * 100, 0, 100);
  const teamwork = clamp(input.assists * 12 + input.rolesFilled * 10, 0, 100);

  return {
    battle: round1(VICTORY_SCORE_WEIGHTS.battle * battle),
    mathematics: round1(VICTORY_SCORE_WEIGHTS.mathematics * mathematics),
    survival: round1(VICTORY_SCORE_WEIGHTS.survival * survival),
    crisis: round1(VICTORY_SCORE_WEIGHTS.crisis * crisis),
    development: round1(VICTORY_SCORE_WEIGHTS.development * development),
    resourceEfficiency: round1(VICTORY_SCORE_WEIGHTS.resourceEfficiency * resourceEfficiency),
    teamwork: round1(VICTORY_SCORE_WEIGHTS.teamwork * teamwork),
  };
}

export function victoryScore(input: VictoryScoreInput): number {
  const parts = victoryScoreBreakdown(input);
  return round1(Object.values(parts).reduce((s, v) => s + v, 0));
}

const round1 = (v: number) => Math.round(v * 10) / 10;

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

export interface PlacementInput {
  teamId: string;
  knockedOut: boolean;
  knockoutOrder: number | null; // 1 = first team knocked out
  coreHealth: number;
  victoryScore: number;
  accuracy: number;
  crisisFinalDamage: number;
  battleDifferential: number;
  scoreReachedAt: number;
}

/**
 * Rank teams into final placements. Active teams rank above knocked-out teams.
 * Active: core health, victory score, accuracy, crisis performance (less damage
 * is better), battle differential, earliest score time. Knocked-out: later
 * knockout (longer survival) ranks higher, then victory score, then accuracy.
 */
export function computePlacements(teams: PlacementInput[]): Map<string, number> {
  const active = teams.filter((t) => !t.knockedOut);
  const out = teams.filter((t) => t.knockedOut);

  active.sort((a, b) =>
    b.coreHealth - a.coreHealth ||
    b.victoryScore - a.victoryScore ||
    b.accuracy - a.accuracy ||
    a.crisisFinalDamage - b.crisisFinalDamage ||
    b.battleDifferential - a.battleDifferential ||
    a.scoreReachedAt - b.scoreReachedAt ||
    a.teamId.localeCompare(b.teamId),
  );
  out.sort((a, b) =>
    (b.knockoutOrder ?? 0) - (a.knockoutOrder ?? 0) ||
    b.victoryScore - a.victoryScore ||
    b.accuracy - a.accuracy ||
    a.teamId.localeCompare(b.teamId),
  );

  const placements = new Map<string, number>();
  [...active, ...out].forEach((t, i) => placements.set(t.teamId, i + 1));
  return placements;
}

// ---------------------------------------------------------------------------
// MVPs
// ---------------------------------------------------------------------------

export interface MvpInput {
  playerId: string;
  contribution: MatchPlayerContribution;
  contributionPercent: number;
  teamPlacement: number;
  teamCount: number;
}

export function matchMvpScore(input: MvpInput): number {
  const c = input.contribution;
  const accuracy = c.questionsAttempted > 0 ? c.questionsCorrect / c.questionsAttempted : 0;
  const avgDifficulty = c.questionsAttempted > 0 ? c.difficultySum / c.questionsAttempted : 0;
  const battle = clamp(c.attackDamage / 500, 0, 1);
  const defense = clamp((c.defenseBlocked + c.shieldsActivated * 50) / 500, 0, 1);
  const teamwork = clamp((c.assists * 2 + c.finalSurgeActions) / 10, 0, 1);
  const score =
    MATCH_MVP_WEIGHTS.accuracy * accuracy * 100 +
    MATCH_MVP_WEIGHTS.difficulty * (avgDifficulty / 5) * 100 +
    MATCH_MVP_WEIGHTS.teamContribution * input.contributionPercent +
    MATCH_MVP_WEIGHTS.battle * battle * 100 +
    MATCH_MVP_WEIGHTS.defense * defense * 100 +
    MATCH_MVP_WEIGHTS.teamwork * teamwork * 100;
  return round1(score);
}

export function qualifiesForMvp(c: MatchPlayerContribution): boolean {
  return c.questionsAttempted >= MVP_MIN_QUESTIONS;
}

/** Team MVP: strongest balanced contribution — highest raw contribution share. */
export function pickTeamMvp(
  members: { playerId: string; contribution: MatchPlayerContribution; contributionPercent: number }[],
): string | null {
  if (members.length === 0) return null;
  const sorted = [...members].sort(
    (a, b) =>
      b.contributionPercent - a.contributionPercent ||
      b.contribution.questionsCorrect - a.contribution.questionsCorrect ||
      a.playerId.localeCompare(b.playerId),
  );
  return sorted[0].playerId;
}

// ---------------------------------------------------------------------------
// Season points & rating
// ---------------------------------------------------------------------------

export function seasonPointsForPlacement(placement: number, victoryScoreValue: number): number {
  if (placement <= SEASON_PLACEMENT_POINTS.length) {
    return SEASON_PLACEMENT_POINTS[placement - 1];
  }
  return clamp(
    Math.round(20 + victoryScoreValue / 10),
    SEASON_PARTICIPATION_MIN,
    SEASON_PARTICIPATION_MAX,
  );
}

export function teamBonusPoints(team: {
  perfectCrisis: boolean;
  eliteTrialCompleted: boolean;
  mythicTrialCompleted: boolean;
}): number {
  let bonus = 0;
  if (team.perfectCrisis) bonus += BONUS_POINTS.perfectCrisisDefense;
  if (team.eliteTrialCompleted) bonus += BONUS_POINTS.eliteDragonTrial;
  if (team.mythicTrialCompleted) bonus += BONUS_POINTS.mythicDragonTrial;
  return bonus;
}

export function ratingChange(
  teamRating: number,
  opponentAverageRating: number,
  placement: number,
  teamCount: number,
): number {
  if (teamCount < 2) return 0;
  const expected = 1 / (1 + 10 ** ((opponentAverageRating - teamRating) / 400));
  const actual = (teamCount - placement) / (teamCount - 1);
  return Math.round(RATING_K * (actual - expected));
}

export function winRatio(wins: number, matchesPlayed: number): number {
  if (matchesPlayed === 0) return 0;
  return Math.round((wins / matchesPlayed) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Leaderboard ordering
// ---------------------------------------------------------------------------

export interface TeamRankInput {
  teamId: string;
  seasonPoints: number;
  wins: number;
  averagePlacement: number | null;
  mathsAccuracy: number;
  rating: number;
  lastMatchScore: number;
}

/** Deterministic season leaderboard ordering per the spec. */
export function compareTeamsForLeaderboard(a: TeamRankInput, b: TeamRankInput): number {
  return (
    b.seasonPoints - a.seasonPoints ||
    b.wins - a.wins ||
    (a.averagePlacement ?? 99) - (b.averagePlacement ?? 99) ||
    b.mathsAccuracy - a.mathsAccuracy ||
    b.rating - a.rating ||
    b.lastMatchScore - a.lastMatchScore ||
    a.teamId.localeCompare(b.teamId)
  );
}

export function teamAccuracy(team: MatchTeamState): number {
  let attempted = 0;
  let correct = 0;
  for (const p of team.players) {
    attempted += p.contribution.questionsAttempted;
    correct += p.contribution.questionsCorrect;
  }
  return attempted > 0 ? correct / attempted : 0;
}
