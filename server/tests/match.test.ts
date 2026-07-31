import { describe, expect, it } from 'vitest';
import { MATCH_TOTAL_VSECONDS, Match, correctSubmissionFor, type MatchTeamSetup } from '../src/game/match.ts';
import { QUESTIONS_BY_ID } from '../src/questions/bank.ts';
import { makeBotTeam } from '../src/game/bots.ts';
import { makeRng } from '../src/questions/rng.ts';
import { CRISES, MAX_TEAM_SIZE } from '@mathcity/shared';
import type { MatchResults } from '@mathcity/shared';

function makeSetups(count = 6, seed = 42): MatchTeamSetup[] {
  const rng = makeRng(seed);
  return Array.from({ length: count }, (_, i) => {
    const bot = makeBotTeam(rng, i, { accuracy: 0.45 + i * 0.09 });
    return {
      team: bot.team,
      players: bot.profiles.map((profile) => ({
        profile,
        isBot: true,
        character: null,
        role: null,
      })),
      bot: bot.bot,
    } satisfies MatchTeamSetup;
  });
}

function runFullMatch(seed = 42): { match: Match; results: MatchResults } {
  let results: MatchResults | null = null;
  const match = new Match(
    `match_test_${seed}`,
    makeSetups(6, seed),
    { mode: 'quick', speedFactor: 1, seed, crisisId: 'flood', manualClock: true },
    {
      toPlayer: () => {},
      toAll: () => {},
      onFinished: (r) => { results = r; },
    },
  );
  match.advance(MATCH_TOTAL_VSECONDS + 5);
  expect(match.isFinished).toBe(true);
  expect(results).not.toBeNull();
  return { match, results: results! };
}

describe('full match simulation', () => {
  const { results } = runFullMatch();

  it('produces unique placements 1..N', () => {
    const placements = results.teams.map((t) => t.placement).sort((a, b) => a - b);
    expect(placements).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('contribution percentages total exactly 100 per team', () => {
    for (const team of results.teams) {
      const members = results.players.filter((p) => p.teamId === team.teamId);
      const total = members.reduce((s, p) => s + p.contributionPercent, 0);
      expect(total, team.name).toBe(100);
    }
  });

  it('every team faced the same base crisis damage', () => {
    const bases = results.teams
      .map((t) => t.crisisReport?.baseDamage)
      .filter((b): b is number => b !== undefined && b !== null);
    expect(bases.length).toBeGreaterThan(0);
    for (const base of bases) expect(base).toBe(CRISES.flood.baseDamage);
  });

  it('crisis damage differs only through preparation, shown transparently', () => {
    const reports = results.teams.map((t) => t.crisisReport).filter(Boolean);
    for (const report of reports) {
      expect(report!.finalDamage).toBe(
        Math.max(0, report!.baseDamage - report!.structureReduction - report!.answerReduction - report!.reserveReduction),
      );
      expect(report!.breakdownLines.length).toBeGreaterThan(1);
    }
  });

  it('selects one team MVP per team and exactly one match MVP', () => {
    for (const team of results.teams) {
      const mvps = results.players.filter((p) => p.teamId === team.teamId && p.isTeamMvp);
      expect(mvps.length, team.name).toBe(1);
    }
    expect(results.players.filter((p) => p.isMatchMvp).length).toBe(1);
    expect(results.matchMvpId).toBeTruthy();
    expect(results.mvpCandidates.length).toBeGreaterThanOrEqual(1);
    expect(results.mvpCandidates.length).toBeLessThanOrEqual(5);
  });

  it('awards season points consistent with placement', () => {
    const first = results.teams.find((t) => t.placement === 1)!;
    const last = results.teams.find((t) => t.placement === 6)!;
    expect(first.seasonPointsGained).toBeGreaterThanOrEqual(100);
    expect(last.seasonPointsGained).toBeLessThan(first.seasonPointsGained);
    expect(last.seasonPointsGained).toBeGreaterThanOrEqual(10);
  });

  it('is deterministic for the same seed', () => {
    // Team ids are random per run, so compare by deterministic team name.
    const a = runFullMatch(7);
    const b = runFullMatch(7);
    expect(a.results.teams.map((t) => `${t.name}:${t.placement}`)).toEqual(
      b.results.teams.map((t) => `${t.name}:${t.placement}`),
    );
  });
});

describe('match rules enforcement', () => {
  it('rejects teams larger than the maximum size', () => {
    const rng = makeRng(1);
    const bot = makeBotTeam(rng, 0, { teamSize: 4 });
    const extra = makeBotTeam(rng, 1, { teamSize: 1 });
    const setup: MatchTeamSetup = {
      team: bot.team,
      players: [...bot.profiles, extra.profiles[0]].map((profile) => ({
        profile, isBot: true, character: null, role: null,
      })),
      bot: bot.bot,
    };
    expect(setup.players.length).toBe(MAX_TEAM_SIZE + 1);
    expect(
      () =>
        new Match('match_oversize', [setup], { mode: 'quick', speedFactor: 1, manualClock: true }, {
          toPlayer: () => {}, toAll: () => {}, onFinished: () => {},
        }),
    ).toThrow(/maximum size/);
  });

  it('enforces attack fair-play: shields, same-target lock, no self-attack', () => {
    const setups = makeSetups(3, 99);
    const match = new Match('match_rules', setups, {
      mode: 'quick', speedFactor: 1, seed: 99, crisisId: 'drought', manualClock: true,
    }, { toPlayer: () => {}, toAll: () => {}, onFinished: () => {} });

    const attackerId = setups[0].players[0].profile.id;
    const attackerTeam = setups[0].team.id;
    const targetTeam = setups[1].team.id;

    // Advance into the raid phase (starts at t=490, after the crisis strikes).
    match.advance(500);

    const selfAttack = match.attack(attackerId, attackerTeam);
    expect('error' in selfAttack && selfAttack.error).toMatch(/own district/);

    // Deploy a unit so attacks are possible (bots may already have some).
    match.deploy(attackerId, 'scout');
    const first = match.attack(attackerId, targetTeam);
    if ('error' in first) {
      // Bots may already be raiding that target or it may be shielded; the
      // point of this test is the *reason* is always a fair-play rule.
      expect(first.error).toMatch(/shield|attack|knocked|recently/i);
      return;
    }
    // Immediate re-attack on the same target must be blocked (active raid).
    const second = match.attack(attackerId, targetTeam);
    expect('error' in second).toBe(true);

    // After the raid resolves, the same-target lock and recovery shield apply.
    match.advance(20);
    const third = match.attack(attackerId, targetTeam);
    expect('error' in third).toBe(true);
    if ('error' in third) expect(third.error).toMatch(/shield|recently/i);
  });

  it('limits dragons to one deployment per match', () => {
    const rng = makeRng(5);
    const strong = makeBotTeam(rng, 0, { accuracy: 0.95, teamSize: 2 });
    const other = makeBotTeam(rng, 1, { accuracy: 0.3, teamSize: 2 });
    const setups: MatchTeamSetup[] = [strong, other].map((b) => ({
      team: b.team,
      players: b.profiles.map((profile) => ({ profile, isBot: true, character: null, role: null })),
      bot: undefined, // no bot AI: we control actions manually
    }));
    const match = new Match('match_dragon', setups, {
      mode: 'quick', speedFactor: 1, seed: 5, crisisId: 'flood', manualClock: true,
    }, { toPlayer: () => {}, toAll: () => {}, onFinished: () => {} });

    const playerId = strong.profiles[0].id;
    match.advance(460); // raid phase

    // Earn enough advanced answers + resources for a standard dragon.
    for (let i = 0; i < 12; i++) {
      const q = match.requestQuestion(playerId, 'earn', { advanced: true });
      if ('error' in q) continue;
      const question = QUESTIONS_BY_ID.get(q.id)!;
      match.submitAnswer(playerId, q.id, correctSubmissionFor(question));
    }

    const first = match.deploy(playerId, 'dragon_standard');
    expect('error' in first).toBe(false);
    const second = match.deploy(playerId, 'dragon_standard');
    expect('error' in second).toBe(true);
    if ('error' in second) expect(second.error).toMatch(/once/);
  });

  it('preserves permanent identity while match state resets between matches', () => {
    const seed = 11;
    const setups = makeSetups(6, seed);
    const run = (s: MatchTeamSetup[]) => {
      let results: MatchResults | null = null;
      const m = new Match(`m_${Math.random()}`, s, {
        mode: 'quick', speedFactor: 1, seed, crisisId: 'flood', manualClock: true,
      }, { toPlayer: () => {}, toAll: () => {}, onFinished: (r) => { results = r; } });
      m.advance(MATCH_TOTAL_VSECONDS + 5);
      return results!;
    };
    const firstRun = run(setups);
    // A brand-new match with the same teams starts fresh: full cores, no structures.
    const secondMatch = new Match('m_fresh', setups, {
      mode: 'quick', speedFactor: 1, seed, crisisId: 'flood', manualClock: true,
    }, { toPlayer: () => {}, toAll: () => {}, onFinished: () => {} });
    for (const t of secondMatch.teamStates) {
      expect(t.coreHealth).toBe(t.maxCoreHealth);
      expect(Object.keys(t.structures)).toHaveLength(0);
      expect(t.knockedOut).toBe(false);
      expect(t.battle.damageDealt).toBe(0);
    }
    // Team identity persists across matches.
    expect(secondMatch.teamStates.map((t) => t.teamId).sort()).toEqual(
      firstRun.teams.map((t) => t.teamId).sort(),
    );
  });
});
