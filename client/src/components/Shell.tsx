import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Coins, Zap, Sparkles, Languages, ChevronRight, Menu,
  Gamepad2, Users, BookOpen, Medal, Swords, Trophy, Crown, CircleHelp, Settings,
} from 'lucide-react';
import { useApp } from '../lib/store.ts';

/** Fixed topbar: brand, real profile resources, language toggle, profile chip. */
function TopBar({ onMenu }: { onMenu: () => void }) {
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const lang = settings.language;

  const coins = profile ? profile.seasonPoints : 0;
  const wins = profile ? profile.stats.wins : 0;
  const unlocked = profile ? profile.unlockedCharacters.length : 0;

  return (
    <header className="topbar">
      <button className="mobile-menu icon-button" onClick={onMenu} aria-label="Open menu"><Menu /></button>
      <Link className="brand" to="/hub" aria-label="MathCity Arena home">
        <span className="brand-mark"><GraduationCap /></span>
        <span><strong>MATHCITY</strong><small>ARENA</small></span>
      </Link>
      <div className="top-resources">
        <span className="resource-pill" title="Season points"><Coins /><strong>{coins.toLocaleString()}</strong></span>
        <span className="resource-pill" title="Wins"><Zap /><strong>{wins}</strong></span>
        <span className="resource-pill" title="Characters unlocked"><Sparkles /><strong>{unlocked}</strong></span>
      </div>
      <button
        className="language-button"
        onClick={() => updateSettings({ language: lang === 'am' ? 'en' : 'am' })}
      >
        <Languages size={18} /> {lang === 'am' ? 'EN' : 'አማ'}
      </button>
      <Link className="profile-button" to="/setup" aria-label="Open player profile">
        <span className="avatar">{profile ? profile.name.charAt(0).toUpperCase() : '?'}</span>
        <span><strong>{profile ? profile.name : 'Guest'}</strong><small>{profile ? profile.mathLevel : 'explorer'}</small></span>
        <ChevronRight size={16} />
      </Link>
    </header>
  );
}

const NAV_ITEMS = [
  { to: '/hub', Icon: Gamepad2, label: 'Game Hub' },
  { to: '/party', Icon: Users, label: 'Online Party' },
  { to: '/academy', Icon: BookOpen, label: 'Training Academy' },
  { to: '/characters', Icon: Medal, label: 'Characters' },
  { to: '/demo', Icon: Gamepad2, label: 'All Game Modes' },
  { to: '/battle', Icon: Swords, label: 'Battle Arena' },
  { to: '/leaderboard', Icon: Trophy, label: 'Leaderboards' },
  { to: '/team', Icon: Medal, label: 'Team Profile' },
  { to: '/leaderboard', Icon: Crown, label: 'Private Tournament' },
] as const;

function SideNav({ open, close }: { open: boolean; close: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const seasonLabel = useApp((s) => s.seasonLabel);

  const teamPath = profile?.teamId ? `/team/${profile.teamId}` : '/leaderboard';
  const isActive = (to: string) => (to === '/hub' ? location.pathname === '/hub' : location.pathname.startsWith(to) && to !== '/leaderboard') || location.pathname === to;

  const goto = (to: string) => { navigate(to === '/team' ? teamPath : to); close(); };

  return (
    <>
      {open && <button className="nav-scrim" onClick={close} aria-label="Close menu" />}
      <aside className={`side-nav ${open ? 'open' : ''}`}>
        <div className="season-badge"><span>{seasonLabel || 'SEASON'}</span><strong>live</strong></div>
        <nav aria-label="Primary navigation">
          {NAV_ITEMS.map(({ to, Icon, label }) => (
            <button key={label} className={isActive(to === '/team' ? teamPath : to) ? 'active' : ''} onClick={() => goto(to)}>
              <Icon /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="nav-footer">
          <button onClick={() => goto('/academy')}><CircleHelp /><span>How to Play</span></button>
          <button onClick={() => goto('/settings')}><Settings /><span>Settings &amp; Safety</span></button>
        </div>
      </aside>
    </>
  );
}

/** Dashboard shell (topbar + left sidebar + page area) wrapping in-app screens. */
export default function Shell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="game-shell">
      <TopBar onMenu={() => setMenuOpen(true)} />
      <SideNav open={menuOpen} close={() => setMenuOpen(false)} />
      <div className="page-area">{children}</div>
    </div>
  );
}
