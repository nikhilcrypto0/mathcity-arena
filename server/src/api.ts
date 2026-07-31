import { Router } from 'express';
import type {
  LeaderboardPlayerRow,
  LeaderboardTeamRow,
  RankContext,
  Team,
} from '@mathcity/shared';
import { getDb } from './store.ts';
import { compareTeamsForLeaderboard, winRatio } from './game/scoring.ts';
import { academyOverview } from './academy.ts';
import { QUESTION_BANK } from './questions/bank.ts';

export const api = Router();

function teamRow(team: Team, rank: number, scope: 'season' | 'lifetime'): LeaderboardTeamRow {
  const s = team.stats;
  return {
    rank,
    teamId: team.id,
    name: team.name,
    emblem: team.emblem,
    matchesPlayed: s.matchesPlayed,
    wins: s.wins,
    winRatio: winRatio(s.wins, s.matchesPlayed),
    topThree: s.wins + s.second + s.third,
    averagePlacement: s.matchesPlayed > 0 ? Math.round((s.placementSum / s.matchesPlayed) * 10) / 10 : null,
    seasonPoints: scope === 'season' ? team.seasonPoints : s.lifetimePoints,
    currentStreak: s.winStreak,
    mathsAccuracy: s.questionsAttempted > 0 ? Math.round((s.questionsCorrect / s.questionsAttempted) * 1000) / 10 : 0,
    rating: team.rating,
  };
}

function rankedTeams(scope: 'season' | 'lifetime'): LeaderboardTeamRow[] {
  const db = getDb();
  const teams = Object.values(db.teams).filter((t) => t.stats.matchesPlayed > 0 || t.seasonPoints > 0);
  const sortable = teams.map((t) => ({
    team: t,
    key: {
      teamId: t.id,
      seasonPoints: scope === 'season' ? t.seasonPoints : t.stats.lifetimePoints,
      wins: t.stats.wins,
      averagePlacement: t.stats.matchesPlayed > 0 ? t.stats.placementSum / t.stats.matchesPlayed : null,
      mathsAccuracy: t.stats.questionsAttempted > 0 ? t.stats.questionsCorrect / t.stats.questionsAttempted : 0,
      rating: t.rating,
      lastMatchScore: 0,
    },
  }));
  sortable.sort((a, b) => compareTeamsForLeaderboard(a.key, b.key));
  return sortable.map((entry, i) => teamRow(entry.team, i + 1, scope));
}

api.get('/health', (_req, res) => {
  res.json({ ok: true, questions: QUESTION_BANK.length });
});

api.get('/season', (_req, res) => {
  const db = getDb();
  res.json({ season: db.season, previousSeasons: db.previousSeasons });
});

api.get('/leaderboard/teams', (req, res) => {
  const scope = req.query.scope === 'lifetime' ? 'lifetime' : 'season';
  const rows = rankedTeams(scope);
  const teamId = typeof req.query.teamId === 'string' ? req.query.teamId : null;

  let context: RankContext | null = null;
  if (teamId) {
    const index = rows.findIndex((r) => r.teamId === teamId);
    if (index >= 0) {
      const nextMeaningful = index >= 50 ? rows[49] : index > 0 ? rows[index - 1] : null;
      context = {
        rank: index + 1,
        above: index > 0 ? rows[index - 1] : null,
        below: index < rows.length - 1 ? rows[index + 1] : null,
        pointsToNext: nextMeaningful ? Math.max(0, nextMeaningful.seasonPoints - rows[index].seasonPoints + 1) : null,
      };
    }
  }
  res.json({ top: rows.slice(0, 50), total: rows.length, context });
});

api.get('/leaderboard/players', (req, res) => {
  const db = getDb();
  const sortKey = req.query.sort === 'mvp' ? 'mvp' : 'points';
  const rows: LeaderboardPlayerRow[] = Object.values(db.players)
    .filter((p) => p.stats.matchesPlayed > 0)
    .map((p) => ({
      rank: 0,
      playerId: p.id,
      name: p.name,
      teamName: p.teamId ? db.teams[p.teamId]?.name ?? null : null,
      matches: p.stats.matchesPlayed,
      wins: p.stats.wins,
      matchMvpAwards: p.stats.matchMvpAwards,
      teamMvpAwards: p.stats.teamMvpAwards,
      mathsAccuracy: p.stats.questionsAttempted > 0
        ? Math.round((p.stats.questionsCorrect / p.stats.questionsAttempted) * 1000) / 10
        : 0,
      averageContribution: 0,
      advancedSolved: p.stats.advancedSolved,
      dragonTrials: p.stats.dragonTrialsCompleted,
      seasonPoints: p.seasonPoints,
    }));
  rows.sort((a, b) =>
    sortKey === 'mvp'
      ? b.matchMvpAwards - a.matchMvpAwards || b.teamMvpAwards - a.teamMvpAwards || b.seasonPoints - a.seasonPoints
      : b.seasonPoints - a.seasonPoints || b.wins - a.wins || b.mathsAccuracy - a.mathsAccuracy,
  );
  rows.forEach((r, i) => { r.rank = i + 1; });
  res.json({ rows: rows.slice(0, 100), total: rows.length });
});

api.get('/team/:id', (req, res) => {
  const db = getDb();
  const team = db.teams[req.params.id];
  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }
  const members = team.memberIds.map((id) => db.players[id]).filter(Boolean).map((p) => ({
    playerId: p.id,
    name: p.name,
    avatar: p.avatar,
    stats: p.stats,
    seasonPoints: p.seasonPoints,
    unlockedCharacters: p.unlockedCharacters,
  }));
  const seasonRows = rankedTeams('season');
  const lifetimeRows = rankedTeams('lifetime');
  res.json({
    team,
    members,
    seasonRank: seasonRows.findIndex((r) => r.teamId === team.id) + 1 || null,
    lifetimeRank: lifetimeRows.findIndex((r) => r.teamId === team.id) + 1 || null,
    winRatio: winRatio(team.stats.wins, team.stats.matchesPlayed),
    history: db.teamHistory[team.id] ?? [],
  });
});

api.get('/player/:id/history', (req, res) => {
  const db = getDb();
  res.json({ history: db.playerHistory[req.params.id] ?? [] });
});

api.get('/match/:id', (req, res) => {
  const db = getDb();
  const result = db.matchResults[req.params.id];
  if (!result) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  res.json(result);
});

api.get('/academy', (req, res) => {
  const db = getDb();
  const playerId = typeof req.query.playerId === 'string' ? req.query.playerId : null;
  const profile = playerId ? db.players[playerId] ?? null : null;
  res.json({ paths: academyOverview(profile) });
});
