import { Link } from 'react-router-dom';
import { GraduationCap, Trophy, PlayCircle, Sparkles } from 'lucide-react';
import { useApp } from '../lib/store.ts';
import { t } from '../lib/i18n.ts';
import { Button } from '../components/ui.tsx';
import { CharacterArt } from '../components/Art.tsx';

function CitySkyline() {
  // Original animated skyline: lake, bridge, modern towers, sun — pure SVG.
  return (
    <svg viewBox="0 0 900 260" className="w-full max-w-4xl mx-auto" role="img" aria-label="A modern lakeside city skyline at sunrise">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1428" />
          <stop offset="100%" stopColor="#134e6a" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e7490" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>
      </defs>
      <rect width="900" height="200" fill="url(#sky)" />
      <circle cx="700" cy="90" r="34" fill="#fbbf24" opacity="0.9" />
      <circle cx="700" cy="90" r="48" fill="#fbbf24" opacity="0.15" className="animate-pulse" />
      {/* towers */}
      {[
        [80, 90, 46], [140, 60, 56], [210, 110, 40], [270, 75, 52], [340, 50, 62],
        [420, 95, 44], [480, 70, 58], [560, 105, 40], [620, 80, 50],
      ].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={200 - y} width={w} height={y} rx="4" fill={i % 2 ? '#1a2d52' : '#263c68'} />
          {Array.from({ length: Math.floor(y / 22) }, (_, r) => (
            <rect key={r} x={x + 6} y={200 - y + 8 + r * 20} width={w - 12} height="6" rx="2" fill="#67e8f9" opacity={0.25 + ((i + r) % 3) * 0.2} />
          ))}
        </g>
      ))}
      {/* solar panels + wind */}
      <g transform="translate(760 150)">
        <rect x="0" y="30" width="60" height="20" rx="3" fill="#1e3a8a" />
        {[4, 24, 44].map((x) => <rect key={x} x={x} y="33" width="14" height="14" rx="2" fill="#38bdf8" opacity="0.8" />)}
      </g>
      {/* bridge over water */}
      <rect y="200" width="900" height="60" fill="url(#water)" />
      <path d="M180 214 Q450 150 720 214" stroke="#fcd34d" strokeWidth="5" fill="none" />
      <line x1="180" y1="214" x2="720" y2="214" stroke="#f59e0b" strokeWidth="4" />
      {[260, 340, 420, 500, 580, 660].map((x) => {
        const yTop = 214 - (1 - Math.abs(x - 450) / 270) * 56;
        return <line key={x} x1={x} y1={yTop} x2={x} y2="214" stroke="#fcd34d" strokeWidth="2.5" />;
      })}
      {/* reflections */}
      {[220, 380, 540, 700].map((x, i) => (
        <path key={i} d={`M${x} 226 q14 6 28 0 q-14 8 -28 0`} fill="#67e8f9" opacity="0.35" />
      ))}
    </svg>
  );
}

export default function Landing() {
  const lang = useApp((s) => s.settings.language);
  const updateSettings = useApp((s) => s.updateSettings);
  const profile = useApp((s) => s.profile);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="w-10 h-10 rounded-xl bg-nile-500 flex items-center justify-center font-black text-white text-2xl">Σ</span>
          <span className="font-black text-xl tracking-tight">MathCity <span className="text-lake-400">Arena</span></span>
        </div>
        <button
          onClick={() => updateSettings({ language: lang === 'en' ? 'am' : 'en' })}
          className="px-3 py-1.5 rounded-lg border border-lake-500/40 text-sm font-bold text-lake-300 hover:bg-lake-500/10 cursor-pointer"
          aria-label="toggle language"
        >
          {lang === 'en' ? 'አማርኛ' : 'English'}
        </button>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-10">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-3 animate-slide-up">
          Study mathematics.<br />
          <span className="text-lake-400">Build your team.</span>{' '}
          <span className="text-sunrise-400">Rule the arena.</span>
        </h1>
        <p className="text-slate-300 max-w-2xl mb-6 animate-slide-up">
          A free multiplayer mathematics strategy game. Learn concepts, unlock fantasy characters,
          survive city crises, battle rival districts, earn MVP awards and climb the seasonal rankings.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-8 animate-slide-up">
          <Link to={profile ? '/hub' : '/setup'}>
            <Button variant="gold" size="lg">▶ {t('play_now', lang)}</Button>
          </Link>
          <Link to="/academy">
            <Button variant="secondary" size="lg"><GraduationCap className="inline w-5 h-5 mr-1" aria-hidden /> {t('training_arena', lang)}</Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="secondary" size="lg"><Trophy className="inline w-5 h-5 mr-1" aria-hidden /> {t('view_leaderboard', lang)}</Button>
          </Link>
          <Link to="/demo">
            <Button variant="primary" size="lg"><PlayCircle className="inline w-5 h-5 mr-1" aria-hidden /> {t('demo_mode', lang)}</Button>
          </Link>
        </div>

        <CitySkyline />

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {(['scout', 'archer', 'guardian', 'giant', 'dragon_standard'] as const).map((id, i) => (
            <div key={id} className="animate-float" style={{ animationDelay: `${i * 0.35}s` }}>
              <CharacterArt id={id} size={68} />
            </div>
          ))}
        </div>

        <p className="mt-8 flex items-center gap-2 text-sm text-meadow-400 font-bold bg-meadow-500/10 border border-meadow-500/30 rounded-full px-4 py-2">
          <Sparkles className="w-4 h-4" aria-hidden /> {t('free_to_play', lang)}
        </p>
      </section>
    </div>
  );
}
