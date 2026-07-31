import type { CrisisId, MatchMode } from './types.ts';

// ---------------------------------------------------------------------------
// Match timing (seconds). speedFactor divides these at runtime.
// ---------------------------------------------------------------------------

export const PHASE_DURATIONS = {
  preparation: 60,
  knowledge_rush: 180,
  build: 150,
  crisis_warning: 30,
  crisis_prep: 60,
  raid: 180,
  final_surge: 60,
} as const;

export const SPEED_FACTOR: Record<MatchMode, number> = {
  quick: 2,
  ranked: 1,
  casual: 2,
  private: 1,
  demo: 6,
};

export const CORE_HEALTH = 2000;

/** No new attacks may start during the final seconds of the match. */
export const ATTACK_LOCK_FINAL_SECONDS = 8;

/** Shield duration granted to a recently attacked team (seconds, real time). */
export const RECENT_ATTACK_SHIELD_SECONDS = 25;

/** A team may not raid the same opponent again within this window (seconds). */
export const SAME_TARGET_LOCK_SECONDS = 45;

export const MAX_SIMULTANEOUS_RAIDS = 1;

export const TEAMS_PER_MATCH = 6;
export const MAX_TEAM_SIZE = 4;

// ---------------------------------------------------------------------------
// Crises — every team always receives the SAME base damage.
// ---------------------------------------------------------------------------

export interface CrisisDef {
  id: CrisisId;
  name: string;
  description: string;
  baseDamage: number;
  protectionOptions: string[];
  icon: string;
}

export const CRISES: Record<CrisisId, CrisisDef> = {
  flood: {
    id: 'flood',
    name: 'Lake Flood',
    description: 'Heavy rains push the lake over its banks. Every district faces the same rising water.',
    baseDamage: 1000,
    protectionOptions: ['Drainage System (-300)', 'Emergency Shelter (-100)', 'Solve crisis questions', 'Save an emergency reserve'],
    icon: 'waves',
  },
  drought: {
    id: 'drought',
    name: 'Long Drought',
    description: 'The rains fail. Gardens and reservoirs decide who endures.',
    baseDamage: 900,
    protectionOptions: ['Public Garden (-150 each)', 'Water Storage (-200)', 'Emergency Shelter (-100)', 'Solve crisis questions'],
    icon: 'sun',
  },
  earthquake: {
    id: 'earthquake',
    name: 'Earthquake',
    description: 'The ground shakes every district equally. Strong walls hold.',
    baseDamage: 1100,
    protectionOptions: ['City Walls (-100 each)', 'Emergency Shelter (-100)', 'Solve crisis questions'],
    icon: 'activity',
  },
  power_shortage: {
    id: 'power_shortage',
    name: 'Power Shortage',
    description: 'The grid browns out city-wide. Solar stations keep the lights on.',
    baseDamage: 800,
    protectionOptions: ['Solar Station (-400)', 'Emergency Shelter (-100)', 'Solve crisis questions'],
    icon: 'zap',
  },
  bridge_failure: {
    id: 'bridge_failure',
    name: 'Bridge Failure',
    description: 'The old crossing collapses. Modern bridges carry the load.',
    baseDamage: 850,
    protectionOptions: ['Nile Bridge (-400)', 'Emergency Shelter (-100)', 'Solve crisis questions'],
    icon: 'bridge',
  },
  material_shortage: {
    id: 'material_shortage',
    name: 'Material Shortage',
    description: 'Supply lines run dry. Warehouses decide who keeps building.',
    baseDamage: 750,
    protectionOptions: ['Warehouse (-350)', 'Emergency Shelter (-100)', 'Solve crisis questions'],
    icon: 'box',
  },
  population_surge: {
    id: 'population_surge',
    name: 'Population Surge',
    description: 'Thousands arrive seeking opportunity. Clinics and shelters absorb the strain.',
    baseDamage: 800,
    protectionOptions: ['Healing Centre (-200)', 'Emergency Shelter (-100)', 'Solve crisis questions'],
    icon: 'users',
  },
  transport_breakdown: {
    id: 'transport_breakdown',
    name: 'Transport Breakdown',
    description: 'Buses and trucks stop city-wide. Bridges and planning keep goods moving.',
    baseDamage: 700,
    protectionOptions: ['Nile Bridge (-250)', 'Emergency Shelter (-100)', 'Solve crisis questions'],
    icon: 'truck',
  },
  market_price: {
    id: 'market_price',
    name: 'Market-Price Spike',
    description: 'Prices double overnight. Warehouses and reserves blunt the shock.',
    baseDamage: 700,
    protectionOptions: ['Warehouse (-350)', 'Emergency Shelter (-100)', 'Solve crisis questions', 'Save an emergency reserve'],
    icon: 'trending-up',
  },
  water_shortage: {
    id: 'water_shortage',
    name: 'Water Shortage',
    description: 'Taps run dry across the city. Storage tanks decide the outcome.',
    baseDamage: 900,
    protectionOptions: ['Water Storage (-400)', 'Emergency Shelter (-100)', 'Solve crisis questions'],
    icon: 'droplet',
  },
};

/** Saving at least this many coins at crisis time counts as an emergency reserve. */
export const EMERGENCY_RESERVE_COINS = 100;
export const EMERGENCY_RESERVE_REDUCTION = 100;

// ---------------------------------------------------------------------------
// Scoring weights
// ---------------------------------------------------------------------------

export const VICTORY_SCORE_WEIGHTS = {
  battle: 0.30,
  mathematics: 0.25,
  survival: 0.15,
  crisis: 0.10,
  development: 0.10,
  resourceEfficiency: 0.05,
  teamwork: 0.05,
} as const;

export const CONTRIBUTION_WEIGHTS = {
  mathematics: 0.35,
  battle: 0.20,
  defense: 0.15,
  resources: 0.10,
  crisis: 0.10,
  teamwork: 0.10,
} as const;

export const MATCH_MVP_WEIGHTS = {
  accuracy: 0.30,
  difficulty: 0.20,
  teamContribution: 0.15,
  battle: 0.15,
  defense: 0.10,
  teamwork: 0.10,
} as const;

/** Minimum questions attempted to qualify for Match MVP. */
export const MVP_MIN_QUESTIONS = 3;

export const SEASON_PLACEMENT_POINTS = [100, 75, 60, 50, 40] as const;
export const SEASON_PARTICIPATION_MIN = 10;
export const SEASON_PARTICIPATION_MAX = 35;

export const BONUS_POINTS = {
  teamMvp: 5,
  matchMvp: 10,
  perfectCrisisDefense: 5,
  eliteDragonTrial: 5,
  mythicDragonTrial: 8,
} as const;

export const DEFAULT_RATING = 1000;
export const RATING_K = 32;

// ---------------------------------------------------------------------------
// Team signals (child-safe preset communication)
// ---------------------------------------------------------------------------

export const TEAM_SIGNALS = [
  { id: 'attack_now', text: 'Attack now', icon: 'swords' },
  { id: 'save_resources', text: 'Save resources', icon: 'piggy-bank' },
  { id: 'need_defense', text: 'Need defense', icon: 'shield' },
  { id: 'solve_this', text: 'Solve this question', icon: 'brain' },
  { id: 'prep_dragon', text: 'Preparing Dragon Trial', icon: 'flame' },
  { id: 'use_shield', text: 'Use shield', icon: 'shield-check' },
  { id: 'prep_crisis', text: 'Prepare for crisis', icon: 'cloud-lightning' },
  { id: 'retreat', text: 'Retreat', icon: 'undo' },
  { id: 'protect_core', text: 'Protect the core', icon: 'castle' },
  { id: 'good_job', text: 'Good job', icon: 'party-popper' },
] as const;

export const AVATARS = [
  'lion', 'ibis', 'hippo', 'fish', 'crane', 'monkey', 'leopard', 'pelican',
] as const;

export const TEAM_EMBLEMS = [
  'blue_nile', 'lake_star', 'bridge', 'sunrise', 'papyrus', 'mountain', 'lightning', 'falls',
] as const;
