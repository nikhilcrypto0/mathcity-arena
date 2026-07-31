import { useEffect, type ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './lib/store.ts';
import Shell from './components/Shell.tsx';
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
          className={`game-card px-4 py-3 text-sm font-bold text-left cursor-pointer ${
            toast.tone === 'error' ? 'text-ember-300'
            : toast.tone === 'success' ? 'text-meadow-300'
            : 'text-lake-300'
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}

/** In-app screens render inside the dashboard shell (topbar + sidebar). */
function Shelled({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}

export default function App() {
  const settings = useApp((s) => s.settings);
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('text-large', settings.textLarge);
  }, [settings]);

  return (
    <>
      <Routes>
        {/* Full-bleed screens: their own layouts, no shell */}
        <Route path="/" element={<Landing />} />
        <Route path="/battle" element={<Battle />} />
        <Route path="/demo" element={<Demo />} />
        {/* Dashboard-shell screens */}
        <Route path="/setup" element={<Shelled><PlayerSetup /></Shelled>} />
        <Route path="/hub" element={<Shelled><Hub /></Shelled>} />
        <Route path="/party" element={<Shelled><PartyLobby /></Shelled>} />
        <Route path="/academy" element={<Shelled><Academy /></Shelled>} />
        <Route path="/academy/:characterId" element={<Shelled><AcademyPath /></Shelled>} />
        <Route path="/characters" element={<Shelled><Characters /></Shelled>} />
        <Route path="/leaderboard" element={<Shelled><Leaderboard /></Shelled>} />
        <Route path="/team/:teamId" element={<Shelled><TeamProfile /></Shelled>} />
        <Route path="/settings" element={<Shelled><SettingsScreen /></Shelled>} />
      </Routes>
      <Toasts />
      {/* location referenced so the linter keeps the subscription for scroll-reset friendliness */}
      <span hidden data-path={location.pathname} />
    </>
  );
}
