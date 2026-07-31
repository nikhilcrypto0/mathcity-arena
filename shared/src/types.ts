// Core entity types shared between client and server.

export type Language = 'en' | 'am';
export type MathLevel = 'explorer' | 'builder' | 'champion';

export type CharacterId =
  | 'scout'
  | 'archer'
  | 'guardian'
  | 'giant'
  | 'engineer'
  | 'healer'
  | 'necromancer'
  | 'dragon_standard'
  | 'dragon_elite'
  | 'dragon_mythic';

export type StructureId =
  | 'walls'
  | 'archer_tower'
  | 'shield_tower'
  | 'healing_centre'
  | 'math_academy'
  | 'bridge'
  | 'garden'
  | 'solar_station'
  | 'water_storage'
  | 'drainage'
  | 'emergency_shelter'
  | 'warehouse';

export type TeamRole = 'commander' | 'solver' | 'defender' | 'strategist';

export type CrisisId =
  | 'flood'
  | 'drought'
  | 'earthquake'
  | 'power_shortage'
  | 'bridge_failure'
  | 'material_shortage'
  | 'population_surge'
  | 'transport_breakdown'
  | 'market_price'
  | 'water_shortage';

export type QuestionTopic =
  | 'arithmetic'
  | 'integers'
  | 'fractions'
  | 'ratios'
  | 'percentages'
  | 'equations'
  | 'inequalities'
  | 'geometry'
  | 'area'
  | 'perimeter'
  | 'measurement'
  | 'coordinates'
  | 'scale'
  | 'statistics'
  | 'probability'
  | 'patterns'
  | 'sequences'
  | 'multi_step'
  | 'functions'
  | 'simultaneous_equations'
  | 'quadratics'
  | 'trigonometry'
  | 'differentiation';

export type QuestionUsage =
  | 'standard'
  | 'advanced'
  | 'crisis'
  | 'attack'
  | 'defense'
  | 'training'
  | 'dragon_trial';

export type QuestionFormat =
  | 'numeric'
  | 'multiple_choice'
  | 'coordinate'
  | 'ordering'
  | 'multi_step';

export type AnswerSpec =
  | { kind: 'number'; value: number; tolerance?: number }
  | { kind: 'fraction'; num: number; den: number }
  | { kind: 'choice'; index: number }
  | { kind: 'coordinate'; x: number; y: number; tolerance?: number }
  | { kind: 'ordering'; order: number[] }
  | { kind: 'multi'; parts: AnswerSpec[] };

export type SubmittedAnswer =
  | { kind: 'number'; raw: string }
  | { kind: 'choice'; index: number }
  | { kind: 'coordinate'; raw: string }
  | { kind: 'ordering'; order: number[] }
  | { kind: 'multi'; parts: SubmittedAnswer[] };

export interface Question {
  id: string;
  topic: QuestionTopic;
  /** 1 (easiest) to 5 (hardest). */
  difficulty: number;
  /** Grade band: 6, 7, 8 or 'advanced' (Grade 9-10+). */
  level: 6 | 7 | 8 | 'advanced';
  usage: QuestionUsage;
  format: QuestionFormat;
  prompt: string;
  /** For multiple_choice / ordering formats. */
  choices?: string[];
  answer: AnswerSpec;
  explanation: string;
  hint?: string;
  /** Resource reward (or crisis damage-reduction value for crisis questions). */
  reward: number;
  character?: CharacterId;
  /** Sub-prompts for multi_step questions, aligned with answer.parts. */
  steps?: string[];
}

/** Question sent to a client: never includes the answer or explanation. */
export interface ClientQuestion {
  id: string;
  topic: QuestionTopic;
  difficulty: number;
  level: 6 | 7 | 8 | 'advanced';
  format: QuestionFormat;
  prompt: string;
  choices?: string[];
  steps?: string[];
  reward: number;
  hint?: string;
  context: QuestionContext;
}

export type QuestionContext = 'earn' | 'attack' | 'defense' | 'crisis' | 'training' | 'trial';

// ---------------------------------------------------------------------------
// Persistent profile / team data
// ---------------------------------------------------------------------------

export interface TrialProgress {
  attempts: number;
  bestScore: number;
  passed: boolean;
}

export interface PlayerLifetimeStats {
  matchesPlayed: number;
  wins: number;
  topThree: number;
  teamMvpAwards: number;
  matchMvpAwards: number;
  questionsAttempted: number;
  questionsCorrect: number;
  advancedSolved: number;
  dragonTrialsCompleted: number;
  bestStreak: number;
  attackImpact: number;
  defenseImpact: number;
  assists: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  mathLevel: MathLevel;
  language: Language;
  createdAt: number;
  teamId: string | null;
  unlockedCharacters: CharacterId[];
  trials: Partial<Record<CharacterId, TrialProgress>>;
  stats: PlayerLifetimeStats;
  seasonPoints: number;
  isSynthetic?: boolean;
}

export interface TeamStats {
  matchesPlayed: number;
  wins: number;
  second: number;
  third: number;
  winStreak: number;
  bestWinStreak: number;
  placementSum: number;
  questionsAttempted: number;
  questionsCorrect: number;
  contributionSum: number;
  crisisSurvived: number;
  crisisFaced: number;
  dragonsDeployed: { standard: number; elite: number; mythic: number };
  trophies: string[];
  lifetimePoints: number;
  highestLifetimeRank: number | null;
}

export interface Team {
  id: string;
  name: string;
  emblem: string;
  code: string;
  memberIds: string[];
  createdAt: number;
  rating: number;
  seasonPoints: number;
  stats: TeamStats;
  badges: string[];
  isSynthetic?: boolean;
}

export interface SeasonInfo {
  id: string;
  name: string;
  startedAt: number;
  endsAt: number;
  kind: 'monthly' | 'school_term' | 'custom' | 'demo';
}

// ---------------------------------------------------------------------------
// Match state
// ---------------------------------------------------------------------------

export type MatchPhase =
  | 'preparation'
  | 'knowledge_rush'
  | 'build'
  | 'crisis'
  | 'raid'
  | 'final_surge'
  | 'finished';

export interface Resources {
  coins: number;
  materials: number;
  energy: number;
  mana: number;
  defense: number;
  tokens: number;
}

export interface MatchPlayerContribution {
  questionsAttempted: number;
  questionsCorrect: number;
  difficultySum: number;
  streak: number;
  bestStreak: number;
  advancedSolved: number;
  resourcesEarned: number;
  resourcesSpent: number;
  buildingsBuilt: number;
  crisisPrepared: number;
  crisisSolved: number;
  unitsDeployed: number;
  attackDamage: number;
  defenseBlocked: number;
  repairs: number;
  shieldsActivated: number;
  assists: number;
  dragonTrialAnswers: number;
  finalSurgeActions: number;
}

export interface MatchPlayerState {
  playerId: string;
  name: string;
  avatar: string;
  role: TeamRole | null;
  character: CharacterId | null;
  isBot: boolean;
  connected: boolean;
  contribution: MatchPlayerContribution;
}

export interface DeployedUnit {
  id: string;
  characterId: CharacterId;
  ownerPlayerId: string;
  health: number;
  maxHealth: number;
  power: number;
}

export interface CrisisReport {
  crisisId: CrisisId;
  baseDamage: number;
  structureReduction: number;
  answerReduction: number;
  reserveReduction: number;
  finalDamage: number;
  correctAnswers: number;
  breakdownLines: string[];
}

export interface MatchTeamState {
  teamId: string;
  name: string;
  emblem: string;
  rating: number;
  isBot: boolean;
  players: MatchPlayerState[];
  coreHealth: number;
  maxCoreHealth: number;
  resources: Resources;
  structures: Partial<Record<StructureId, number>>;
  units: DeployedUnit[];
  /** Virtual-clock timestamp (server-internal); clients must use shieldActive. */
  shieldUntil: number;
  shieldActive: boolean;
  attackedRecently: Record<string, number>;
  activeRaidTarget: string | null;
  knockedOut: boolean;
  knockoutOrder: number | null;
  knockedOutAt: number | null;
  crisisReport: CrisisReport | null;
  crisisCorrect: number;
  battle: {
    damageDealt: number;
    damageBlocked: number;
    attacksLaunched: number;
    attacksReceived: number;
  };
  dragonDeployedThisMatch: Partial<Record<CharacterId, number>>;
  victoryScore: number;
  scoreBreakdown: Record<string, number> | null;
}

export interface MatchEvent {
  id: number;
  at: number;
  icon: string;
  text: string;
  teamId?: string;
  tone: 'info' | 'success' | 'danger' | 'warning' | 'crisis';
}

export interface CrisisWarning {
  crisisId: CrisisId;
  name: string;
  description: string;
  baseDamage: number;
  strikesAt: number;
  protectionOptions: string[];
}

export interface MatchSnapshot {
  matchId: string;
  mode: MatchMode;
  phase: MatchPhase;
  phaseEndsAt: number;
  matchEndsAt: number;
  now: number;
  teams: MatchTeamState[];
  events: MatchEvent[];
  crisisWarning: CrisisWarning | null;
  yourTeamId: string | null;
  isDemo: boolean;
}

export type MatchMode = 'quick' | 'ranked' | 'casual' | 'private' | 'demo';

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface PlayerResult {
  playerId: string;
  name: string;
  teamId: string;
  contributionPercent: number;
  accuracy: number;
  questionsCorrect: number;
  questionsAttempted: number;
  advancedSolved: number;
  attackDamage: number;
  defenseBlocked: number;
  assists: number;
  mvpScore: number;
  isTeamMvp: boolean;
  isMatchMvp: boolean;
  seasonPointsGained: number;
}

export interface TeamResult {
  teamId: string;
  name: string;
  emblem: string;
  placement: number;
  victoryScore: number;
  scoreBreakdown: Record<string, number>;
  coreHealth: number;
  knockedOut: boolean;
  seasonPointsGained: number;
  ratingChange: number;
  newSeasonPoints: number;
  newRating: number;
  crisisReport: CrisisReport | null;
  mathsAccuracy: number;
}

export interface MatchResults {
  matchId: string;
  mode: MatchMode;
  endedAt: number;
  teams: TeamResult[];
  players: PlayerResult[];
  matchMvpId: string;
  mvpCandidates: { playerId: string; name: string; teamId: string; score: number }[];
  awards: {
    bestAttack: { teamId: string; value: number } | null;
    bestDefense: { teamId: string; value: number } | null;
    bestCrisis: { teamId: string; value: number } | null;
    bestComeback: { teamId: string } | null;
    mostImproved: { teamId: string } | null;
  };
}

// ---------------------------------------------------------------------------
// Lobby / party
// ---------------------------------------------------------------------------

export interface PartyMemberView {
  playerId: string;
  name: string;
  avatar: string;
  ready: boolean;
  character: CharacterId | null;
  role: TeamRole | null;
  isLeader: boolean;
}

export interface PartyView {
  code: string;
  members: PartyMemberView[];
  teamName: string;
  teamEmblem: string;
  inQueue: boolean;
  mode: MatchMode | null;
}

export interface LeaderboardTeamRow {
  rank: number;
  teamId: string;
  name: string;
  emblem: string;
  matchesPlayed: number;
  wins: number;
  winRatio: number;
  topThree: number;
  averagePlacement: number | null;
  seasonPoints: number;
  currentStreak: number;
  mathsAccuracy: number;
  rating: number;
}

export interface LeaderboardPlayerRow {
  rank: number;
  playerId: string;
  name: string;
  teamName: string | null;
  matches: number;
  wins: number;
  matchMvpAwards: number;
  teamMvpAwards: number;
  mathsAccuracy: number;
  averageContribution: number;
  advancedSolved: number;
  dragonTrials: number;
  seasonPoints: number;
}

export interface RankContext {
  rank: number;
  above: LeaderboardTeamRow | null;
  below: LeaderboardTeamRow | null;
  pointsToNext: number | null;
}

export interface MatchHistoryEntry {
  matchId: string;
  endedAt: number;
  mode: MatchMode;
  placement: number;
  teams: number;
  victoryScore: number;
  seasonPointsGained: number;
  wasMvp: boolean;
}
