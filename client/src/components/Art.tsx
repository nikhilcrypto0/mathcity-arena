import type { CharacterId } from '@mathcity/shared';
import { CHARACTERS } from '@mathcity/shared';

/**
 * All artwork is original, generated from geometric SVG primitives —
 * no copyrighted images anywhere in the project.
 */

const AVATAR_COLORS: Record<string, [string, string]> = {
  lion: ['#f59e0b', '#7c2d12'],
  ibis: ['#f8fafc', '#0e7490'],
  hippo: ['#a78bfa', '#4c1d95'],
  fish: ['#22d3ee', '#164e63'],
  crane: ['#f472b6', '#831843'],
  monkey: ['#fb923c', '#7c2d12'],
  leopard: ['#fcd34d', '#78350f'],
  pelican: ['#94a3b8', '#1e293b'],
};

function avatarMotif(kind: string): JSX.Element {
  switch (kind) {
    case 'lion':
      return (
        <g>
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="32" y1="32" x2={32 + 26 * Math.cos((i * Math.PI) / 6)} y2={32 + 26 * Math.sin((i * Math.PI) / 6)} stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
          ))}
          <circle cx="32" cy="32" r="15" fill="currentColor" />
          <circle cx="26" cy="29" r="2.5" fill="#1c1917" />
          <circle cx="38" cy="29" r="2.5" fill="#1c1917" />
          <path d="M28 38 Q32 42 36 38" stroke="#1c1917" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'ibis':
      return (
        <g>
          <ellipse cx="30" cy="36" rx="16" ry="12" fill="currentColor" />
          <circle cx="40" cy="22" r="7" fill="currentColor" />
          <path d="M46 24 Q56 28 50 36" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="42" cy="20" r="2" fill="#1c1917" />
        </g>
      );
    case 'hippo':
      return (
        <g>
          <ellipse cx="32" cy="34" rx="19" ry="15" fill="currentColor" />
          <circle cx="22" cy="21" r="4.5" fill="currentColor" />
          <circle cx="42" cy="21" r="4.5" fill="currentColor" />
          <circle cx="25" cy="30" r="2.5" fill="#1c1917" />
          <circle cx="39" cy="30" r="2.5" fill="#1c1917" />
          <ellipse cx="32" cy="42" rx="9" ry="5" fill="#00000033" />
        </g>
      );
    case 'fish':
      return (
        <g>
          <ellipse cx="28" cy="32" rx="16" ry="10" fill="currentColor" />
          <path d="M42 32 L54 22 L54 42 Z" fill="currentColor" />
          <circle cx="20" cy="30" r="2.5" fill="#1c1917" />
          <path d="M24 26 Q30 22 36 26" stroke="#ffffff55" strokeWidth="2" fill="none" />
        </g>
      );
    case 'crane':
      return (
        <g>
          <ellipse cx="30" cy="40" rx="12" ry="9" fill="currentColor" />
          <path d="M34 34 Q38 18 44 16" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="45" cy="15" r="4.5" fill="currentColor" />
          <path d="M49 15 L56 17" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
          <circle cx="46" cy="13.5" r="1.8" fill="#1c1917" />
        </g>
      );
    case 'monkey':
      return (
        <g>
          <circle cx="32" cy="32" r="15" fill="currentColor" />
          <circle cx="17" cy="30" r="5.5" fill="currentColor" />
          <circle cx="47" cy="30" r="5.5" fill="currentColor" />
          <ellipse cx="32" cy="35" rx="9" ry="8" fill="#fde68a" />
          <circle cx="27" cy="28" r="2.5" fill="#1c1917" />
          <circle cx="37" cy="28" r="2.5" fill="#1c1917" />
          <path d="M28 38 Q32 41 36 38" stroke="#1c1917" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'leopard':
      return (
        <g>
          <circle cx="32" cy="32" r="16" fill="currentColor" />
          {[[22, 24], [42, 22], [24, 42], [44, 40], [32, 18], [18, 33], [46, 31]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.6" fill="#78350f" opacity="0.8" />
          ))}
          <circle cx="27" cy="31" r="2.5" fill="#1c1917" />
          <circle cx="37" cy="31" r="2.5" fill="#1c1917" />
        </g>
      );
    default: // pelican
      return (
        <g>
          <ellipse cx="28" cy="36" rx="14" ry="11" fill="currentColor" />
          <circle cx="42" cy="22" r="6.5" fill="currentColor" />
          <path d="M47 24 Q58 26 50 32 Q46 34 44 30 Z" fill="#f59e0b" />
          <circle cx="43" cy="20" r="2" fill="#1c1917" />
        </g>
      );
  }
}

export function Avatar({ kind, size = 48 }: { kind: string; size?: number }) {
  const [fg, bg] = AVATAR_COLORS[kind] ?? AVATAR_COLORS.lion;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${kind} avatar`}>
      <circle cx="32" cy="32" r="31" fill={bg} />
      <circle cx="32" cy="32" r="31" fill="none" stroke="#ffffff30" strokeWidth="2" />
      <g style={{ color: fg }}>{avatarMotif(kind)}</g>
    </svg>
  );
}

const EMBLEM_DEFS: Record<string, { bg: string; motif: JSX.Element }> = {
  blue_nile: {
    bg: '#0e7490',
    motif: (
      <g stroke="#67e8f9" strokeWidth="4" fill="none" strokeLinecap="round">
        <path d="M12 26 Q22 18 32 26 T52 26" />
        <path d="M12 38 Q22 30 32 38 T52 38" />
      </g>
    ),
  },
  lake_star: {
    bg: '#1e40af',
    motif: (
      <g>
        <path d="M32 12 L36.7 25.5 L51 25.5 L39.6 34 L44 48 L32 39.5 L20 48 L24.4 34 L13 25.5 L27.3 25.5 Z" fill="#fcd34d" />
        <path d="M14 50 Q23 44 32 50 T50 50" stroke="#67e8f9" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  bridge: {
    bg: '#7c2d12',
    motif: (
      <g stroke="#fdba74" strokeWidth="4" fill="none" strokeLinecap="round">
        <path d="M12 42 Q32 16 52 42" />
        <line x1="12" y1="42" x2="52" y2="42" />
        <line x1="22" y1="34" x2="22" y2="42" />
        <line x1="32" y1="29" x2="32" y2="42" />
        <line x1="42" y1="34" x2="42" y2="42" />
      </g>
    ),
  },
  sunrise: {
    bg: '#9a3412',
    motif: (
      <g>
        <circle cx="32" cy="38" r="12" fill="#fcd34d" />
        {Array.from({ length: 7 }, (_, i) => {
          const a = Math.PI + (i * Math.PI) / 6;
          return <line key={i} x1={32 + 16 * Math.cos(a)} y1={38 + 16 * Math.sin(a)} x2={32 + 24 * Math.cos(a)} y2={38 + 24 * Math.sin(a)} stroke="#fcd34d" strokeWidth="3.5" strokeLinecap="round" />;
        })}
        <rect x="10" y="40" width="44" height="12" fill="#7c2d12" />
      </g>
    ),
  },
  papyrus: {
    bg: '#14532d',
    motif: (
      <g stroke="#86efac" strokeWidth="3.5" fill="none" strokeLinecap="round">
        <line x1="32" y1="52" x2="32" y2="28" />
        {Array.from({ length: 7 }, (_, i) => {
          const a = -Math.PI / 2 + (i - 3) * 0.4;
          return <line key={i} x1="32" y1="28" x2={32 + 16 * Math.cos(a)} y2={28 + 16 * Math.sin(a)} />;
        })}
      </g>
    ),
  },
  mountain: {
    bg: '#334155',
    motif: (
      <g>
        <path d="M10 48 L28 18 L38 34 L46 24 L56 48 Z" fill="#94a3b8" />
        <path d="M28 18 L33 27 L28 30 L24 25 Z" fill="#f1f5f9" />
      </g>
    ),
  },
  lightning: {
    bg: '#3b0764',
    motif: <path d="M36 10 L20 36 L30 36 L26 54 L46 28 L34 28 Z" fill="#fcd34d" />,
  },
  falls: {
    bg: '#155e75',
    motif: (
      <g>
        <rect x="14" y="14" width="36" height="8" rx="3" fill="#67e8f9" />
        {[20, 28, 36, 44].map((x, i) => (
          <path key={i} d={`M${x} 22 Q${x - 2} 36 ${x} 50`} stroke="#a5f3fc" strokeWidth="4" fill="none" strokeLinecap="round" opacity={0.9 - i * 0.1} />
        ))}
      </g>
    ),
  },
};

export function Emblem({ kind, size = 48 }: { kind: string; size?: number }) {
  const def = EMBLEM_DEFS[kind] ?? EMBLEM_DEFS.blue_nile;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${kind.replace('_', ' ')} team emblem`}>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={def.bg} />
      <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="#ffffff2e" strokeWidth="2.5" />
      {def.motif}
    </svg>
  );
}

function characterMotif(id: CharacterId): JSX.Element {
  switch (id) {
    case 'scout':
      return (
        <g>
          <circle cx="40" cy="40" r="17" fill="none" stroke="currentColor" strokeWidth="4.5" />
          <line x1="52" y1="52" x2="64" y2="64" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          <circle cx="40" cy="40" r="6" fill="currentColor" />
        </g>
      );
    case 'archer':
      return (
        <g stroke="currentColor" fill="none" strokeLinecap="round">
          <path d="M28 16 Q56 40 28 64" strokeWidth="5" />
          <line x1="28" y1="16" x2="28" y2="64" strokeWidth="3" />
          <line x1="28" y1="40" x2="62" y2="40" strokeWidth="4" />
          <path d="M62 40 L52 34 M62 40 L52 46" strokeWidth="4" />
        </g>
      );
    case 'guardian':
      return (
        <g>
          <path d="M40 14 L60 22 L60 42 Q60 58 40 66 Q20 58 20 42 L20 22 Z" fill="currentColor" opacity="0.9" />
          <path d="M40 24 L52 29 L52 42 Q52 52 40 57 Q28 52 28 42 L28 29 Z" fill="#0a1428" />
          <text x="40" y="47" textAnchor="middle" fontSize="18" fontWeight="900" fill="currentColor">=</text>
        </g>
      );
    case 'giant':
      return (
        <g>
          <path d="M14 62 L34 22 L44 40 L52 28 L66 62 Z" fill="currentColor" />
          <rect x="30" y="50" width="20" height="6" rx="3" fill="#0a1428" />
          <rect x="34" y="58" width="12" height="5" rx="2.5" fill="#0a1428" />
        </g>
      );
    case 'engineer':
      return (
        <g stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round">
          {[24, 40, 56].map((p) => <line key={`v${p}`} x1={p} y1="18" x2={p} y2="62" opacity="0.6" />)}
          {[26, 40, 54].map((p) => <line key={`h${p}`} x1="16" y1={p} x2="64" y2={p} opacity="0.6" />)}
          <circle cx="40" cy="40" r="8" fill="currentColor" />
          <circle cx="56" cy="26" r="4" fill="currentColor" />
        </g>
      );
    case 'healer':
      return (
        <g>
          <path d="M40 64 Q16 48 16 32 Q16 18 28 18 Q36 18 40 28 Q44 18 52 18 Q64 18 64 32 Q64 48 40 64 Z" fill="currentColor" opacity="0.9" />
          <rect x="36" y="28" width="8" height="24" rx="2" fill="#0a1428" />
          <rect x="28" y="36" width="24" height="8" rx="2" fill="#0a1428" />
        </g>
      );
    case 'necromancer':
      return (
        <g stroke="currentColor" fill="none" strokeLinecap="round">
          <path d="M40 40 m0 -3 a3 3 0 1 1 -3 3 a6 6 0 1 1 6 -6 a9 9 0 1 1 -9 9 a12 12 0 1 1 12 -12 a15 15 0 1 1 -15 15 a18 18 0 1 1 18 -18" strokeWidth="4" />
          <circle cx="40" cy="40" r="2.5" fill="currentColor" />
        </g>
      );
    case 'dragon_standard':
    case 'dragon_elite':
    case 'dragon_mythic': {
      return (
        <g>
          <path d="M18 52 Q14 30 30 22 Q26 32 34 34 Q30 14 48 12 Q42 20 46 26 Q52 16 64 20 Q54 24 54 32 Q64 32 66 44 Q56 38 50 42 Q60 50 52 62 Q48 50 40 50 Q44 60 34 64 Q34 54 28 52 Q30 60 20 62 Q24 54 18 52 Z" fill="currentColor" />
          <circle cx="44" cy="30" r="3" fill="#0a1428" />
        </g>
      );
    }
  }
}

export function CharacterArt({ id, size = 80, locked = false }: { id: CharacterId; size?: number; locked?: boolean }) {
  const def = CHARACTERS[id];
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" role="img" aria-label={`${def.name} character art`}>
      <defs>
        <radialGradient id={`grad_${id}`} cx="50%" cy="35%">
          <stop offset="0%" stopColor={def.color} stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0a1428" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="76" height="76" rx="16" fill={`url(#grad_${id})`} />
      <rect x="2" y="2" width="76" height="76" rx="16" fill="none" stroke={locked ? '#47556955' : `${def.color}66`} strokeWidth="2.5" />
      <g style={{ color: locked ? '#475569' : def.color }} opacity={locked ? 0.5 : 1}>
        {characterMotif(id)}
      </g>
      {def.tier === 'dragon' && !locked && (
        <circle cx="40" cy="40" r="36" fill="none" stroke={def.color} strokeWidth="1.5" opacity="0.5" strokeDasharray="4 6" />
      )}
      {locked && (
        <g>
          <rect x="30" y="34" width="20" height="16" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <path d="M34 34 v-5 a6 6 0 0 1 12 0 v5" fill="none" stroke="#64748b" strokeWidth="2.5" />
        </g>
      )}
    </svg>
  );
}
