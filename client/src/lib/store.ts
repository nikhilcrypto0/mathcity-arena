import { create } from 'zustand';
import type {
  ClientQuestion,
  Language,
  MatchMode,
  MatchResults,
  MatchSnapshot,
  PartyView,
  PlayerProfile,
  Team,
} from '@mathcity/shared';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

export interface Settings {
  language: Language;
  sound: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  textLarge: boolean;
}

export interface AnswerResult {
  correct: boolean;
  explanation: string;
  rewards: Partial<Record<string, number>>;
  streak: number;
}

export interface TrialState {
  characterId: string;
  questions: ClientQuestion[];
}

export interface TrialResult {
  characterId: string;
  correct: number;
  total: number;
  passed: boolean;
  unlocked: boolean;
  perQuestion: { questionId: string; correct: boolean; explanation: string }[];
}

export interface SignalPing {
  from: string;
  signal: { id: string; text: string; icon: string };
  at: number;
}

const SETTINGS_KEY = 'mathcity-settings';

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch { /* fall through */ }
  return { ...defaultSettings };
}

const defaultSettings: Settings = {
  language: 'en',
  sound: true,
  reducedMotion: false,
  highContrast: false,
  textLarge: false,
};

interface AppState {
  connected: boolean;
  profile: PlayerProfile | null;
  team: Team | null;
  party: PartyView | null;
  queue: { searching: boolean; mode: MatchMode | null };
  matchId: string | null;
  snapshot: MatchSnapshot | null;
  question: ClientQuestion | null;
  answerResult: AnswerResult | null;
  results: MatchResults | null;
  demo: { active: boolean; paused: boolean; speed: number };
  trial: TrialState | null;
  trialResult: TrialResult | null;
  practiceResult: (AnswerResult & { questionId: string }) | null;
  signal: SignalPing | null;
  toasts: Toast[];
  settings: Settings;

  set: (partial: Partial<AppState>) => void;
  pushToast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  clearMatch: () => void;
}

let toastCounter = 0;

export const useApp = create<AppState>((set, get) => ({
  connected: false,
  profile: null,
  team: null,
  party: null,
  queue: { searching: false, mode: null },
  matchId: null,
  snapshot: null,
  question: null,
  answerResult: null,
  results: null,
  demo: { active: false, paused: false, speed: 1 },
  trial: null,
  trialResult: null,
  practiceResult: null,
  signal: null,
  toasts: [],
  settings: loadSettings(),

  set: (partial) => set(partial),

  pushToast: (message, tone = 'info') => {
    const id = ++toastCounter;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => get().dismissToast(id), 4200);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    set({ settings });
  },

  clearMatch: () =>
    set({
      matchId: null,
      snapshot: null,
      question: null,
      answerResult: null,
      results: null,
    }),
}));
