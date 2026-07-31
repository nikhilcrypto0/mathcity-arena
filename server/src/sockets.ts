import type { Server, Socket } from 'socket.io';
import type {
  CharacterId,
  Language,
  MatchMode,
  MathLevel,
  PlayerProfile,
  StructureId,
  SubmittedAnswer,
  TeamRole,
} from '@mathcity/shared';
import { AVATARS, CHARACTERS, TEAM_EMBLEMS } from '@mathcity/shared';
import { getDb, upsertPlayer, upsertTeam } from './store.ts';
import { newCode, newId } from './ids.ts';
import { MatchmakingService, type Party } from './matchmaking.ts';
import { gradeTrial, trialQuestionsFor } from './academy.ts';
import { QUESTIONS_BY_ID, toClientQuestion } from './questions/bank.ts';
import { validateAnswer } from './questions/validate.ts';
import { DemoSession } from './demo.ts';

const NAME_MAX = 20;

/** Keep display names child-safe and free of contact details. */
function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Player';
  const cleaned = raw
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
  return cleaned.length >= 2 ? cleaned : `Player${Math.floor(Math.random() * 999)}`;
}

function starterProfile(id: string, name: string, avatar: string, mathLevel: MathLevel, language: Language): PlayerProfile {
  return {
    id,
    name,
    avatar,
    mathLevel,
    language,
    createdAt: Date.now(),
    teamId: null,
    unlockedCharacters: ['scout', 'archer'],
    trials: {},
    stats: {
      matchesPlayed: 0, wins: 0, topThree: 0, teamMvpAwards: 0, matchMvpAwards: 0,
      questionsAttempted: 0, questionsCorrect: 0, advancedSolved: 0,
      dragonTrialsCompleted: 0, bestStreak: 0, attackImpact: 0, defenseImpact: 0, assists: 0,
    },
    seasonPoints: 0,
  };
}

export function wireSockets(io: Server): MatchmakingService {
  const playerSockets = new Map<string, Set<string>>();
  const socketPlayer = new Map<string, string>();
  const demos = new Map<string, DemoSession>();

  const toPlayer = (playerId: string, event: string, payload: unknown) => {
    const sockets = playerSockets.get(playerId);
    if (!sockets) return;
    for (const socketId of sockets) io.to(socketId).emit(event, payload);
  };

  const matchmaking = new MatchmakingService({
    toPlayer,
    toDemo: () => {},
    onPartyChanged: (party) => broadcastParty(party),
    onMatchStarted: (matchId, playerIds) => {
      for (const pid of playerIds) toPlayer(pid, 'match:started', { matchId });
    },
  });
  matchmaking.start();

  function partyTeamMeta(party: Party): { name: string; emblem: string } {
    const db = getDb();
    const leader = db.players[party.leaderId];
    const team = leader?.teamId ? db.teams[leader.teamId] : null;
    return { name: team?.name ?? `${leader?.name ?? 'Player'}'s Squad`, emblem: team?.emblem ?? 'lake_star' };
  }

  function broadcastParty(party: Party): void {
    const meta = partyTeamMeta(party);
    const view = matchmaking.partyView(party, meta.name, meta.emblem);
    for (const member of party.members) toPlayer(member.playerId, 'party:update', view);
  }

  io.on('connection', (socket: Socket) => {
    const send = (event: string, payload: unknown) => socket.emit(event, payload);
    const fail = (message: string) => send('toast', { message, tone: 'error' });

    const currentPlayerId = (): string | null => socketPlayer.get(socket.id) ?? null;
    const requireProfile = (): PlayerProfile | null => {
      const pid = currentPlayerId();
      const profile = pid ? getDb().players[pid] : null;
      if (!profile) fail('Set up your player profile first.');
      return profile ?? null;
    };

    socket.on('profile:register', (payload: {
      playerId?: string; name?: string; avatar?: string; mathLevel?: MathLevel; language?: Language;
    }) => {
      const db = getDb();
      let profile = payload.playerId ? db.players[payload.playerId] : undefined;
      if (!profile) {
        profile = starterProfile(
          newId('player'),
          sanitizeName(payload.name),
          AVATARS.includes(payload.avatar as (typeof AVATARS)[number]) ? payload.avatar! : 'lion',
          payload.mathLevel ?? 'explorer',
          payload.language === 'am' ? 'am' : 'en',
        );
      } else {
        if (payload.name) profile.name = sanitizeName(payload.name);
        if (payload.avatar && AVATARS.includes(payload.avatar as (typeof AVATARS)[number])) profile.avatar = payload.avatar;
        if (payload.mathLevel) profile.mathLevel = payload.mathLevel;
        if (payload.language) profile.language = payload.language === 'am' ? 'am' : 'en';
      }
      upsertPlayer(profile);
      socketPlayer.set(socket.id, profile.id);
      const set = playerSockets.get(profile.id) ?? new Set();
      set.add(socket.id);
      playerSockets.set(profile.id, set);

      send('profile:update', { profile, team: profile.teamId ? getDb().teams[profile.teamId] ?? null : null });

      // Reconnect support: restore party and live match views.
      const party = matchmaking.partyOf(profile.id);
      if (party) broadcastParty(party);
      const match = matchmaking.matchOf(profile.id);
      if (match && !match.isFinished) {
        send('match:started', { matchId: match.id });
        send('match:snapshot', match.snapshotFor(profile.id));
      }
    });

    socket.on('profile:reset', () => {
      const pid = currentPlayerId();
      if (!pid) return;
      const db = getDb();
      matchmaking.leaveParty(pid);
      delete db.players[pid];
      socketPlayer.delete(socket.id);
      playerSockets.delete(pid);
      send('profile:cleared', {});
    });

    // -----------------------------------------------------------------------
    // Teams (persistent identity)
    // -----------------------------------------------------------------------

    socket.on('team:create', (payload: { name?: string; emblem?: string }) => {
      const profile = requireProfile();
      if (!profile) return;
      const name = sanitizeName(payload.name).slice(0, 24) || 'New Team';
      const emblem = TEAM_EMBLEMS.includes(payload.emblem as (typeof TEAM_EMBLEMS)[number])
        ? payload.emblem!
        : 'blue_nile';
      const team = {
        id: newId('team'),
        name,
        emblem,
        code: newCode(),
        memberIds: [profile.id],
        createdAt: Date.now(),
        rating: 1000,
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
      profile.teamId = team.id;
      upsertPlayer(profile);
      send('profile:update', { profile, team });
      send('toast', { message: `Team "${team.name}" created! Invite code: ${team.code}`, tone: 'success' });
    });

    socket.on('team:join', (payload: { code?: string }) => {
      const profile = requireProfile();
      if (!profile) return;
      const db = getDb();
      const team = Object.values(db.teams).find(
        (t) => t.code.toUpperCase() === String(payload.code ?? '').toUpperCase().trim(),
      );
      if (!team) return fail('No team found with that code.');
      if (team.memberIds.length >= 4 && !team.memberIds.includes(profile.id)) {
        return fail('That team is already full (max 4 players).');
      }
      if (profile.teamId && profile.teamId !== team.id) {
        const old = db.teams[profile.teamId];
        if (old) {
          old.memberIds = old.memberIds.filter((id) => id !== profile.id);
          upsertTeam(old);
        }
      }
      if (!team.memberIds.includes(profile.id)) team.memberIds.push(profile.id);
      profile.teamId = team.id;
      upsertTeam(team);
      upsertPlayer(profile);
      send('profile:update', { profile, team });
      send('toast', { message: `Joined team "${team.name}"!`, tone: 'success' });
    });

    socket.on('team:leave', () => {
      const profile = requireProfile();
      if (!profile || !profile.teamId) return;
      const db = getDb();
      const team = db.teams[profile.teamId];
      if (team) {
        team.memberIds = team.memberIds.filter((id) => id !== profile.id);
        upsertTeam(team);
      }
      profile.teamId = null;
      upsertPlayer(profile);
      send('profile:update', { profile, team: null });
    });

    // -----------------------------------------------------------------------
    // Parties & matchmaking
    // -----------------------------------------------------------------------

    socket.on('party:create', () => {
      const profile = requireProfile();
      if (!profile) return;
      const party = matchmaking.createParty(profile.id);
      broadcastParty(party);
    });

    socket.on('party:join', (payload: { code?: string }) => {
      const profile = requireProfile();
      if (!profile) return;
      const result = matchmaking.joinParty(String(payload.code ?? ''), profile.id);
      if ('error' in result) return fail(result.error);
      broadcastParty(result);
    });

    socket.on('party:leave', () => {
      const pid = currentPlayerId();
      if (pid) matchmaking.leaveParty(pid);
      send('party:update', null);
    });

    socket.on('party:setReady', (payload: { ready?: boolean }) => {
      const pid = currentPlayerId();
      if (pid) matchmaking.updateMember(pid, { ready: Boolean(payload.ready) });
    });

    socket.on('party:setCharacter', (payload: { character?: CharacterId | null }) => {
      const pid = currentPlayerId();
      if (!pid) return;
      const character = payload.character && CHARACTERS[payload.character] ? payload.character : null;
      matchmaking.updateMember(pid, { character });
    });

    socket.on('party:setRole', (payload: { role?: TeamRole | null }) => {
      const pid = currentPlayerId();
      if (!pid) return;
      const roles: TeamRole[] = ['commander', 'solver', 'defender', 'strategist'];
      const role = payload.role && roles.includes(payload.role) ? payload.role : null;
      matchmaking.updateMember(pid, { role });
    });

    socket.on('queue:join', (payload: { mode?: MatchMode }) => {
      const profile = requireProfile();
      if (!profile) return;
      let party = matchmaking.partyOf(profile.id);
      if (!party) {
        party = matchmaking.createParty(profile.id);
        broadcastParty(party);
      }
      const modes: MatchMode[] = ['quick', 'ranked', 'casual', 'private'];
      const mode = payload.mode && modes.includes(payload.mode) ? payload.mode : 'quick';
      const result = matchmaking.queueParty(profile.id, mode);
      if ('error' in result) return fail(result.error);
      broadcastParty(party);
      send('queue:update', { searching: true, mode });
    });

    socket.on('queue:leave', () => {
      const pid = currentPlayerId();
      if (!pid) return;
      matchmaking.cancelQueue(pid);
      send('queue:update', { searching: false, mode: null });
    });

    // -----------------------------------------------------------------------
    // In-match actions (all server-validated)
    // -----------------------------------------------------------------------

    const withMatch = (fn: (matchPlayerId: string, match: NonNullable<ReturnType<typeof matchmaking.matchOf>>) => void) => {
      const pid = currentPlayerId();
      if (!pid) return fail('Not signed in.');
      const match = matchmaking.matchOf(pid);
      if (!match) return fail('You are not in a match.');
      fn(pid, match);
    };

    socket.on('match:requestQuestion', (payload: { context?: string; advanced?: boolean }) => {
      withMatch((pid, match) => {
        const contexts = ['earn', 'attack', 'defense', 'crisis'] as const;
        const context = contexts.includes(payload.context as (typeof contexts)[number])
          ? (payload.context as (typeof contexts)[number])
          : 'earn';
        const result = match.requestQuestion(pid, context, { advanced: payload.advanced });
        if ('error' in result) return fail(result.error);
        send('match:question', result);
      });
    });

    socket.on('match:answer', (payload: { questionId?: string; answer?: SubmittedAnswer }) => {
      withMatch((pid, match) => {
        if (!payload.questionId || !payload.answer) return fail('Missing answer.');
        const result = match.submitAnswer(pid, payload.questionId, payload.answer);
        if ('error' in result) return fail(result.error);
        send('match:answerResult', result);
        send('match:snapshot', match.snapshotFor(pid));
      });
    });

    socket.on('match:build', (payload: { structureId?: StructureId }) => {
      withMatch((pid, match) => {
        if (!payload.structureId) return fail('Choose a structure.');
        const result = match.build(pid, payload.structureId);
        if ('error' in result) return fail(result.error);
        send('match:snapshot', match.snapshotFor(pid));
      });
    });

    socket.on('match:deploy', (payload: { characterId?: CharacterId }) => {
      withMatch((pid, match) => {
        if (!payload.characterId) return fail('Choose a character.');
        const result = match.deploy(pid, payload.characterId);
        if ('error' in result) return fail(result.error);
        send('match:snapshot', match.snapshotFor(pid));
      });
    });

    socket.on('match:attack', (payload: { targetTeamId?: string }) => {
      withMatch((pid, match) => {
        if (!payload.targetTeamId) return fail('Choose a target.');
        const result = match.attack(pid, payload.targetTeamId);
        if ('error' in result) return fail(result.error);
      });
    });

    socket.on('match:signal', (payload: { signalId?: string }) => {
      withMatch((pid, match) => {
        const result = match.signal(pid, String(payload.signalId ?? ''));
        if ('error' in result) fail(result.error);
      });
    });

    socket.on('match:requestSnapshot', () => {
      withMatch((pid, match) => send('match:snapshot', match.snapshotFor(pid)));
    });

    // -----------------------------------------------------------------------
    // Training Academy
    // -----------------------------------------------------------------------

    socket.on('academy:trialQuestions', (payload: { characterId?: CharacterId }) => {
      if (!payload.characterId || !CHARACTERS[payload.characterId]) return fail('Unknown character.');
      const questions = trialQuestionsFor(payload.characterId).map((q) => toClientQuestion(q, 'trial'));
      send('academy:trial', { characterId: payload.characterId, questions });
    });

    socket.on('academy:practiceAnswer', (payload: { questionId?: string; answer?: SubmittedAnswer }) => {
      if (!payload.questionId || !payload.answer) return fail('Missing answer.');
      const question = QUESTIONS_BY_ID.get(payload.questionId);
      if (!question || question.usage !== 'training') return fail('Unknown practice question.');
      const correct = validateAnswer(question.answer, payload.answer);
      send('academy:practiceResult', {
        questionId: question.id,
        correct,
        explanation: question.explanation,
        rewards: {},
        streak: 0,
      });
    });

    socket.on('academy:trialSubmit', (payload: {
      characterId?: CharacterId;
      answers?: { questionId: string; answer: SubmittedAnswer }[];
    }) => {
      const profile = requireProfile();
      if (!profile) return;
      if (!payload.characterId || !Array.isArray(payload.answers)) return fail('Invalid trial submission.');
      const result = gradeTrial(profile, payload.characterId, payload.answers);
      if ('error' in result) return fail(result.error);
      send('academy:trialResult', { characterId: payload.characterId, ...result });
      send('profile:update', { profile, team: profile.teamId ? getDb().teams[profile.teamId] ?? null : null });
    });

    // -----------------------------------------------------------------------
    // Demo Mode
    // -----------------------------------------------------------------------

    socket.on('demo:start', () => {
      demos.get(socket.id)?.dispose();
      const session = new DemoSession((event, payload) => socket.emit(event, payload));
      demos.set(socket.id, session);
      matchmaking.registerDemoMatch(session.match);
      session.start();
    });

    socket.on('demo:control', (payload: { action?: string; value?: number }) => {
      const session = demos.get(socket.id);
      if (!session) return fail('Start the demo first.');
      const actions = ['play', 'pause', 'next', 'reset', 'speed'] as const;
      const action = actions.includes(payload.action as (typeof actions)[number])
        ? (payload.action as (typeof actions)[number])
        : 'play';
      session.control(action, payload.value);
      if (action === 'reset') matchmaking.registerDemoMatch(session.match);
    });

    socket.on('demo:stop', () => {
      demos.get(socket.id)?.dispose();
      demos.delete(socket.id);
    });

    // -----------------------------------------------------------------------

    socket.on('disconnect', () => {
      const pid = socketPlayer.get(socket.id);
      socketPlayer.delete(socket.id);
      if (pid) {
        const set = playerSockets.get(pid);
        set?.delete(socket.id);
        if (set && set.size === 0) playerSockets.delete(pid);
      }
      demos.get(socket.id)?.dispose();
      demos.delete(socket.id);
    });
  });

  return matchmaking;
}
