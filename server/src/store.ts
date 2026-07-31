import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  MatchHistoryEntry,
  MatchResults,
  PlayerProfile,
  SeasonInfo,
  Team,
} from '@mathcity/shared';

export interface DbShape {
  players: Record<string, PlayerProfile>;
  teams: Record<string, Team>;
  season: SeasonInfo;
  previousSeasons: { season: SeasonInfo; championTeamId: string | null; badges: Record<string, string[]> }[];
  matchResults: Record<string, MatchResults>;
  playerHistory: Record<string, MatchHistoryEntry[]>;
  teamHistory: Record<string, MatchHistoryEntry[]>;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_PATH = join(DATA_DIR, 'db.json');

function defaultSeason(): SeasonInfo {
  const now = Date.now();
  return {
    id: 'season_1',
    name: 'Season 1 — Blue Nile',
    startedAt: now,
    endsAt: now + 30 * 24 * 3600 * 1000,
    kind: 'monthly',
  };
}

function emptyDb(): DbShape {
  return {
    players: {},
    teams: {},
    season: defaultSeason(),
    previousSeasons: [],
    matchResults: {},
    playerHistory: {},
    teamHistory: {},
  };
}

let db: DbShape = emptyDb();
let saveTimer: NodeJS.Timeout | null = null;
let persistencePath = DB_PATH;

export function loadStore(path: string = DB_PATH): DbShape {
  persistencePath = path;
  try {
    if (existsSync(path)) {
      const raw = JSON.parse(readFileSync(path, 'utf-8')) as Partial<DbShape>;
      db = { ...emptyDb(), ...raw };
    }
  } catch (err) {
    console.error('[store] failed to load db, starting fresh:', err);
    db = emptyDb();
  }
  return db;
}

export function getDb(): DbShape {
  return db;
}

export function resetStore(): void {
  db = emptyDb();
  scheduleSave();
}

export function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      mkdirSync(dirname(persistencePath), { recursive: true });
      writeFileSync(persistencePath, JSON.stringify(db, null, 1));
    } catch (err) {
      console.error('[store] failed to save db:', err);
    }
  }, 400);
}

export function upsertPlayer(player: PlayerProfile): void {
  db.players[player.id] = player;
  scheduleSave();
}

export function upsertTeam(team: Team): void {
  db.teams[team.id] = team;
  scheduleSave();
}

export function recordMatch(results: MatchResults): void {
  db.matchResults[results.matchId] = results;
  // Keep only the latest 200 match results to bound file size.
  const ids = Object.keys(db.matchResults);
  if (ids.length > 200) {
    for (const id of ids.slice(0, ids.length - 200)) delete db.matchResults[id];
  }
  scheduleSave();
}

export function appendHistory(
  map: Record<string, MatchHistoryEntry[]>,
  key: string,
  entry: MatchHistoryEntry,
): void {
  const list = map[key] ?? [];
  list.unshift(entry);
  map[key] = list.slice(0, 30);
  scheduleSave();
}
