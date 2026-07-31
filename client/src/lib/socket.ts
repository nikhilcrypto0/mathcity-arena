import { io, type Socket } from 'socket.io-client';
import type {
  CharacterId,
  ClientQuestion,
  Language,
  MatchMode,
  MatchResults,
  MatchSnapshot,
  MathLevel,
  PartyView,
  PlayerProfile,
  StructureId,
  SubmittedAnswer,
  Team,
  TeamRole,
} from '@mathcity/shared';
import { useApp, type AnswerResult, type TrialResult } from './store.ts';

// Multi-tab testing support: open a second tab with ?player=2 to act as a
// separate local player (otherwise every tab shares the same stored profile).
const playerSlot = new URLSearchParams(window.location.search).get('player');
export const PLAYER_KEY = playerSlot ? `mathcity-player-id-${playerSlot}` : 'mathcity-player-id';

/** True when a profile exists locally, even if the server reply hasn't landed yet. */
export function hasStoredPlayer(): boolean {
  return Boolean(localStorage.getItem(PLAYER_KEY));
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io({ path: '/socket.io' });
  wire(socket);
  return socket;
}

function wire(s: Socket): void {
  const store = () => useApp.getState();

  s.on('connect', () => {
    store().set({ connected: true });
    const playerId = localStorage.getItem(PLAYER_KEY);
    if (playerId) s.emit('profile:register', { playerId });
  });
  s.on('disconnect', () => store().set({ connected: false }));

  s.on('profile:update', (payload: { profile: PlayerProfile; team: Team | null }) => {
    localStorage.setItem(PLAYER_KEY, payload.profile.id);
    store().set({ profile: payload.profile, team: payload.team });
  });
  s.on('profile:cleared', () => {
    localStorage.removeItem(PLAYER_KEY);
    store().set({ profile: null, team: null, party: null });
    store().clearMatch();
  });

  s.on('party:update', (view: PartyView | null) => store().set({ party: view }));
  s.on('queue:update', (payload: { searching: boolean; mode: MatchMode | null }) =>
    store().set({ queue: payload }));

  s.on('match:started', (payload: { matchId: string }) => {
    store().set({ matchId: payload.matchId, results: null, queue: { searching: false, mode: null } });
  });
  s.on('match:snapshot', (snapshot: MatchSnapshot) => store().set({ snapshot }));
  s.on('match:question', (question: ClientQuestion) =>
    store().set({ question, answerResult: null }));
  s.on('match:answerResult', (result: AnswerResult) =>
    store().set({ answerResult: result, question: null }));
  s.on('match:finished', (results: MatchResults) => store().set({ results }));
  s.on('match:signal', (payload: { from: string; signal: { id: string; text: string; icon: string } }) =>
    store().set({ signal: { ...payload, at: Date.now() } }));

  s.on('academy:trial', (payload: { characterId: string; questions: ClientQuestion[] }) =>
    store().set({ trial: payload, trialResult: null }));
  s.on('academy:trialResult', (payload: TrialResult) =>
    store().set({ trialResult: payload, trial: null }));
  s.on('academy:practiceResult', (payload: AnswerResult & { questionId: string }) =>
    store().set({ practiceResult: payload }));

  s.on('demo:state', (payload: { paused: boolean; speedMultiplier: number }) =>
    store().set({ demo: { active: true, paused: payload.paused, speed: payload.speedMultiplier } }));

  s.on('toast', (payload: { message: string; tone?: 'info' | 'success' | 'error' }) =>
    store().pushToast(payload.message, payload.tone ?? 'info'));
}

// ---------------------------------------------------------------------------
// Typed action helpers
// ---------------------------------------------------------------------------

export const actions = {
  register(payload: { name: string; avatar: string; mathLevel: MathLevel; language: Language }) {
    getSocket().emit('profile:register', payload);
  },
  resetProfile() {
    getSocket().emit('profile:reset');
  },
  createTeam(name: string, emblem: string) {
    getSocket().emit('team:create', { name, emblem });
  },
  joinTeam(code: string) {
    getSocket().emit('team:join', { code });
  },
  leaveTeam() {
    getSocket().emit('team:leave');
  },
  createParty() {
    getSocket().emit('party:create');
  },
  joinParty(code: string) {
    getSocket().emit('party:join', { code });
  },
  leaveParty() {
    getSocket().emit('party:leave');
  },
  setReady(ready: boolean) {
    getSocket().emit('party:setReady', { ready });
  },
  setCharacter(character: CharacterId | null) {
    getSocket().emit('party:setCharacter', { character });
  },
  setRole(role: TeamRole | null) {
    getSocket().emit('party:setRole', { role });
  },
  queueJoin(mode: MatchMode) {
    getSocket().emit('queue:join', { mode });
  },
  queueLeave() {
    getSocket().emit('queue:leave');
  },
  requestQuestion(context: 'earn' | 'attack' | 'defense' | 'crisis', advanced = false) {
    getSocket().emit('match:requestQuestion', { context, advanced });
  },
  answer(questionId: string, answer: SubmittedAnswer) {
    getSocket().emit('match:answer', { questionId, answer });
  },
  build(structureId: StructureId) {
    getSocket().emit('match:build', { structureId });
  },
  deploy(characterId: CharacterId) {
    getSocket().emit('match:deploy', { characterId });
  },
  attack(targetTeamId: string) {
    getSocket().emit('match:attack', { targetTeamId });
  },
  sendSignal(signalId: string) {
    getSocket().emit('match:signal', { signalId });
  },
  requestSnapshot() {
    getSocket().emit('match:requestSnapshot');
  },
  trialQuestions(characterId: CharacterId) {
    getSocket().emit('academy:trialQuestions', { characterId });
  },
  practiceAnswer(questionId: string, answer: SubmittedAnswer) {
    getSocket().emit('academy:practiceAnswer', { questionId, answer });
  },
  trialSubmit(characterId: CharacterId, answers: { questionId: string; answer: SubmittedAnswer }[]) {
    getSocket().emit('academy:trialSubmit', { characterId, answers });
  },
  demoStart() {
    getSocket().emit('demo:start');
  },
  demoControl(action: 'play' | 'pause' | 'next' | 'reset' | 'speed', value?: number) {
    getSocket().emit('demo:control', { action, value });
  },
  demoStop() {
    getSocket().emit('demo:stop');
  },
};
