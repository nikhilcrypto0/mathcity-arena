import type { ReactNode, ButtonHTMLAttributes } from 'react';

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variants: Record<string, string> = {
    primary: 'bg-nile-500 hover:bg-nile-400 text-white shadow-lg shadow-nile-600/30',
    secondary: 'bg-night-700 hover:bg-night-600 text-lake-300 border border-lake-500/30',
    gold: 'bg-sunrise-500 hover:bg-sunrise-400 text-night-950 shadow-lg shadow-sunrise-500/30',
    danger: 'bg-ember-500 hover:bg-ember-400 text-white',
    ghost: 'bg-transparent hover:bg-night-700/60 text-slate-300',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-5 py-2.5 rounded-xl',
    lg: 'px-8 py-3.5 text-lg rounded-2xl',
  };
  return (
    <button
      className={`font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '', glow = false }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`mc-card p-4 ${glow ? 'animate-pulse-glow' : ''} ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`text-xl font-black tracking-wide text-lake-300 uppercase ${className}`}>{children}</h2>
  );
}

export function Stat({ label, value, accent = false }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-night-900/60 min-w-16">
      <span className={`text-lg font-black ${accent ? 'text-sunrise-400' : 'text-white'}`}>{value}</span>
      <span className="text-[11px] uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
}

export function Badge({ children, tone = 'lake' }: { children: ReactNode; tone?: 'lake' | 'gold' | 'green' | 'red' | 'slate' }) {
  const tones: Record<string, string> = {
    lake: 'bg-lake-500/15 text-lake-300 border-lake-500/40',
    gold: 'bg-sunrise-500/15 text-sunrise-300 border-sunrise-500/40',
    green: 'bg-meadow-500/15 text-meadow-400 border-meadow-500/40',
    red: 'bg-ember-500/15 text-ember-400 border-ember-500/40',
    slate: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ProgressBar({
  value, max, color = 'var(--color-meadow-500)', label, height = 10,
}: { value: number; max: number; color?: string; label?: string; height?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div aria-label={label} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={Math.round(max)}>
      <div className="w-full rounded-full bg-night-900/80 overflow-hidden" style={{ height }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function Modal({ open, onClose, children, wide = false }: {
  open: boolean; onClose?: () => void; children: ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`mc-card p-6 w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto mc-scroll animate-pop`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function Countdown({ endsAt, className = '' }: { endsAt: number; className?: string }) {
  const remaining = Math.max(0, endsAt - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return (
    <span className={`font-mono font-black tabular-nums ${totalSeconds <= 10 ? 'text-ember-400' : ''} ${className}`}>
      {minutes}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
