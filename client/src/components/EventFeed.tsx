import { useEffect, useRef } from 'react';
import type { MatchEvent } from '@mathcity/shared';

const TONE_COLORS: Record<MatchEvent['tone'], string> = {
  info: 'text-slate-300',
  success: 'text-meadow-400',
  danger: 'text-ember-400',
  warning: 'text-sunrise-300',
  crisis: 'text-lake-300',
};

const ICON_EMOJI: Record<string, string> = {
  flag: '🚩', clock: '⏱️', swords: '⚔️', shield: '🛡️', 'shield-check': '🛡️',
  skull: '💀', crown: '👑', flame: '🐉', sparkles: '✨', crosshair: '🎯',
  waves: '🌊', sun: '☀️', activity: '📉', zap: '⚡', bridge: '🌉', box: '📦',
  users: '👥', truck: '🚚', 'trending-up': '📈', droplet: '💧',
  'cloud-lightning': '⛈️', wall: '🧱', tower: '🏰', heart: '💚', academy: '🏛️',
  tree: '🌳', home: '🏠',
};

export function EventFeed({ events, compact = false }: { events: MatchEvent[]; compact?: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [events.length]);

  return (
    <div
      className={`mc-card overflow-y-auto mc-scroll ${compact ? 'h-32' : 'h-44'} px-3 py-2`}
      role="log"
      aria-label="live match events"
      aria-live="polite"
    >
      <ul className="space-y-1">
        {events.map((e) => (
          <li key={e.id} className={`text-xs font-semibold animate-ticker ${TONE_COLORS[e.tone]}`}>
            <span className="mr-1" aria-hidden>{ICON_EMOJI[e.icon] ?? '•'}</span>
            {e.text}
          </li>
        ))}
      </ul>
      <div ref={endRef} />
    </div>
  );
}
