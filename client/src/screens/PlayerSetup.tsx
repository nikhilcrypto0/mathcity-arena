import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MathLevel } from '@mathcity/shared';
import { AVATARS } from '@mathcity/shared';
import { useApp } from '../lib/store.ts';
import { actions } from '../lib/socket.ts';
import { Avatar } from '../components/Art.tsx';
import { Button, Card, SectionTitle } from '../components/ui.tsx';

const LEVELS: { id: MathLevel; label: string; detail: string }[] = [
  { id: 'explorer', label: 'Explorer', detail: 'Grade 6 comfort — starting the journey' },
  { id: 'builder', label: 'Builder', detail: 'Grade 7-8 comfort — ready for battles' },
  { id: 'champion', label: 'Champion', detail: 'Chasing advanced topics and dragons' },
];

export default function PlayerSetup() {
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const navigate = useNavigate();

  const [name, setName] = useState(profile?.name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? 'lion');
  const [level, setLevel] = useState<MathLevel>(profile?.mathLevel ?? 'explorer');
  const [saving, setSaving] = useState(false);

  // Navigate only once the server confirms the profile — avoids a race where
  // the hub's guard bounces us back before profile:update lands.
  useEffect(() => {
    if (saving && profile) navigate('/hub');
  }, [saving, profile, navigate]);

  const save = () => {
    if (name.trim().length < 2) return;
    actions.register({ name: name.trim(), avatar, mathLevel: level, language: settings.language });
    setSaving(true);
  };

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <SectionTitle className="mb-4">{profile ? 'Edit your player' : 'Create your player'}</SectionTitle>
      <Card className="space-y-6">
        <label className="block">
          <span className="text-sm font-bold text-slate-300">Display name (no real full names needed)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="e.g. LakeSolver12"
            className="w-full mt-1 px-4 py-3 rounded-xl bg-night-950 border border-night-600 focus:border-lake-400 text-white font-bold"
            autoComplete="off"
          />
        </label>

        <div>
          <span className="text-sm font-bold text-slate-300">Choose an avatar</span>
          <div className="flex flex-wrap gap-2 mt-2" role="radiogroup" aria-label="avatar options">
            {AVATARS.map((a) => (
              <button
                key={a}
                role="radio"
                aria-checked={avatar === a}
                aria-label={a}
                onClick={() => setAvatar(a)}
                className={`rounded-full p-1 transition-all cursor-pointer ${avatar === a ? 'ring-3 ring-sunrise-400 scale-110' : 'opacity-70 hover:opacity-100'}`}
              >
                <Avatar kind={a} size={52} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-bold text-slate-300">Preferred mathematics level</span>
          <div className="grid sm:grid-cols-3 gap-2 mt-2" role="radiogroup" aria-label="mathematics level">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                role="radio"
                aria-checked={level === l.id}
                onClick={() => setLevel(l.id)}
                className={`px-3 py-3 rounded-xl border text-left cursor-pointer transition-all ${
                  level === l.id ? 'border-lake-400 bg-lake-500/15' : 'border-night-600 hover:border-lake-500/40'
                }`}
              >
                <span className="font-black block">{l.label}</span>
                <span className="text-xs text-slate-400">{l.detail}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            This only sets your starting point — advanced mathematics is always open to everyone.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => updateSettings({ language: settings.language === 'en' ? 'am' : 'en' })}
            className="text-sm font-bold text-lake-300 cursor-pointer"
          >
            Language: {settings.language === 'en' ? 'English' : 'አማርኛ'} ↺
          </button>
          <Button variant="gold" size="lg" onClick={save} disabled={name.trim().length < 2}>
            {profile ? 'Save' : 'Enter MathCity →'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
