import type {
  CharacterId,
  ClientQuestion,
  CrisisId,
  CrisisWarning,
  MatchEvent,
  MatchMode,
  MatchPhase,
  MatchPlayerContribution,
  MatchPlayerState,
  MatchResults,
  MatchSnapshot,
  MatchTeamState,
  PlayerProfile,
  PlayerResult,
  Question,
  QuestionContext,
  StructureId,
  SubmittedAnswer,
  Team,
  TeamResult,
  TeamRole,
} from '@mathcity/shared';
import {
  ATTACK_LOCK_FINAL_SECONDS,
  BONUS_POINTS,
  CHARACTERS,
  CORE_HEALTH,
  CRISES,
  MAX_SIMULTANEOUS_RAIDS,
  MAX_TEAM_SIZE,
  PHASE_DURATIONS,
  RECENT_ATTACK_SHIELD_SECONDS,
  SAME_TARGET_LOCK_SECONDS,
  STRUCTURES,
  TEAM_SIGNALS,
} from '@mathcity/shared';
import { makeRng, type Rng } from '../questions/rng.ts';
import { QUESTIONS_BY_ID, questionsFor, toClientQuestion } from '../questions/bank.ts';
import { validateAnswer } from '../questions/validate.ts';
import { computeCrisisDamage } from './crisis.ts';
import {
  computePlacements,
  matchMvpScore,
  normalizeContributions,
  pickTeamMvp,
  qualifiesForMvp,
  ratingChange,
  rawContribution,
  seasonPointsForPlacement,
  teamAccuracy,
  teamBonusPoints,
  victoryScore,
  victoryScoreBreakdown,
} from './scoring.ts';
import type { BotProfile } from './bots.ts';

// ---------------------------------------------------------------------------
// Phase schedule (virtual seconds from match start)
// ---------------------------------------------------------------------------

const T_PREP_END = PHASE_DURATIONS.preparation;
const T_RUSH_END = T_PREP_END + PHASE_DURATIONS.knowledge_rush;
const T_BUILD_END = T_RUSH_END + PHASE_DURATIONS.build;
const T_CRISIS_STRIKE = T_BUILD_END + PHASE_DURATIONS.crisis_warning + PHASE_DURATIONS.crisis_prep;
const T_RAID_START = T_CRISIS_STRIKE + 10; // short recovery period
const T_RAID_END = T_RAID_START + PHASE_DURATIONS.raid;
const T_MATCH_END = T_RAID_END + PHASE_DURATIONS.final_surge;

export const MATCH_TOTAL_VSECONDS = T_MATCH_END;

const RAID_DURATION = 14;
const CRISIS_QUESTION_LIMIT = 3;
const DRAGON_ADVANCED_GATE: Partial<Record<CharacterId, number>> = {
  dragon_standard: 1,
  dragon_elite: 3,
  dragon_mythic: 5,
};

interface ActiveRaid {
  attackerId: string;
  defenderId: string;
  endsAt: number;
  attackBuff: number;
  ticksApplied: number;
}

interface AssignedQuestion {
  question: Question;
  context: QuestionContext;
  assignedAtV: number;
}

export interface MatchPlayerSetup {
  profile: PlayerProfile;
  isBot: boolean;
  character: CharacterId | null;
  role: TeamRole | null;
}

export interface MatchTeamSetup {
  team: Team;
  players: MatchPlayerSetup[];
  bot?: BotProfile;
}

export interface MatchCallbacks {
  toPlayer: (playerId: string, event: string, payload: unknown) => void;
  toAll: (event: string, payload: unknown) => void;
  onFinished: (results: MatchResults, match: Match) => void;
}

export interface MatchOptions {
  mode: MatchMode;
  speedFactor: number;
  seed?: number;
  crisisId?: CrisisId;
  manualClock?: boolean;
}

interface InternalTeam {
  state: MatchTeamState;
  setup: MatchTeamSetup;
  bot?: BotProfile;
  crisisAnswerReduction: number;
  resourcesEarnedTotal: number;
  resourcesSpentTotal: number;
  balanceMultiplier: number;
  graveyard: CharacterId[];
  lastScoreAt: number;
  eliteTrialCompleted: boolean;
  mythicTrialCompleted: boolean;
  botAnswerAccumulator: number;
  botActionAccumulator: number;
}

export class Match {
  readonly id: string;
  readonly mode: MatchMode;
  private readonly cb: MatchCallbacks;
  private readonly rng: Rng;
  readonly manualClock: boolean;

  speedFactor: number;
  paused = false;

  private vNow = 0;
  private phase: MatchPhase = 'preparation';
  private crisisId: CrisisId;
  private crisisStruck = false;
  private crisisWarned = false;
  private knockoutCounter = 0;
  private eventCounter = 0;
  private events: MatchEvent[] = [];
  private raids: ActiveRaid[] = [];
  private assigned = new Map<string, AssignedQuestion>();
  private served = new Map<string, Set<string>>();
  private cooldowns = new Map<string, Partial<Record<CharacterId, number>>>();
  private teams = new Map<string, InternalTeam>();
  private playerTeam = new Map<string, string>();
  private tickTimer: NodeJS.Timeout | null = null;
  private lastTickReal = 0;
  private lastSnapshotV = -999;
  private finished = false;
  private results: MatchResults | null = null;

  constructor(id: string, setups: MatchTeamSetup[], options: MatchOptions, callbacks: MatchCallbacks) {
    this.id = id;
    this.mode = options.mode;
    this.cb = callbacks;
    this.speedFactor = options.speedFactor;
    this.manualClock = options.manualClock ?? false;
    this.rng = makeRng(options.seed ?? Math.floor(Math.random() * 2 ** 31));
    this.crisisId = options.crisisId ?? (this.rng.pick(Object.keys(CRISES)) as CrisisId);

    const maxSize = Math.max(...setups.map((s) => s.players.length));
    for (const setup of setups) {
      if (setup.players.length > MAX_TEAM_SIZE) {
        throw new Error(`Team ${setup.team.name} exceeds the maximum size of ${MAX_TEAM_SIZE}`);
      }
      const players: MatchPlayerState[] = setup.players.map((p) => ({
        playerId: p.profile.id,
        name: p.profile.name,
        avatar: p.profile.avatar,
        role: p.role,
        character: p.character,
        isBot: p.isBot,
        connected: true,
        contribution: emptyContribution(),
      }));
      // Transparent size balancing: smaller teams earn a resource multiplier.
      // Mathematics difficulty is never adjusted.
      const balanceMultiplier = 1 + 0.15 * (maxSize - setup.players.length);
      const state: MatchTeamState = {
        teamId: setup.team.id,
        name: setup.team.name,
        emblem: setup.team.emblem,
        rating: setup.team.rating,
        isBot: setup.players.every((p) => p.isBot),
        players,
        coreHealth: CORE_HEALTH,
        maxCoreHealth: CORE_HEALTH,
        resources: { coins: 50, materials: 40, energy: 30, mana: 10, defense: 0, tokens: 0 },
        structures: {},
        units: [],
        shieldUntil: 0,
        shieldActive: false,
        attackedRecently: {},
        activeRaidTarget: null,
        knockedOut: false,
        knockoutOrder: null,
        knockedOutAt: null,
        crisisReport: null,
        crisisCorrect: 0,
        battle: { damageDealt: 0, damageBlocked: 0, attacksLaunched: 0, attacksReceived: 0 },
        dragonDeployedThisMatch: {},
        victoryScore: 0,
        scoreBreakdown: null,
      };
      this.teams.set(setup.team.id, {
        state,
        setup,
        bot: setup.bot,
        crisisAnswerReduction: 0,
        resourcesEarnedTotal: 0,
        resourcesSpentTotal: 0,
        balanceMultiplier,
        graveyard: [],
        lastScoreAt: 0,
        eliteTrialCompleted: false,
        mythicTrialCompleted: false,
        botAnswerAccumulator: this.rng.next() * 4,
        botActionAccumulator: 0,
      });
      for (const p of setup.players) this.playerTeam.set(p.profile.id, setup.team.id);
    }

  }

  // -------------------------------------------------------------------------
  // Clock
  // -------------------------------------------------------------------------

  start(): void {
    this.pushEvent('flag', `Match begins! ${this.teams.size} teams enter the arena.`, undefined, 'info');
    if (this.manualClock) return;
    this.lastTickReal = Date.now();
    this.tickTimer = setInterval(() => {
      const now = Date.now();
      const dtReal = (now - this.lastTickReal) / 1000;
      this.lastTickReal = now;
      if (!this.paused && !this.finished) {
        this.advance(dtReal * this.speedFactor);
      }
    }, 500);
  }

  stop(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
  }

  /** Advance the virtual clock — also the test/demo stepping entry point. */
  advance(vSeconds: number): void {
    let remaining = vSeconds;
    while (remaining > 0 && !this.finished) {
      const step = Math.min(remaining, 1);
      this.vNow += step;
      this.tick(step);
      remaining -= step;
    }
  }

  get virtualNow(): number {
    return this.vNow;
  }

  get currentPhase(): MatchPhase {
    return this.phase;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  get finalResults(): MatchResults | null {
    return this.results;
  }

  // -------------------------------------------------------------------------
  // Tick + phase transitions
  // -------------------------------------------------------------------------

  private tick(dt: number): void {
    this.updatePhase();
    if (this.finished) return;
    for (const team of this.teams.values()) {
      team.state.shieldActive = team.state.shieldUntil > this.vNow;
    }
    this.processRaids(dt);
    this.runBots(dt);
    if (this.vNow - this.lastSnapshotV >= Math.max(1, this.speedFactor)) {
      this.broadcastSnapshot();
      this.lastSnapshotV = this.vNow;
    }
  }

  private updatePhase(): void {
    const previous = this.phase;
    let next: MatchPhase = previous;
    if (this.vNow >= T_MATCH_END) next = 'finished';
    else if (this.vNow >= T_RAID_END) next = 'final_surge';
    else if (this.vNow >= T_RAID_START) next = 'raid';
    else if (this.vNow >= T_BUILD_END) next = 'crisis';
    else if (this.vNow >= T_RUSH_END) next = 'build';
    else if (this.vNow >= T_PREP_END) next = 'knowledge_rush';

    if (!this.crisisWarned && this.vNow >= T_BUILD_END) {
      this.crisisWarned = true;
      const crisis = CRISES[this.crisisId];
      this.pushEvent(crisis.icon, `CITY CRISIS WARNING: ${crisis.name} approaching! Base damage ${crisis.baseDamage} for EVERY district.`, undefined, 'crisis');
    }
    if (!this.crisisStruck && this.vNow >= T_CRISIS_STRIKE) {
      this.strikeCrisis();
    }

    if (next !== previous) {
      this.phase = next;
      this.pushEvent('clock', phaseAnnouncement(next), undefined, next === 'final_surge' ? 'warning' : 'info');
      if (next === 'final_surge') {
        this.pushEvent('zap', 'Resource generation increased! Last chance for strategic attacks.', undefined, 'warning');
      }
      if (next === 'finished') {
        this.finish();
        return;
      }
      this.broadcastSnapshot();
    }
  }

  // -------------------------------------------------------------------------
  // Questions
  // -------------------------------------------------------------------------

  requestQuestion(
    playerId: string,
    context: QuestionContext,
    opts?: { advanced?: boolean },
  ): ClientQuestion | { error: string } {
    const team = this.teamOf(playerId);
    if (!team) return { error: 'You are not in this match.' };
    if (this.finished) return { error: 'The match has finished.' };
    if (team.state.knockedOut) return { error: 'Your district is out of active combat.' };

    if (context === 'crisis') {
      if (!this.crisisWarned || this.crisisStruck) return { error: 'No crisis to prepare for right now.' };
      if (team.state.crisisCorrect + this.pendingCrisisCount(team) >= CRISIS_QUESTION_LIMIT) {
        return { error: `Your team has already used its ${CRISIS_QUESTION_LIMIT} crisis responses.` };
      }
    }
    if (context === 'attack' && !this.raids.some((r) => r.attackerId === team.state.teamId)) {
      return { error: 'Launch an attack first, then power it with answers.' };
    }
    if (context === 'defense' && !this.raids.some((r) => r.defenderId === team.state.teamId)) {
      return { error: 'No incoming attack to defend against.' };
    }

    const usage =
      context === 'earn' ? (opts?.advanced ? 'advanced' : 'standard')
      : context === 'attack' ? 'attack'
      : context === 'defense' ? 'defense'
      : context === 'crisis' ? 'crisis'
      : 'standard';

    const pool = questionsFor(usage);
    const servedSet = this.served.get(playerId) ?? new Set<string>();
    let candidates = pool.filter((q) => !servedSet.has(q.id));
    if (candidates.length === 0) {
      servedSet.clear();
      candidates = pool;
    }
    const question = this.rng.pick(candidates);
    servedSet.add(question.id);
    this.served.set(playerId, servedSet);
    this.assigned.set(playerId, { question, context, assignedAtV: this.vNow });
    return toClientQuestion(question, context);
  }

  private pendingCrisisCount(team: InternalTeam): number {
    let count = 0;
    for (const p of team.state.players) {
      const a = this.assigned.get(p.playerId);
      if (a && a.context === 'crisis') count += 1;
    }
    return count;
  }

  submitAnswer(
    playerId: string,
    questionId: string,
    submitted: SubmittedAnswer,
  ): { error: string } | {
    correct: boolean;
    explanation: string;
    rewards: Partial<Record<string, number>>;
    streak: number;
  } {
    const team = this.teamOf(playerId);
    if (!team) return { error: 'You are not in this match.' };
    const assignment = this.assigned.get(playerId);
    if (!assignment || assignment.question.id !== questionId) {
      return { error: 'That question is no longer active.' };
    }
    this.assigned.delete(playerId);

    const { question, context, assignedAtV } = assignment;
    const player = team.state.players.find((p) => p.playerId === playerId)!;
    const c = player.contribution;
    // The server is the only judge of correctness and rewards.
    const correct = validateAnswer(question.answer, submitted);

    c.questionsAttempted += 1;
    if (context === 'crisis') c.crisisPrepared += 1;

    if (!correct) {
      c.streak = 0;
      this.duplicateGuardClear(playerId, questionId);
      return { correct: false, explanation: question.explanation, rewards: {}, streak: 0 };
    }

    c.questionsCorrect += 1;
    c.difficultySum += question.difficulty;
    c.streak += 1;
    c.bestStreak = Math.max(c.bestStreak, c.streak);
    if (question.level === 'advanced') {
      c.advancedSolved += 1;
      if (question.topic === 'simultaneous_equations' || question.topic === 'quadratics') {
        team.eliteTrialCompleted = team.eliteTrialCompleted || c.advancedSolved >= 3;
      }
      if (c.advancedSolved >= 5) team.mythicTrialCompleted = true;
    }

    const rewards: Partial<Record<string, number>> = {};
    // Correctness first; speed gives only a small bonus afterwards.
    const speedBonus = this.vNow - assignedAtV <= 20 ? 1.2 : 1;
    const surgeBonus = this.phase === 'final_surge' ? 1.5 : 1;
    if (this.phase === 'final_surge') c.finalSurgeActions += 1;

    if (context === 'earn' || context === 'training') {
      const academyBonus = question.level === 'advanced' && (team.state.structures.math_academy ?? 0) > 0 ? 1.25 : 1;
      const scale = team.balanceMultiplier * speedBonus * surgeBonus * academyBonus;
      const coins = Math.round(question.reward * scale);
      const materials = Math.round(question.reward * 0.75 * scale);
      const energy = Math.round(question.reward * 0.6 * scale);
      const mana = Math.round(question.reward * 0.4 * scale);
      team.state.resources.coins += coins;
      team.state.resources.materials += materials;
      team.state.resources.energy += energy;
      team.state.resources.mana += mana;
      rewards.coins = coins;
      rewards.materials = materials;
      rewards.energy = energy;
      rewards.mana = mana;
      if (c.questionsCorrect % 3 === 0) {
        team.state.resources.tokens += 1;
        rewards.tokens = 1;
      }
      const streakBonus = c.streak > 0 && c.streak % 3 === 0 ? 10 : 0;
      if (streakBonus) {
        team.state.resources.coins += streakBonus;
        rewards.streakBonus = streakBonus;
      }
      team.resourcesEarnedTotal += coins + materials + energy + mana;
      c.resourcesEarned += coins + materials + energy + mana;
    } else if (context === 'attack') {
      const raid = this.raids.find((r) => r.attackerId === team.state.teamId);
      const energy = Math.round(question.reward * speedBonus);
      team.state.resources.energy += energy;
      rewards.energy = energy;
      if (raid) {
        raid.attackBuff = Math.min(2, raid.attackBuff + 0.1);
        rewards.attackBuff = Math.round(raid.attackBuff * 100);
      }
      team.resourcesEarnedTotal += energy;
      c.resourcesEarned += energy;
    } else if (context === 'defense') {
      const defense = Math.round(question.reward * 1.5 * speedBonus);
      team.state.resources.defense += defense;
      c.shieldsActivated += 1;
      rewards.defense = defense;
      this.pushEvent('shield', `${player.name} activated a shield for ${team.state.name}! (+${defense} defense)`, team.state.teamId, 'success');
    } else if (context === 'crisis') {
      team.state.crisisCorrect += 1;
      team.crisisAnswerReduction += question.reward;
      c.crisisSolved += 1;
      rewards.crisisReduction = question.reward;
      this.pushEvent('cloud-lightning', `${team.state.name} reduced incoming crisis damage by ${question.reward}!`, team.state.teamId, 'success');
    }

    team.lastScoreAt = this.vNow;
    return { correct: true, explanation: question.explanation, rewards, streak: c.streak };
  }

  private duplicateGuardClear(_playerId: string, _questionId: string): void {
    // Answers are consumed on submission (assignment deleted above), so a
    // duplicate submission of the same question can never double-award.
  }

  // -------------------------------------------------------------------------
  // Building
  // -------------------------------------------------------------------------

  build(playerId: string, structureId: StructureId): { error: string } | { built: StructureId } {
    const team = this.teamOf(playerId);
    if (!team) return { error: 'You are not in this match.' };
    if (this.finished || team.state.knockedOut) return { error: 'Your district cannot build now.' };
    if (this.phase === 'preparation' || this.phase === 'knowledge_rush') {
      return { error: 'Building opens in the Build & Fortify phase.' };
    }
    const def = STRUCTURES[structureId];
    if (!def) return { error: 'Unknown structure.' };
    const current = team.state.structures[structureId] ?? 0;
    if (current >= def.maxCount) return { error: `${def.name} is already at maximum (${def.maxCount}).` };
    const r = team.state.resources;
    if (r.coins < def.cost.coins || r.materials < def.cost.materials || r.tokens < def.cost.tokens) {
      return { error: `Not enough resources for ${def.name}.` };
    }
    r.coins -= def.cost.coins;
    r.materials -= def.cost.materials;
    r.tokens -= def.cost.tokens;
    team.state.structures[structureId] = current + 1;
    const spent = def.cost.coins + def.cost.materials;
    team.resourcesSpentTotal += spent;

    const player = team.state.players.find((p) => p.playerId === playerId)!;
    player.contribution.buildingsBuilt += 1;
    player.contribution.resourcesSpent += spent;
    team.lastScoreAt = this.vNow;
    this.pushEvent(def.icon, `${team.state.name} built a ${def.name}.`, team.state.teamId, 'info');
    return { built: structureId };
  }

  // -------------------------------------------------------------------------
  // Deployment & raids
  // -------------------------------------------------------------------------

  deploy(playerId: string, characterId: CharacterId): { error: string } | { deployed: CharacterId } {
    const team = this.teamOf(playerId);
    if (!team) return { error: 'You are not in this match.' };
    if (this.finished || team.state.knockedOut) return { error: 'Your district cannot deploy now.' };
    if (this.phase !== 'raid' && this.phase !== 'final_surge' && this.phase !== 'crisis') {
      return { error: 'Units can be deployed from the crisis phase onwards.' };
    }
    const def = CHARACTERS[characterId];
    if (!def) return { error: 'Unknown character.' };

    const setupPlayer = team.setup.players.find((p) => p.profile.id === playerId);
    if (!setupPlayer) return { error: 'Player not found.' };
    if (!setupPlayer.isBot && !setupPlayer.profile.unlockedCharacters.includes(characterId)) {
      return { error: `${def.name} is locked. Complete the trial in the Training Academy.` };
    }

    const deployedCount = team.state.dragonDeployedThisMatch[characterId] ?? 0;
    if (def.maxPerMatch !== null && deployedCount >= def.maxPerMatch) {
      return { error: `${def.name} can only be deployed ${def.maxPerMatch === 1 ? 'once' : `${def.maxPerMatch} times`} per match.` };
    }

    const advancedGate = DRAGON_ADVANCED_GATE[characterId];
    if (advancedGate) {
      const teamAdvanced = team.state.players.reduce((s, p) => s + p.contribution.advancedSolved, 0);
      if (teamAdvanced < advancedGate) {
        return { error: `${def.name} needs ${advancedGate} correct advanced answer${advancedGate === 1 ? '' : 's'} from your team this match (you have ${teamAdvanced}).` };
      }
    }

    const cooldownMap = this.cooldowns.get(playerId) ?? {};
    const readyAt = cooldownMap[characterId] ?? 0;
    if (this.vNow < readyAt) {
      return { error: `${def.name} is on cooldown for ${Math.ceil(readyAt - this.vNow)}s.` };
    }

    const r = team.state.resources;
    if (r.energy < def.deployCost.energy || r.mana < def.deployCost.mana) {
      return { error: `Not enough energy/mana for ${def.name}. Answer questions to earn more.` };
    }
    r.energy -= def.deployCost.energy;
    r.mana -= def.deployCost.mana;
    team.resourcesSpentTotal += def.deployCost.energy + def.deployCost.mana;

    cooldownMap[characterId] = this.vNow + def.cooldown;
    this.cooldowns.set(playerId, cooldownMap);
    team.state.dragonDeployedThisMatch[characterId] = deployedCount + 1;

    const player = team.state.players.find((p) => p.playerId === playerId)!;
    player.contribution.unitsDeployed += 1;
    player.contribution.resourcesSpent += def.deployCost.energy + def.deployCost.mana;

    if (characterId === 'necromancer' && team.graveyard.length > 0) {
      const revivedId = team.graveyard.pop()!;
      const revivedDef = CHARACTERS[revivedId];
      team.state.units.push({
        id: `unit_${++this.eventCounter}`,
        characterId: revivedId,
        ownerPlayerId: playerId,
        health: Math.round(revivedDef.health / 2),
        maxHealth: revivedDef.health,
        power: revivedDef.power,
      });
      player.contribution.assists += 1;
      this.pushEvent('sparkles', `${player.name}'s Necromancer revived a fallen ${revivedDef.name}!`, team.state.teamId, 'success');
    }
    if (characterId === 'healer') {
      for (const unit of team.state.units) {
        unit.health = Math.min(unit.maxHealth, unit.health + 40);
      }
      player.contribution.assists += 1;
    }

    team.state.units.push({
      id: `unit_${++this.eventCounter}`,
      characterId,
      ownerPlayerId: playerId,
      health: def.health,
      maxHealth: def.health,
      power: def.power,
    });
    team.lastScoreAt = this.vNow;

    if (def.tier === 'dragon') {
      this.pushEvent('flame', `${team.state.name} deployed the ${def.name}! (${def.power} power)`, team.state.teamId, 'warning');
    } else {
      this.pushEvent('swords', `${player.name} deployed ${def.name} for ${team.state.name}.`, team.state.teamId, 'info');
    }
    return { deployed: characterId };
  }

  attack(playerId: string, targetTeamId: string): { error: string } | { raiding: string } {
    const team = this.teamOf(playerId);
    if (!team) return { error: 'You are not in this match.' };
    const target = this.teams.get(targetTeamId);
    if (!target) return { error: 'Unknown target team.' };
    if (this.phase !== 'raid' && this.phase !== 'final_surge') {
      return { error: 'Attacks are only possible during the raid period.' };
    }
    if (this.vNow > T_MATCH_END - ATTACK_LOCK_FINAL_SECONDS) {
      return { error: 'Too late — no new attacks in the final seconds.' };
    }
    if (team.state.teamId === targetTeamId) return { error: 'You cannot attack your own district.' };
    if (team.state.knockedOut) return { error: 'Your district is out of active combat.' };
    if (target.state.knockedOut) return { error: `${target.state.name} is already knocked out.` };
    if (target.state.shieldUntil > this.vNow) {
      return { error: `${target.state.name} is protected by a shield right now.` };
    }
    const activeRaidsByTeam = this.raids.filter((r) => r.attackerId === team.state.teamId).length;
    if (activeRaidsByTeam >= MAX_SIMULTANEOUS_RAIDS) {
      return { error: 'Your team already has an attack under way.' };
    }
    const lastAttack = team.state.attackedRecently[targetTeamId] ?? -Infinity;
    if (this.vNow - lastAttack < SAME_TARGET_LOCK_SECONDS) {
      return { error: `You attacked ${target.state.name} too recently. Choose another target.` };
    }
    if (team.state.units.length === 0) {
      return { error: 'Deploy at least one unit before attacking.' };
    }

    team.state.attackedRecently[targetTeamId] = this.vNow;
    team.state.activeRaidTarget = targetTeamId;
    team.state.battle.attacksLaunched += 1;
    target.state.battle.attacksReceived += 1;
    this.raids.push({
      attackerId: team.state.teamId,
      defenderId: targetTeamId,
      endsAt: this.vNow + RAID_DURATION,
      attackBuff: 1,
      ticksApplied: 0,
    });
    this.pushEvent('swords', `${team.state.name} is raiding ${target.state.name}!`, team.state.teamId, 'danger');
    this.broadcastSnapshot();
    return { raiding: targetTeamId };
  }

  private processRaids(dt: number): void {
    if (this.raids.length === 0) return;
    const done: ActiveRaid[] = [];
    for (const raid of this.raids) {
      const attacker = this.teams.get(raid.attackerId)!;
      const defender = this.teams.get(raid.defenderId)!;
      if (attacker.state.knockedOut || defender.state.knockedOut || this.vNow >= raid.endsAt) {
        done.push(raid);
        continue;
      }

      const attackPower = attacker.state.units.reduce((s, u) => s + u.power, 0) * raid.attackBuff;
      const structureDefense = structuresRaidDefense(defender.state.structures);
      const guardPower = defender.state.units
        .filter((u) => u.characterId === 'guardian')
        .reduce((s, u) => s + u.power * 2, 0);
      const defensePoints = defender.state.resources.defense;
      const totalDefensePerSecond = (structureDefense + guardPower) / RAID_DURATION + defensePoints * 0.05;

      const rawDamage = (attackPower / RAID_DURATION) * dt;
      const blocked = Math.min(rawDamage, totalDefensePerSecond * dt);
      const netDamage = Math.max(0, rawDamage - blocked);

      defender.state.resources.defense = Math.max(0, defender.state.resources.defense - defensePoints * 0.05 * dt);
      defender.state.coreHealth = Math.max(0, Math.round(defender.state.coreHealth - netDamage));
      attacker.state.battle.damageDealt += Math.round(netDamage);
      defender.state.battle.damageBlocked += Math.round(blocked);

      distributeBattleCredit(attacker.state, netDamage);
      distributeDefenseCredit(defender.state, blocked);

      // Archer towers fire back at raiding units.
      const towerCount = defender.state.structures.archer_tower ?? 0;
      if (towerCount > 0 && attacker.state.units.length > 0) {
        const unit = attacker.state.units[0];
        unit.health -= towerCount * 12 * dt;
        if (unit.health <= 0) {
          attacker.state.units.shift();
          attacker.graveyard.push(unit.characterId);
          this.pushEvent('crosshair', `${defender.state.name}'s Archer Tower defeated a raiding ${CHARACTERS[unit.characterId].name}!`, defender.state.teamId, 'success');
        }
      }

      if (defender.state.coreHealth <= 0) {
        this.knockOut(defender);
        done.push(raid);
      }
      attacker.lastScoreAt = this.vNow;
      defender.lastScoreAt = this.vNow;
    }

    for (const raid of done) {
      this.raids = this.raids.filter((r) => r !== raid);
      const attacker = this.teams.get(raid.attackerId)!;
      const defender = this.teams.get(raid.defenderId)!;
      attacker.state.activeRaidTarget = null;
      if (!defender.state.knockedOut) {
        // Fair play: recently attacked teams receive a temporary shield.
        defender.state.shieldUntil = this.vNow + RECENT_ATTACK_SHIELD_SECONDS;
        this.pushEvent('shield-check', `The raid on ${defender.state.name} has ended. A recovery shield protects them briefly.`, defender.state.teamId, 'info');
      }
    }
  }

  private knockOut(team: InternalTeam): void {
    if (team.state.knockedOut) return;
    team.state.knockedOut = true;
    team.state.knockoutOrder = ++this.knockoutCounter;
    team.state.knockedOutAt = this.vNow;
    team.state.units = [];
    this.pushEvent('skull', `${team.state.name}'s District Core has fallen! They keep all progress earned this match.`, team.state.teamId, 'danger');

    const remaining = [...this.teams.values()].filter((t) => !t.state.knockedOut);
    if (remaining.length <= 1) {
      this.pushEvent('crown', `${remaining[0]?.state.name ?? 'No one'} is the last district standing!`, remaining[0]?.state.teamId, 'success');
      this.finish();
    }
  }

  // -------------------------------------------------------------------------
  // Crisis
  // -------------------------------------------------------------------------

  private strikeCrisis(): void {
    this.crisisStruck = true;
    const crisis = CRISES[this.crisisId];
    for (const team of this.teams.values()) {
      if (team.state.knockedOut) continue;
      const report = computeCrisisDamage({
        crisisId: this.crisisId,
        structures: team.state.structures,
        answerReduction: team.crisisAnswerReduction,
        correctAnswers: team.state.crisisCorrect,
        coinsHeld: team.state.resources.coins,
      });
      team.state.crisisReport = report;
      team.state.coreHealth = Math.max(0, team.state.coreHealth - report.finalDamage);
      this.pushEvent(
        crisis.icon,
        `${crisis.name} hits ${team.state.name}: ${report.finalDamage} damage (base ${report.baseDamage}, prevented ${report.baseDamage - report.finalDamage}).`,
        team.state.teamId,
        report.finalDamage === 0 ? 'success' : 'crisis',
      );
    }
    // Simultaneous knockouts: lower remaining health at strike = knocked out first.
    const victims = [...this.teams.values()]
      .filter((t) => !t.state.knockedOut && t.state.coreHealth <= 0)
      .sort((a, b) => (a.state.crisisReport?.finalDamage ?? 0) - (b.state.crisisReport?.finalDamage ?? 0))
      .reverse();
    for (const victim of victims) this.knockOut(victim);
    this.broadcastSnapshot();
  }

  // -------------------------------------------------------------------------
  // Signals
  // -------------------------------------------------------------------------

  signal(playerId: string, signalId: string): { error: string } | { ok: true } {
    const team = this.teamOf(playerId);
    if (!team) return { error: 'You are not in this match.' };
    const def = TEAM_SIGNALS.find((s) => s.id === signalId);
    if (!def) return { error: 'Unknown signal.' };
    const player = team.state.players.find((p) => p.playerId === playerId)!;
    player.contribution.assists += signalId === 'good_job' ? 1 : 0;
    for (const p of team.state.players) {
      if (!p.isBot) this.cb.toPlayer(p.playerId, 'match:signal', { from: player.name, signal: def });
    }
    return { ok: true };
  }

  // -------------------------------------------------------------------------
  // Bots
  // -------------------------------------------------------------------------

  private runBots(dt: number): void {
    for (const team of this.teams.values()) {
      if (!team.bot || team.state.knockedOut) continue;
      team.botAnswerAccumulator += dt;
      team.botActionAccumulator += dt;

      // Answering cadence: each bot player answers roughly every 7 virtual seconds.
      const cadence = 7 / Math.max(1, team.state.players.length);
      while (team.botAnswerAccumulator >= cadence) {
        team.botAnswerAccumulator -= cadence;
        this.botAnswer(team);
      }
      if (team.botActionAccumulator >= 5) {
        team.botActionAccumulator = 0;
        this.botAct(team);
      }
    }
  }

  private botAnswer(team: InternalTeam): void {
    if (this.phase === 'preparation' || this.finished) return;
    const bot = team.bot!;
    const player = this.rng.pick(team.state.players);
    const c = player.contribution;
    const correct = this.rng.next() < bot.accuracy;

    let context: QuestionContext = 'earn';
    if (this.crisisWarned && !this.crisisStruck && team.state.crisisCorrect < CRISIS_QUESTION_LIMIT && this.rng.next() < 0.75) {
      context = 'crisis';
    } else if (this.raids.some((r) => r.defenderId === team.state.teamId)) {
      context = 'defense';
    } else if (this.raids.some((r) => r.attackerId === team.state.teamId)) {
      context = 'attack';
    }

    const advanced = bot.accuracy > 0.7 && this.rng.next() < 0.25;
    const assignedQ = this.requestQuestion(player.playerId, context, { advanced });
    if ('error' in assignedQ) return;
    const question = QUESTIONS_BY_ID.get(assignedQ.id)!;
    if (correct) {
      this.submitAnswer(player.playerId, question.id, correctSubmissionFor(question));
    } else {
      this.submitAnswer(player.playerId, question.id, { kind: 'number', raw: '999999' });
      c.streak = 0;
    }
  }

  private botAct(team: InternalTeam): void {
    const bot = team.bot!;
    if (this.phase === 'build' || this.phase === 'crisis') {
      // Build toward the plan; at crisis warning, prefer the counter-structure.
      const counters: StructureId[] = this.crisisWarned
        ? counterStructuresFor(this.crisisId)
        : [];
      const plan = [...counters, ...bot.buildOrder];
      for (const structureId of plan) {
        const anyBotPlayer = team.state.players[0];
        const result = this.build(anyBotPlayer.playerId, structureId);
        if (!('error' in result)) break;
      }
    }
    if (this.phase === 'raid' || this.phase === 'final_surge') {
      const player = this.rng.pick(team.state.players);
      if (team.state.units.length < 3) {
        const deployable = bot.characters.filter((id) => CHARACTERS[id].tier !== 'dragon' || bot.accuracy > 0.8);
        this.deploy(player.playerId, this.rng.pick(deployable));
      }
      if (team.state.units.length > 0 && this.rng.next() < bot.aggression) {
        // Prefer similar-strength targets (closest rating).
        const targets = [...this.teams.values()]
          .filter((t) => t.state.teamId !== team.state.teamId && !t.state.knockedOut && t.state.shieldUntil <= this.vNow)
          .sort((a, b) => Math.abs(a.state.rating - team.state.rating) - Math.abs(b.state.rating - team.state.rating));
        if (targets.length > 0) {
          this.attack(player.playerId, targets[0].state.teamId);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Finishing
  // -------------------------------------------------------------------------

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.phase = 'finished';
    this.stop();
    this.raids = [];

    const allTeams = [...this.teams.values()];
    const bestBattle = Math.max(
      1,
      ...allTeams.map((t) => t.state.battle.damageDealt + t.state.battle.damageBlocked),
    );

    for (const team of allTeams) {
      const accuracy = teamAccuracy(team.state);
      const rolesFilled = new Set(team.state.players.map((p) => p.role).filter(Boolean)).size;
      const assists = team.state.players.reduce((s, p) => s + p.contribution.assists, 0);
      const input = {
        damageDealt: team.state.battle.damageDealt,
        damageBlocked: team.state.battle.damageBlocked,
        bestBattleInMatch: bestBattle,
        accuracy,
        advancedSolved: team.state.players.reduce((s, p) => s + p.contribution.advancedSolved, 0),
        coreHealth: team.state.coreHealth,
        maxCoreHealth: team.state.maxCoreHealth,
        knockedOut: team.state.knockedOut,
        survivalFraction: team.state.knockedOutAt !== null ? team.state.knockedOutAt / T_MATCH_END : 1,
        crisisBase: team.state.crisisReport?.baseDamage ?? 0,
        crisisFinal: team.state.crisisReport?.finalDamage ?? 0,
        structuresBuilt: Object.values(team.state.structures).reduce((s: number, v) => s + (v ?? 0), 0),
        resourcesEarned: team.resourcesEarnedTotal,
        resourcesSpent: team.resourcesSpentTotal,
        assists,
        rolesFilled,
      };
      team.state.victoryScore = victoryScore(input);
      team.state.scoreBreakdown = victoryScoreBreakdown(input);
    }

    const placements = computePlacements(
      allTeams.map((t) => ({
        teamId: t.state.teamId,
        knockedOut: t.state.knockedOut,
        knockoutOrder: t.state.knockoutOrder,
        coreHealth: t.state.coreHealth,
        victoryScore: t.state.victoryScore,
        accuracy: teamAccuracy(t.state),
        crisisFinalDamage: t.state.crisisReport?.finalDamage ?? CRISES[this.crisisId].baseDamage,
        battleDifferential: t.state.battle.damageDealt - (t.state.maxCoreHealth - t.state.coreHealth),
        scoreReachedAt: t.lastScoreAt,
      })),
    );

    const averageRating =
      allTeams.reduce((s, t) => s + t.state.rating, 0) / Math.max(1, allTeams.length);

    const teamResults: TeamResult[] = [];
    const playerResults: PlayerResult[] = [];

    for (const team of allTeams) {
      const placement = placements.get(team.state.teamId)!;
      const contributions = team.state.players.map((p) => p.contribution);
      const raws = contributions.map((c) => rawContribution(c, contributions));
      const percents = normalizeContributions(raws);

      const members = team.state.players.map((p, i) => ({
        playerId: p.playerId,
        contribution: p.contribution,
        contributionPercent: percents[i],
      }));
      const teamMvpId = pickTeamMvp(members);

      const placementPoints = seasonPointsForPlacement(placement, team.state.victoryScore);
      const bonus = teamBonusPoints({
        perfectCrisis: (team.state.crisisReport?.finalDamage ?? 1) === 0,
        eliteTrialCompleted: (team.state.dragonDeployedThisMatch.dragon_elite ?? 0) > 0,
        mythicTrialCompleted: (team.state.dragonDeployedThisMatch.dragon_mythic ?? 0) > 0,
      });
      const teamSeasonPoints = placementPoints + bonus;
      const change = ratingChange(team.state.rating, averageRating, placement, allTeams.length);

      teamResults.push({
        teamId: team.state.teamId,
        name: team.state.name,
        emblem: team.state.emblem,
        placement,
        victoryScore: team.state.victoryScore,
        scoreBreakdown: team.state.scoreBreakdown ?? {},
        coreHealth: team.state.coreHealth,
        knockedOut: team.state.knockedOut,
        seasonPointsGained: teamSeasonPoints,
        ratingChange: change,
        newSeasonPoints: team.setup.team.seasonPoints + teamSeasonPoints,
        newRating: team.setup.team.rating + change,
        crisisReport: team.state.crisisReport,
        mathsAccuracy: Math.round(teamAccuracy(team.state) * 1000) / 10,
      });

      team.state.players.forEach((p, i) => {
        const c = p.contribution;
        playerResults.push({
          playerId: p.playerId,
          name: p.name,
          teamId: team.state.teamId,
          contributionPercent: percents[i],
          accuracy: c.questionsAttempted > 0 ? Math.round((c.questionsCorrect / c.questionsAttempted) * 1000) / 10 : 0,
          questionsCorrect: c.questionsCorrect,
          questionsAttempted: c.questionsAttempted,
          advancedSolved: c.advancedSolved,
          attackDamage: c.attackDamage,
          defenseBlocked: c.defenseBlocked,
          assists: c.assists,
          mvpScore: matchMvpScore({
            playerId: p.playerId,
            contribution: c,
            contributionPercent: percents[i],
            teamPlacement: placement,
            teamCount: allTeams.length,
          }),
          isTeamMvp: p.playerId === teamMvpId,
          isMatchMvp: false,
          seasonPointsGained: teamSeasonPoints,
        });
      });
    }

    // Match MVP across the whole lobby (does not need to be on the winning team).
    const qualified = playerResults.filter((p) => {
      const c = this.findContribution(p.playerId);
      return c ? qualifiesForMvp(c) : false;
    });
    const mvpPool = qualified.length > 0 ? qualified : playerResults;
    const sortedByMvp = [...mvpPool].sort((a, b) => b.mvpScore - a.mvpScore || a.playerId.localeCompare(b.playerId));
    const matchMvp = sortedByMvp[0];
    if (matchMvp) {
      for (const p of playerResults) {
        if (p.playerId === matchMvp.playerId) p.isMatchMvp = true;
      }
    }
    for (const p of playerResults) {
      if (p.isTeamMvp) p.seasonPointsGained += BONUS_POINTS.teamMvp;
      if (p.isMatchMvp) p.seasonPointsGained += BONUS_POINTS.matchMvp;
    }

    teamResults.sort((a, b) => a.placement - b.placement);

    const bestAttackTeam = [...allTeams].sort((a, b) => b.state.battle.damageDealt - a.state.battle.damageDealt)[0];
    const bestDefenseTeam = [...allTeams].sort((a, b) => b.state.battle.damageBlocked - a.state.battle.damageBlocked)[0];
    const bestCrisisTeam = [...allTeams].sort(
      (a, b) => (a.state.crisisReport?.finalDamage ?? 9999) - (b.state.crisisReport?.finalDamage ?? 9999),
    )[0];

    this.results = {
      matchId: this.id,
      mode: this.mode,
      endedAt: Date.now(),
      teams: teamResults,
      players: playerResults,
      matchMvpId: matchMvp?.playerId ?? '',
      mvpCandidates: sortedByMvp.slice(0, 5).map((p) => ({
        playerId: p.playerId,
        name: p.name,
        teamId: p.teamId,
        score: p.mvpScore,
      })),
      awards: {
        bestAttack: bestAttackTeam ? { teamId: bestAttackTeam.state.teamId, value: bestAttackTeam.state.battle.damageDealt } : null,
        bestDefense: bestDefenseTeam ? { teamId: bestDefenseTeam.state.teamId, value: bestDefenseTeam.state.battle.damageBlocked } : null,
        bestCrisis: bestCrisisTeam?.state.crisisReport
          ? { teamId: bestCrisisTeam.state.teamId, value: bestCrisisTeam.state.crisisReport.finalDamage }
          : null,
        bestComeback: null,
        mostImproved: null,
      },
    };

    this.broadcastSnapshot();
    this.cb.toAll('match:finished', this.results);
    this.cb.onFinished(this.results, this);
  }

  private findContribution(playerId: string): MatchPlayerContribution | null {
    for (const team of this.teams.values()) {
      const p = team.state.players.find((pl) => pl.playerId === playerId);
      if (p) return p.contribution;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Snapshots
  // -------------------------------------------------------------------------

  snapshotFor(playerId: string | null): MatchSnapshot {
    const phaseEndV =
      this.phase === 'preparation' ? T_PREP_END
      : this.phase === 'knowledge_rush' ? T_RUSH_END
      : this.phase === 'build' ? T_BUILD_END
      : this.phase === 'crisis' ? T_RAID_START
      : this.phase === 'raid' ? T_RAID_END
      : this.phase === 'final_surge' ? T_MATCH_END
      : this.vNow;
    const now = Date.now();
    const toRealMs = (v: number) => now + Math.max(0, ((v - this.vNow) / this.speedFactor) * 1000);

    return {
      matchId: this.id,
      mode: this.mode,
      phase: this.phase,
      phaseEndsAt: toRealMs(phaseEndV),
      matchEndsAt: toRealMs(T_MATCH_END),
      now,
      teams: [...this.teams.values()].map((t) => t.state),
      events: this.events.slice(-40),
      crisisWarning:
        this.crisisWarned && !this.crisisStruck
          ? {
              crisisId: this.crisisId,
              name: CRISES[this.crisisId].name,
              description: CRISES[this.crisisId].description,
              baseDamage: CRISES[this.crisisId].baseDamage,
              strikesAt: toRealMs(T_CRISIS_STRIKE),
              protectionOptions: CRISES[this.crisisId].protectionOptions,
            } satisfies CrisisWarning
          : null,
      yourTeamId: playerId ? this.playerTeam.get(playerId) ?? null : null,
      isDemo: this.mode === 'demo',
    };
  }

  private broadcastSnapshot(): void {
    for (const team of this.teams.values()) {
      for (const p of team.state.players) {
        if (!p.isBot) this.cb.toPlayer(p.playerId, 'match:snapshot', this.snapshotFor(p.playerId));
      }
    }
    if (this.mode === 'demo') {
      this.cb.toAll('match:snapshot', this.snapshotFor(null));
    }
  }

  private pushEvent(icon: string, text: string, teamId?: string, tone: MatchEvent['tone'] = 'info'): void {
    const event: MatchEvent = {
      id: ++this.eventCounter,
      at: Date.now(),
      icon,
      text,
      teamId,
      tone,
    };
    this.events.push(event);
    if (this.events.length > 120) this.events = this.events.slice(-80);
    this.cb.toAll('match:event', event);
  }

  private teamOf(playerId: string): InternalTeam | null {
    const teamId = this.playerTeam.get(playerId);
    return teamId ? this.teams.get(teamId) ?? null : null;
  }

  get playerIds(): string[] {
    return [...this.playerTeam.keys()];
  }

  get teamStates(): MatchTeamState[] {
    return [...this.teams.values()].map((t) => t.state);
  }

  get teamSetups(): MatchTeamSetup[] {
    return [...this.teams.values()].map((t) => t.setup);
  }

  get crisis(): CrisisId {
    return this.crisisId;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyContribution(): MatchPlayerContribution {
  return {
    questionsAttempted: 0, questionsCorrect: 0, difficultySum: 0, streak: 0, bestStreak: 0,
    advancedSolved: 0, resourcesEarned: 0, resourcesSpent: 0, buildingsBuilt: 0,
    crisisPrepared: 0, crisisSolved: 0, unitsDeployed: 0, attackDamage: 0, defenseBlocked: 0,
    repairs: 0, shieldsActivated: 0, assists: 0, dragonTrialAnswers: 0, finalSurgeActions: 0,
  };
}

function structuresRaidDefense(structures: Partial<Record<StructureId, number>>): number {
  let total = 0;
  for (const [id, count] of Object.entries(structures)) {
    total += (STRUCTURES[id as StructureId]?.raidDefense ?? 0) * (count ?? 0);
  }
  return total;
}

function distributeBattleCredit(team: MatchTeamState, damage: number): void {
  const deployers = team.players.filter((p) => p.contribution.unitsDeployed > 0);
  const pool = deployers.length > 0 ? deployers : team.players;
  const share = damage / pool.length;
  for (const p of pool) p.contribution.attackDamage += Math.round(share);
}

function distributeDefenseCredit(team: MatchTeamState, blocked: number): void {
  const defenders = team.players.filter((p) => p.contribution.shieldsActivated > 0);
  const pool = defenders.length > 0 ? defenders : team.players;
  const share = blocked / pool.length;
  for (const p of pool) p.contribution.defenseBlocked += Math.round(share);
}

function counterStructuresFor(crisisId: CrisisId): StructureId[] {
  const out: StructureId[] = [];
  for (const def of Object.values(STRUCTURES)) {
    if ((def.crisisReduction[crisisId] ?? 0) > 0) out.push(def.id);
  }
  return out.sort(
    (a, b) => (STRUCTURES[b].crisisReduction[crisisId] ?? 0) - (STRUCTURES[a].crisisReduction[crisisId] ?? 0),
  );
}

function phaseAnnouncement(phase: MatchPhase): string {
  switch (phase) {
    case 'preparation': return 'Team Preparation — confirm characters and strategy.';
    case 'knowledge_rush': return 'KNOWLEDGE RUSH — answer questions to earn resources!';
    case 'build': return 'BUILD & FORTIFY — construct your district!';
    case 'crisis': return 'CITY CRISIS — prepare your defenses!';
    case 'raid': return 'OPEN RAID PERIOD — attack and defend!';
    case 'final_surge': return 'FINAL SURGE — everything counts double now!';
    case 'finished': return 'The match has ended!';
  }
}

export function correctSubmissionFor(question: Question): SubmittedAnswer {
  const spec = question.answer;
  switch (spec.kind) {
    case 'number': return { kind: 'number', raw: String(spec.value) };
    case 'fraction': return { kind: 'number', raw: `${spec.num}/${spec.den}` };
    case 'choice': return { kind: 'choice', index: spec.index };
    case 'coordinate': return { kind: 'coordinate', raw: `${spec.x},${spec.y}` };
    case 'ordering': return { kind: 'ordering', order: spec.order };
    case 'multi': {
      return {
        kind: 'multi',
        parts: spec.parts.map((p) => correctSubmissionFor({ ...question, answer: p })),
      };
    }
  }
}
