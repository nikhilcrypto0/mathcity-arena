import { describe, expect, it } from 'vitest';
import {
  compareTeamsForLeaderboard,
  computePlacements,
  matchMvpScore,
  normalizeContributions,
  pickTeamMvp,
  qualifiesForMvp,
  ratingChange,
  rawContribution,
  seasonPointsForPlacement,
  teamBonusPoints,
  victoryScore,
  winRatio,
} from '../src/game/scoring.ts';
import { computeCrisisDamage } from '../src/game/crisis.ts';
import { CRISES } from '@mathcity/shared';
import type { MatchPlayerContribution } from '@mathcity/shared';

function contribution(partial: Partial<MatchPlayerContribution> = {}): MatchPlayerContribution {
  return {
    questionsAttempted: 0, questionsCorrect: 0, difficultySum: 0, streak: 0, bestStreak: 0,
    advancedSolved: 0, resourcesEarned: 0, resourcesSpent: 0, buildingsBuilt: 0,
    crisisPrepared: 0, crisisSolved: 0, unitsDeployed: 0, attackDamage: 0, defenseBlocked: 0,
    repairs: 0, shieldsActivated: 0, assists: 0, dragonTrialAnswers: 0, finalSurgeActions: 0,
    ...partial,
  };
}

describe('contribution normalization', () => {
  it('totals exactly 100 for uneven raw scores', () => {
    const result = normalizeContributions([1, 1, 1]);
    expect(result.reduce((s, v) => s + v, 0)).toBe(100);
    expect(Math.max(...result) - Math.min(...result)).toBeLessThanOrEqual(1);
  });

  it('assigns rounding difference to the largest unrounded remainder', () => {
    // 5/9, 3/9, 1/9 → 55.56, 33.33, 11.11 → floors sum to 99; the leftover
    // point goes to index 0, which has the largest fractional remainder (.56).
    const result = normalizeContributions([5, 3, 1]);
    expect(result).toEqual([56, 33, 11]);
    expect(result.reduce((s, v) => s + v, 0)).toBe(100);

    // Equal remainders tie-break deterministically by index.
    const tied = normalizeContributions([1, 1, 4]);
    expect(tied.reduce((s, v) => s + v, 0)).toBe(100);
    expect(tied).toEqual([17, 17, 66]);
  });

  it('splits equally when every raw contribution is zero', () => {
    expect(normalizeContributions([0, 0, 0, 0])).toEqual([25, 25, 25, 25]);
    const three = normalizeContributions([0, 0, 0]);
    expect(three.reduce((s, v) => s + v, 0)).toBe(100);
  });

  it('handles a solo team', () => {
    expect(normalizeContributions([0])).toEqual([100]);
    expect(normalizeContributions([42])).toEqual([100]);
  });

  it('is not driven by attack damage alone', () => {
    const attacker = contribution({ attackDamage: 900 });
    const scholar = contribution({
      questionsAttempted: 20, questionsCorrect: 18, difficultySum: 60,
      advancedSolved: 4, resourcesEarned: 300, crisisSolved: 3,
    });
    const team = [attacker, scholar];
    const rawAttacker = rawContribution(attacker, team);
    const rawScholar = rawContribution(scholar, team);
    expect(rawScholar).toBeGreaterThan(rawAttacker);
  });
});

describe('crisis damage', () => {
  it('matches the flood example from the design spec exactly', () => {
    // Base 1000, drainage −300, three correct answers −250, reserve −100 → 350
    const report = computeCrisisDamage({
      crisisId: 'flood',
      structures: { drainage: 1 },
      answerReduction: 250,
      correctAnswers: 3,
      coinsHeld: 150,
    });
    expect(report.baseDamage).toBe(1000);
    expect(report.structureReduction).toBe(300);
    expect(report.answerReduction).toBe(250);
    expect(report.reserveReduction).toBe(100);
    expect(report.finalDamage).toBe(350);
  });

  it('uses the same base damage for every team regardless of preparation', () => {
    const prepared = computeCrisisDamage({
      crisisId: 'flood', structures: { drainage: 1, emergency_shelter: 1 },
      answerReduction: 250, correctAnswers: 3, coinsHeld: 500,
    });
    const unprepared = computeCrisisDamage({
      crisisId: 'flood', structures: {}, answerReduction: 0, correctAnswers: 0, coinsHeld: 0,
    });
    expect(prepared.baseDamage).toBe(unprepared.baseDamage);
    expect(unprepared.finalDamage).toBe(CRISES.flood.baseDamage);
    expect(prepared.finalDamage).toBeLessThan(unprepared.finalDamage);
  });

  it('never produces negative damage', () => {
    const report = computeCrisisDamage({
      crisisId: 'power_shortage',
      structures: { solar_station: 1, emergency_shelter: 1 },
      answerReduction: 500,
      correctAnswers: 5,
      coinsHeld: 1000,
    });
    expect(report.finalDamage).toBe(0);
  });

  it('produces a transparent breakdown', () => {
    const report = computeCrisisDamage({
      crisisId: 'flood', structures: { drainage: 1 }, answerReduction: 100,
      correctAnswers: 1, coinsHeld: 0,
    });
    expect(report.breakdownLines.join('\n')).toContain('Base');
    expect(report.breakdownLines.join('\n')).toContain('Drainage');
    expect(report.breakdownLines.at(-1)).toContain(`Final damage: ${report.finalDamage}`);
  });
});

describe('placements', () => {
  const basePlacement = {
    knockedOut: false, knockoutOrder: null as number | null, coreHealth: 1000,
    victoryScore: 50, accuracy: 0.5, crisisFinalDamage: 300, battleDifferential: 0,
    scoreReachedAt: 1000,
  };

  it('ranks active teams above knocked-out teams', () => {
    const placements = computePlacements([
      { ...basePlacement, teamId: 'alive', coreHealth: 10 },
      { ...basePlacement, teamId: 'dead', knockedOut: true, knockoutOrder: 1, coreHealth: 0, victoryScore: 90 },
    ]);
    expect(placements.get('alive')).toBe(1);
    expect(placements.get('dead')).toBe(2);
  });

  it('ranks knocked-out teams by survival (later knockout is better)', () => {
    const placements = computePlacements([
      { ...basePlacement, teamId: 'winner' },
      { ...basePlacement, teamId: 'first_out', knockedOut: true, knockoutOrder: 1 },
      { ...basePlacement, teamId: 'second_out', knockedOut: true, knockoutOrder: 2 },
    ]);
    expect(placements.get('winner')).toBe(1);
    expect(placements.get('second_out')).toBe(2);
    expect(placements.get('first_out')).toBe(3);
  });

  it('breaks active-team ties deterministically through the rule chain', () => {
    const placements = computePlacements([
      { ...basePlacement, teamId: 'b', victoryScore: 60 },
      { ...basePlacement, teamId: 'a', victoryScore: 60, accuracy: 0.9 },
    ]);
    expect(placements.get('a')).toBe(1);

    const identical = computePlacements([
      { ...basePlacement, teamId: 'zeta' },
      { ...basePlacement, teamId: 'alpha' },
    ]);
    expect(identical.get('alpha')).toBe(1); // final deterministic tie-break: id
  });
});

describe('MVPs', () => {
  it('requires minimum participation', () => {
    expect(qualifiesForMvp(contribution({ questionsAttempted: 2 }))).toBe(false);
    expect(qualifiesForMvp(contribution({ questionsAttempted: 3 }))).toBe(true);
  });

  it('team MVP has the strongest balanced contribution', () => {
    const members = [
      { playerId: 'p1', contribution: contribution({ questionsCorrect: 2 }), contributionPercent: 20 },
      { playerId: 'p2', contribution: contribution({ questionsCorrect: 9 }), contributionPercent: 55 },
      { playerId: 'p3', contribution: contribution({ questionsCorrect: 4 }), contributionPercent: 25 },
    ];
    expect(pickTeamMvp(members)).toBe('p2');
  });

  it('match MVP score rewards accuracy and difficulty over raw attack', () => {
    const scholar = matchMvpScore({
      playerId: 's', teamPlacement: 2, teamCount: 6, contributionPercent: 40,
      contribution: contribution({
        questionsAttempted: 12, questionsCorrect: 11, difficultySum: 48, advancedSolved: 3,
      }),
    });
    const brawler = matchMvpScore({
      playerId: 'b', teamPlacement: 1, teamCount: 6, contributionPercent: 40,
      contribution: contribution({ questionsAttempted: 4, questionsCorrect: 2, difficultySum: 6, attackDamage: 700 }),
    });
    expect(scholar).toBeGreaterThan(brawler);
  });
});

describe('season points and rating', () => {
  it('awards fixed points for podium placements', () => {
    expect(seasonPointsForPlacement(1, 80)).toBe(100);
    expect(seasonPointsForPlacement(2, 80)).toBe(75);
    expect(seasonPointsForPlacement(3, 80)).toBe(60);
    expect(seasonPointsForPlacement(4, 80)).toBe(50);
    expect(seasonPointsForPlacement(5, 80)).toBe(40);
  });

  it('awards clamped participation points below fifth place', () => {
    expect(seasonPointsForPlacement(6, 0)).toBeGreaterThanOrEqual(10);
    expect(seasonPointsForPlacement(6, 100)).toBeLessThanOrEqual(35);
  });

  it('keeps bonus points below placement value', () => {
    const maxBonus = teamBonusPoints({
      perfectCrisis: true, eliteTrialCompleted: true, mythicTrialCompleted: true,
    });
    expect(maxBonus).toBeLessThan(40); // never overwhelms the last-place placement points
  });

  it('rating rises for beating stronger lobbies and falls for losing to weaker ones', () => {
    expect(ratingChange(1000, 1200, 1, 6)).toBeGreaterThan(0);
    expect(ratingChange(1200, 1000, 6, 6)).toBeLessThan(0);
  });

  it('win ratio handles zero matches', () => {
    expect(winRatio(0, 0)).toBe(0);
    expect(winRatio(3, 4)).toBe(75);
  });
});

describe('leaderboard ordering', () => {
  const team = (id: string, points: number, wins: number, avg: number | null) => ({
    teamId: id, seasonPoints: points, wins, averagePlacement: avg,
    mathsAccuracy: 0.5, rating: 1000, lastMatchScore: 50,
  });

  it('does not rank a one-match team above a strong many-match team on win ratio alone', () => {
    const lucky = team('lucky', 100, 1, 1);      // one win from one match
    const steady = team('steady', 620, 5, 2.1);  // strong across many matches
    const sorted = [lucky, steady].sort(compareTeamsForLeaderboard);
    expect(sorted[0].teamId).toBe('steady');
  });

  it('is deterministic for fully tied teams', () => {
    const a = team('aa', 100, 2, 2);
    const b = team('bb', 100, 2, 2);
    expect([b, a].sort(compareTeamsForLeaderboard)[0].teamId).toBe('aa');
  });
});
