import type {
  LeaderboardPlayerRow,
  LeaderboardTeamRow,
  MatchHistoryEntry,
  RankContext,
  SeasonInfo,
  Team,
} from '@mathcity/shared';

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const apiClient = {
  season: () =>
    get<{ season: SeasonInfo; previousSeasons: { season: SeasonInfo; championTeamId: string | null }[] }>(
      '/api/season',
    ),
  teamLeaderboard: (scope: 'season' | 'lifetime', teamId?: string | null) =>
    get<{ top: LeaderboardTeamRow[]; total: number; context: RankContext | null }>(
      `/api/leaderboard/teams?scope=${scope}${teamId ? `&teamId=${teamId}` : ''}`,
    ),
  playerLeaderboard: (sort: 'points' | 'mvp') =>
    get<{ rows: LeaderboardPlayerRow[]; total: number }>(`/api/leaderboard/players?sort=${sort}`),
  teamProfile: (teamId: string) =>
    get<{
      team: Team;
      members: {
        playerId: string; name: string; avatar: string; seasonPoints: number;
        stats: Record<string, number>; unlockedCharacters: string[];
      }[];
      seasonRank: number | null;
      lifetimeRank: number | null;
      winRatio: number;
      history: MatchHistoryEntry[];
    }>(`/api/team/${teamId}`),
  playerHistory: (playerId: string) =>
    get<{ history: MatchHistoryEntry[] }>(`/api/player/${playerId}/history`),
  academy: (playerId?: string | null) =>
    get<{ paths: AcademyPathInfo[] }>(`/api/academy${playerId ? `?playerId=${playerId}` : ''}`),
};

export interface AcademyPathInfo {
  characterId: string;
  character: {
    id: string; name: string; title: string; description: string;
    topics: string[]; abilities: string[]; tier: string; color: string; starter: boolean;
    deployCost: { energy: number; mana: number };
    power: number; health: number; cooldown: number; maxPerMatch: number | null;
    trial: { questions: number; passMark: number; level: number | string };
  };
  path: {
    title: string;
    lesson: string[];
    workedExample: { problem: string; steps: string[]; answer: string };
  };
  training: import('@mathcity/shared').ClientQuestion[];
  trialQuestionCount: number;
  passMark: number;
  unlocked: boolean;
  trialProgress: { attempts: number; bestScore: number; passed: boolean };
}
