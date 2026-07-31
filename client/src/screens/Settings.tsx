import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../lib/store.ts';
import { actions } from '../lib/socket.ts';
import { Button, Card, Modal, SectionTitle } from '../components/ui.tsx';

function Toggle({ label, detail, checked, onChange }: {
  label: string; detail: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 border-b border-night-700 last:border-0 cursor-pointer">
      <span>
        <span className="block font-bold">{label}</span>
        <span className="block text-xs text-slate-400">{detail}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-11 h-6 accent-cyan-500 cursor-pointer"
        role="switch"
        aria-checked={checked}
      />
    </label>
  );
}

export default function SettingsScreen() {
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const profile = useApp((s) => s.profile);
  const pushToast = useApp((s) => s.pushToast);
  const [confirmReset, setConfirmReset] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="max-w-xl mx-auto space-y-4 animate-slide-up">
      <SectionTitle className="text-2xl">Settings</SectionTitle>

      <Card>
        <h3 className="font-black text-lake-300 uppercase text-sm mb-1">Language / ቋንቋ</h3>
        <div className="flex gap-2 mt-2">
          {(['en', 'am'] as const).map((lang) => (
            <Button
              key={lang}
              variant={settings.language === lang ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => updateSettings({ language: lang })}
              aria-pressed={settings.language === lang}
            >
              {lang === 'en' ? 'English' : 'አማርኛ (Amharic)'}
            </Button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Amharic covers main navigation today; the translation dictionary is built to expand,
          including the question bank later.
        </p>
      </Card>

      <Card>
        <h3 className="font-black text-lake-300 uppercase text-sm mb-1">Accessibility</h3>
        <Toggle
          label="Sound effects"
          detail="Play interface sounds (coming with the audio pass)"
          checked={settings.sound}
          onChange={(v) => updateSettings({ sound: v })}
        />
        <Toggle
          label="Reduced motion"
          detail="Minimise animations across the whole game"
          checked={settings.reducedMotion}
          onChange={(v) => updateSettings({ reducedMotion: v })}
        />
        <Toggle
          label="High contrast"
          detail="Darker backgrounds, stronger borders"
          checked={settings.highContrast}
          onChange={(v) => updateSettings({ highContrast: v })}
        />
        <Toggle
          label="Larger text"
          detail="Increase text size across the interface"
          checked={settings.textLarge}
          onChange={(v) => updateSettings({ textLarge: v })}
        />
      </Card>

      <Card>
        <h3 className="font-black text-lake-300 uppercase text-sm mb-2">Privacy & data</h3>
        <ul className="text-xs text-slate-400 space-y-1 mb-4">
          <li>• No real name, email, phone, school or location is ever collected.</li>
          <li>• Your profile is a local ID on this device plus a display name you chose.</li>
          <li>• Matches use preset team signals only — no open chat.</li>
          <li>• Exact age and personal details are never shown publicly.</li>
        </ul>
        <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)} disabled={!profile}>
          Reset local data & delete profile
        </Button>
      </Card>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)}>
        <p className="font-black text-lg mb-2">Delete your local profile?</p>
        <p className="text-sm text-slate-300 mb-4">
          This removes your player profile, unlocks and local settings from this device. Team
          records remain in the arena's history. This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              actions.resetProfile();
              localStorage.clear();
              setConfirmReset(false);
              pushToast('Local data cleared.', 'success');
              navigate('/');
            }}
          >
            Delete everything
          </Button>
        </div>
      </Modal>
    </div>
  );
}
