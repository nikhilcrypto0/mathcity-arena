import type {
  CharacterId,
  MatchMode,
  MatchResults,
  PartyView,
  PlayerProfile,
  Team,
  TeamRole,
} from '@mathcity/shared';
import { DEFAULT_RATING, SPEED_FACTOR, TEAMS_PER_MATCH } from '@mathcity/shared';
import { newCode, newId } from './ids.ts';
import { appendHistory, getDb, recordMatch, upsertPlayer, upsertTeam } from './store.ts';
import { Match, type MatchTeamSetup } from './game/match.ts';
import { makeBotTeam, type BotProfile } from './game/bots.ts';
import { makeRng } from './questions/rng.ts';

const QUEUE_WAIT_MS = 4000;
const SPEED_ENV_MULT = Number(process.env.MC_SPEED ?? '1') || 1;

export interface PartyMember {
  playerId: string;
  ready: boolean;
  character: CharacterId | null;
  role: TeamRole | null;
}

export interface Party {
  code: string;
  leaderId: string;
  members: PartyMember[];
  mode: MatchMode | null;
  inQueue: boolean;
  queuedAt: number;
}

export interface MatchmakingCallbacks {
  toPlayer: (playerId: string, event: string, payload: unknown) => void;
  toDemo: (event: string, payload: unknown) => void;
  onPartyChanged: (party: Party) => void;
  onMatchStarted: (matchId: string, playerIds: string[]) => void;
}

export class MatchmakingService {
  private parties = new Map<string, Party>();
  private playerParty = new Map<string, string>();
  private matches = new Map<string, Match>();
  private playerMatch = new Map<string, string>();
  private queueTimer: NodeJS.Timeout | null = null;

  constructor(private cb: MatchmakingCallbacks) {}

  start(): void {
    this.queueTimer = setInterval(() => this.tickQueue(), 1500);
  }

  stop(): void {
    if (this.queueTimer) clearInterval(this.queueTimer);
    for (const match of this.matches.values()) match.stop();
  }

  // -------------------------------------------------------------------------
  // Parties
  // -------------------------------------------------------------------------

  createParty(playerId: string): Party {
    this.leaveParty(playerId);
    const party: Party = {
      code: newCode(5),
      leaderId: playerId,
      members: [{ playerId, ready: false, character: null, role: null }],
      mode: null,
      inQueue: false,
      queuedAt: 0,
    };
    this.parties.set(party.code, party);
    this.playerParty.set(playerId, party.code);
    return party;
  }

  joinParty(code: string, playerId: string): Party | { error: string } {
    const party = this.parties.get(code.toUpperCase().trim());
    if (!party) return { error: 'No party found with that code.' };
    if (party.members.length >= 4) return { error: 'That party is already full (max 4 players).' };
    if (party.inQueue) return { error: 'That party is already searching for a match.' };
    if (party.members.some((m) => m.playerId === playerId)) return party;
    this.leaveParty(playerId);
    party.members.push({ playerId, ready: false, character: null, role: null });
    this.playerParty.set(playerId, party.code);
    this.cb.onPartyChanged(party);
    return party;
  }

  leaveParty(playerId: string): void {
    const code = this.playerParty.get(playerId);
    if (!code) return;
    const party = this.parties.get(code);
    this.playerParty.delete(playerId);
    if (!party) return;
    party.members = party.members.filter((m) => m.playerId !== playerId);
    if (party.members.length === 0) {
      this.parties.delete(code);
      return;
    }
    if (party.leaderId === playerId) party.leaderId = party.members[0].playerId;
    this.cb.onPartyChanged(party);
  }

  partyOf(playerId: string): Party | null {
    const code = this.playerParty.get(playerId);
    return code ? this.parties.get(code) ?? null : null;
  }

  updateMember(
    playerId: string,
    update: Partial<Pick<PartyMember, 'ready' | 'character' | 'role'>>,
  ): Party | null {
    const party = this.partyOf(playerId);
    if (!party) return null;
    const member = party.members.find((m) => m.playerId === playerId);
    if (!member) return null;
    Object.assign(member, update);
    this.cb.onPartyChanged(party);
    return party;
  }

  partyView(party: Party, teamName: string, teamEmblem: string): PartyView {
    const db = getDb();
    return {
      code: party.code,
      members: party.members.map((m) => {
        const profile = db.players[m.playerId];
        return {
          playerId: m.playerId,
          name: profile?.name ?? 'Player',
          avatar: profile?.avatar ?? 'lion',
          ready: m.ready,
          character: m.character,
          role: m.role,
          isLeader: m.playerId === party.leaderId,
        };
      }),
      teamName,
      teamEmblem,
      inQueue: party.inQueue,
      mode: party.mode,
    };
  }

  // -------------------------------------------------------------------------
  // Queue
  // -------------------------------------------------------------------------

  queueParty(playerId: string, mode: MatchMode): { error: string } | { queued: true } {
    const party = this.partyOf(playerId);
    if (!party) return { error: 'Create or join a party first.' };
    if (party.leaderId !== playerId) return { error: 'Only the party leader can start matchmaking.' };
    if (party.inQueue) return { error: 'Already searching for a match.' };
    if (this.playerMatch.has(playerId)) return { error: 'You are already in a match.' };
    party.mode = mode;
    party.inQueue = true;
    party.queuedAt = Date.now();
    this.cb.onPartyChanged(party);
    return { queued: true };
  }

  cancelQueue(playerId: string): void {
    const party = this.partyOf(playerId);
    if (!party) return;
    party.inQueue = false;
    party.mode = null;
    this.cb.onPartyChanged(party);
  }

  private tickQueue(): void {
    const waiting = [...this.parties.values()].filter((p) => p.inQueue);
    if (waiting.length === 0) return;
    const byMode = new Map<MatchMode, Party[]>();
    for (const party of waiting) {
      const mode = party.mode ?? 'quick';
      byMode.set(mode, [...(byMode.get(mode) ?? []), party]);
    }
    for (const [mode, parties] of byMode) {
      const oldest = Math.min(...parties.map((p) => p.queuedAt));
      const enoughParties = parties.length >= TEAMS_PER_MATCH;
      const waitedLongEnough = Date.now() - oldest >= QUEUE_WAIT_MS;
      if (enoughParties || waitedLongEnough) {
        this.launchMatch(parties.slice(0, TEAMS_PER_MATCH), mode);
      }
    }
  }

  /** Resolve the persistent team a party plays as (leader's team, or auto-created). */
  private teamForParty(party: Party): Team {
    const db = getDb();
    const leader = db.players[party.leaderId];
    if (leader?.teamId && db.teams[leader.teamId]) return db.teams[leader.teamId];
    const team: Team = {
      id: newId('team'),
      name: `${leader?.name ?? 'Player'}'s Squad`,
      emblem: 'lake_star',
      code: newCode(),
      memberIds: party.members.map((m) => m.playerId),
      createdAt: Date.now(),
      rating: DEFAULT_RATING,
      seasonPoints: 0,
      stats: {
        matchesPlayed: 0, wins: 0, second: 0, third: 0, winStreak: 0, bestWinStreak: 0,
        placementSum: 0, questionsAttempted: 0, questionsCorrect: 0, contributionSum: 0,
        crisisSurvived: 0, crisisFaced: 0,
        dragonsDeployed: { standard: 0, elite: 0, mythic: 0 },
        trophies: [], lifetimePoints: 0, highestLifetimeRank: null,
      },
      badges: [],
    };
    upsertTeam(team);
    if (leader) {
      leader.teamId = team.id;
      upsertPlayer(leader);
    }
    return team;
  }

  /** Pick rating-matched persistent synthetic teams from the store as opponents. */
  private syntheticOpponents(count: number, targetRating: number): MatchTeamSetup[] {
    const db = getDb();
    const busy = new Set<string>();
    for (const match of this.matches.values()) {
      if (match.isFinished) continue;
      for (const t of match.teamStates) busy.add(t.teamId);
    }
    const candidates = Object.values(db.teams)
      .filter((t) => t.isSynthetic && !busy.has(t.id) && t.memberIds.length > 0)
      .sort((a, b) => Math.abs(a.rating - targetRating) - Math.abs(b.rating - targetRating))
      .slice(0, count);

    const setups: MatchTeamSetup[] = candidates.map((team) => {
      const profiles = team.memberIds
        .map((id) => db.players[id])
        .filter((p): p is PlayerProfile => Boolean(p));
      const accuracy = Math.min(0.92, Math.max(0.4, 0.4 + (team.rating - 800) / 900));
      const bot: BotProfile = {
        accuracy,
        aggression: 0.35 + (team.rating % 100) / 200,
        buildOrder: ['drainage', 'walls', 'emergency_shelter', 'solar_station', 'archer_tower'],
        characters: profiles[0]?.unlockedCharacters ?? ['scout', 'archer'],
      };
      return {
        team,
        players: profiles.slice(0, 4).map((profile) => ({
          profile, isBot: true, character: null, role: null,
        })),
        bot,
      };
    });

    // Fallback: fabricate fresh bot teams if the store has too few synthetic teams.
    const rng = makeRng(Date.now() % 100000);
    let index = 0;
    while (setups.length < count) {
      const made = makeBotTeam(rng, index++, {});
      upsertTeam(made.team);
      for (const p of made.profiles) upsertPlayer(p);
      setups.push({
        team: made.team,
        players: made.profiles.map((profile) => ({ profile, isBot: true, character: null, role: null })),
        bot: made.bot,
      });
    }
    return setups;
  }

  private launchMatch(parties: Party[], mode: MatchMode): void {
    const db = getDb();
    const humanSetups: MatchTeamSetup[] = parties.map((party) => {
      const team = this.teamForParty(party);
      return {
        team,
        players: party.members.map((m) => ({
          profile: db.players[m.playerId],
          isBot: false,
          character: m.character,
          role: m.role,
        })),
      };
    });
    const averageRating =
      humanSetups.reduce((s, t) => s + t.team.rating, 0) / humanSetups.length;
    const botSetups = this.syntheticOpponents(TEAMS_PER_MATCH - humanSetups.length, averageRating);
    const matchId = newId('match');
    const speedFactor = SPEED_FACTOR[mode] * SPEED_ENV_MULT;

    // The callbacks below may fire from inside the Match constructor, so they
    // must not close over the not-yet-initialized `match` binding directly.
    let matchRef: Match | null = null;
    const humanIdSet = new Set(parties.flatMap((p) => p.members.map((m) => m.playerId)));
    const match = new Match(matchId, [...humanSetups, ...botSetups], { mode, speedFactor }, {
      toPlayer: (playerId, event, payload) => this.cb.toPlayer(playerId, event, payload),
      toAll: (event, payload) => {
        for (const pid of humanIdSet) this.cb.toPlayer(pid, event, payload);
      },
      onFinished: (results) => {
        if (matchRef) this.handleFinished(results, matchRef);
      },
    });
    matchRef = match;
    this.matches.set(matchId, match);

    for (const party of parties) {
      party.inQueue = false;
      party.mode = null;
      for (const member of party.members) this.playerMatch.set(member.playerId, matchId);
    }
    const humanIds = parties.flatMap((p) => p.members.map((m) => m.playerId));
    this.cb.onMatchStarted(matchId, humanIds);
    match.start();
    // Send the first snapshot immediately so clients can render the lobby.
    for (const pid of humanIds) {
      this.cb.toPlayer(pid, 'match:snapshot', match.snapshotFor(pid));
    }
  }

  matchOf(playerId: string): Match | null {
    const id = this.playerMatch.get(playerId);
    return id ? this.matches.get(id) ?? null : null;
  }

  registerDemoMatch(match: Match): void {
    this.matches.set(match.id, match);
  }

  removeMatch(matchId: string): void {
    const match = this.matches.get(matchId);
    if (match) match.stop();
    this.matches.delete(matchId);
    for (const [pid, mid] of this.playerMatch) {
      if (mid === matchId) this.playerMatch.delete(pid);
    }
  }

  // -------------------------------------------------------------------------
  // Result persistence
  // -------------------------------------------------------------------------

  private handleFinished(results: MatchResults, match: Match): void {
    applyMatchResults(results, match);
    // Free players from the match after a grace period for the results screen.
    setTimeout(() => this.removeMatch(match.id), 60_000);
  }
}

/**
 * Persist a finished match: team stats, player stats, season points, rating,
 * histories. Ranked updates points + rating; quick updates points only;
 * casual updates lifetime stats only.
 */
export function applyMatchResults(results: MatchResults, _match: Match): void {
  const db = getDb();
  const mode = results.mode;
  const grantPoints = mode === 'ranked' || mode === 'quick' || mode === 'demo';
  const grantRating = mode === 'ranked' || mode === 'demo';

  if (!grantRating) {
    for (const t of results.teams) {
      t.ratingChange = 0;
      t.newRating = db.teams[t.teamId]?.rating ?? t.newRating - t.ratingChange;
    }
  }
  if (!grantPoints) {
    for (const t of results.teams) {
      t.seasonPointsGained = 0;
      t.newSeasonPoints = db.teams[t.teamId]?.seasonPoints ?? 0;
    }
    for (const p of results.players) p.seasonPointsGained = 0;
  }

  for (const teamResult of results.teams) {
    const team = db.teams[teamResult.teamId];
    if (!team) continue;
    const s = team.stats;
    s.matchesPlayed += 1;
    s.placementSum += teamResult.placement;
    if (teamResult.placement === 1) {
      s.wins += 1;
      s.winStreak += 1;
      s.bestWinStreak = Math.max(s.bestWinStreak, s.winStreak);
      if (!s.trophies.includes('champion')) s.trophies.push('champion');
    } else {
      s.winStreak = 0;
      if (teamResult.placement === 2) s.second += 1;
      if (teamResult.placement === 3) s.third += 1;
    }
    if (teamResult.crisisReport) {
      s.crisisFaced += 1;
      if (!teamResult.knockedOut) s.crisisSurvived += 1;
    }
    const memberResults = results.players.filter((p) => p.teamId === teamResult.teamId);
    for (const m of memberResults) {
      s.questionsAttempted += m.questionsAttempted;
      s.questionsCorrect += m.questionsCorrect;
      s.contributionSum += m.contributionPercent;
    }
    if (grantPoints) {
      team.seasonPoints += teamResult.seasonPointsGained;
      s.lifetimePoints += teamResult.seasonPointsGained;
    }
    if (grantRating) team.rating += teamResult.ratingChange;
    upsertTeam(team);
    appendHistory(db.teamHistory, team.id, {
      matchId: results.matchId,
      endedAt: results.endedAt,
      mode,
      placement: teamResult.placement,
      teams: results.teams.length,
      victoryScore: teamResult.victoryScore,
      seasonPointsGained: teamResult.seasonPointsGained,
      wasMvp: false,
    });
  }

  for (const playerResult of results.players) {
    const player = db.players[playerResult.playerId];
    if (!player) continue;
    const teamResult = results.teams.find((t) => t.teamId === playerResult.teamId);
    const s = player.stats;
    s.matchesPlayed += 1;
    if (teamResult?.placement === 1) s.wins += 1;
    if ((teamResult?.placement ?? 9) <= 3) s.topThree += 1;
    if (playerResult.isTeamMvp) s.teamMvpAwards += 1;
    if (playerResult.isMatchMvp) s.matchMvpAwards += 1;
    s.questionsAttempted += playerResult.questionsAttempted;
    s.questionsCorrect += playerResult.questionsCorrect;
    s.advancedSolved += playerResult.advancedSolved;
    s.attackImpact += playerResult.attackDamage;
    s.defenseImpact += playerResult.defenseBlocked;
    s.assists += playerResult.assists;
    if (grantPoints) player.seasonPoints += playerResult.seasonPointsGained;
    upsertPlayer(player);
    appendHistory(db.playerHistory, player.id, {
      matchId: results.matchId,
      endedAt: results.endedAt,
      mode,
      placement: teamResult?.placement ?? 0,
      teams: results.teams.length,
      victoryScore: teamResult?.victoryScore ?? 0,
      seasonPointsGained: playerResult.seasonPointsGained,
      wasMvp: playerResult.isMatchMvp || playerResult.isTeamMvp,
    });
  }

  recordMatch(results);
}
