import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Home, GraduationCap, Trophy, Users, Settings as SettingsIcon, Swords, PlayCircle } from 'lucide-react';
import { useApp } from './lib/store.ts';
import { t } from './lib/i18n.ts';
import { Avatar } from './components/Art.tsx';
import Landing from './screens/Landing.tsx';
import PlayerSetup from './screens/PlayerSetup.tsx';
import Hub from './screens/Hub.tsx';
import PartyLobby from './screens/PartyLobby.tsx';
import Battle from './screens/Battle.tsx';
import Academy from './screens/Academy.tsx';
import AcademyPath from './screens/AcademyPath.tsx';
import Characters from './screens/Characters.tsx';
import Leaderboard from './screens/Leaderboard.tsx';
import TeamProfile from './screens/TeamProfile.tsx';
import SettingsScreen from './screens/Settings.tsx';
import Demo from './screens/Demo.tsx';

function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className={`mc-card px-4 py-3 text-sm font-bold text-left animate-slide-up cursor-pointer ${
            toast.tone === 'error' ? 'border-ember-500/60 text-ember-300'
            : toast.tone === 'success' ? 'border-meadow-500/60 text-meadow-300'
            : 'text-lake-300'
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}

function Nav() {
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const lang = settings.language;
  const location = useLocation();

  const links = [
    { to: '/hub', label: t('hub', lang), icon: Home },
    { to: '/academy', label: t('training_arena', lang), icon: GraduationCap },
    { to: '/characters', label: t('characters', lang), icon: Swords },
    { to: '/leaderboard', label: t('leaderboard', lang), icon: Trophy },
    { to: '/party', label: t('friends_party', lang), icon: Users },
    { to: '/settings', label: t('settings', lang), icon: SettingsIcon },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-night-950/85 backdrop-blur border-b border-lake-500/15" aria-label="main navigation">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-14">
        <Link to="/" className="flex items-center gap-2 mr-3 shrink-0" aria-label="MathCity Arena home">
          <span className="w-8 h-8 rounded-lg bg-nile-500 flex items-center justify-center font-black text-white text-lg">Σ</span>
          <span className="font-black tracking-tight hidden md:inline">MathCity <span className="text-lake-400">Arena</span></span>
        </Link>
        <div className="flex items-center gap-0.5 overflow-x-auto mc-scroll">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                location.pathname.startsWith(to)
                  ? 'bg-lake-500/20 text-lake-300'
                  : 'text-slate-400 hover:text-white hover:bg-night-700/60'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden /> <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Link
            to="/demo"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-sunrise-500/15 text-sunrise-300 border border-sunrise-500/40 hover:bg-sunrise-500/25"
          >
            <PlayCircle className="w-4 h-4" aria-hidden /> <span className="hidden sm:inline">{t('demo_mode', lang)}</span>
          </Link>
          {profile ? (
            <Link to="/setup" className="flex items-center gap-2" aria-label="edit profile">
              <Avatar kind={profile.avatar} size={32} />
              <span className="text-sm font-bold hidden lg:inline">{profile.name}</span>
            </Link>
          ) : (
            <Link to="/setup" className="text-sm font-bold text-lake-300">{t('play_now', lang)}</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const settings = useApp((s) => s.settings);
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', settings.reducedMotion);
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('text-large', settings.textLarge);
  }, [settings]);

  const fullBleed = location.pathname === '/' || location.pathname.startsWith('/battle') || location.pathname.startsWith('/demo');

  return (
    <div className="min-h-full flex flex-col">
      {location.pathname !== '/' && <Nav />}
      <main className={fullBleed ? 'flex-1' : 'flex-1 max-w-7xl w-full mx-auto px-4 py-6'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/setup" element={<PlayerSetup />} />
          <Route path="/hub" element={<Hub />} />
          <Route path="/party" element={<PartyLobby />} />
          <Route path="/battle" element={<Battle />} />
          <Route path="/academy" element={<Academy />} />
          <Route path="/academy/:characterId" element={<AcademyPath />} />
          <Route path="/characters" element={<Characters />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/team/:teamId" element={<TeamProfile />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </main>
      <Toasts />
    </div>
  );
}
