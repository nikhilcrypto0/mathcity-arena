import type { Language } from '@mathcity/shared';

/**
 * Translation dictionary for major navigation labels.
 * English is complete; Amharic covers primary navigation and can be
 * expanded over time — unknown keys fall back to English.
 */
const DICT: Record<string, { en: string; am: string }> = {
  play_now: { en: 'Play Now', am: 'አሁን ተጫወት' },
  training_arena: { en: 'Training Academy', am: 'የሥልጠና አካዳሚ' },
  view_leaderboard: { en: 'View Leaderboard', am: 'ደረጃ ሰንጠረዥ ተመልከት' },
  leaderboard: { en: 'Leaderboard', am: 'ደረጃ ሰንጠረዥ' },
  home: { en: 'Home', am: 'መነሻ' },
  hub: { en: 'Game Hub', am: 'የጨዋታ ማዕከል' },
  characters: { en: 'Characters', am: 'ገጸ-ባህርያት' },
  team: { en: 'Team', am: 'ቡድን' },
  settings: { en: 'Settings', am: 'ቅንብሮች' },
  demo_mode: { en: 'Demo Mode', am: 'የማሳያ ሁነታ' },
  quick_match: { en: 'Quick Match', am: 'ፈጣን ጨዋታ' },
  ranked_match: { en: 'Ranked Match', am: 'የደረጃ ጨዋታ' },
  casual_match: { en: 'Casual Match', am: 'የመዝናኛ ጨዋታ' },
  friends_party: { en: 'Friends Party', am: 'የጓደኞች ቡድን' },
  solo_queue: { en: 'Solo Queue', am: 'ብቻ ተሰለፍ' },
  free_to_play: {
    en: '100% free — every lesson, character, dragon and ranked match. No payments, ever.',
    am: '100% ነጻ — ሁሉም ትምህርት፣ ገጸ-ባህርይ እና ጨዋታ። ክፍያ የለም።',
  },
  language: { en: 'Language', am: 'ቋንቋ' },
  profile: { en: 'Profile', am: 'መገለጫ' },
  season: { en: 'Season', am: 'ወቅት' },
  matches: { en: 'Matches', am: 'ጨዋታዎች' },
  wins: { en: 'Wins', am: 'ድሎች' },
  back: { en: 'Back', am: 'ተመለስ' },
};

export function t(key: string, language: Language): string {
  const entry = DICT[key];
  if (!entry) return key;
  return language === 'am' ? entry.am : entry.en;
}
