import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings as SettingsIcon, Languages, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../lib/store.ts';
import { actions } from '../lib/socket.ts';

function CheckRow({ label, detail, checked, onChange }: {
  label: string; detail: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="check-row" style={{ cursor: 'pointer', marginBottom: 8 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} role="switch" aria-checked={checked} />
      <span><strong>{label}</strong><small>{detail}</small></span>
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
    <main className="subpage">
      <button className="back-button" onClick={() => navigate('/hub')}><ArrowLeft /> Back to Game Hub</button>

      <section className="subpage-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span className="academy-emblem"><SettingsIcon /></span>
          <div>
            <span className="eyebrow">SETTINGS &amp; SAFETY</span>
            <h1>Your preferences.</h1>
            <p>Language, accessibility, and privacy — all stored on this device.</p>
          </div>
        </div>
      </section>

      <div className="training-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <article className="game-card" style={{ padding: 18 }}>
            <div className="card-header" style={{ height: 'auto', padding: '0 0 12px' }}><span><Languages size={13} style={{ verticalAlign: -2, marginRight: 6 }} />LANGUAGE / ቋንቋ</span></div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['en', 'am'] as const).map((lang) => (
                <button key={lang} onClick={() => updateSettings({ language: lang })} aria-pressed={settings.language === lang}
                  className={settings.language === lang ? 'primary-button' : 'secondary-button'} style={{ minHeight: 40, fontSize: 11 }}>
                  {lang === 'en' ? 'English' : 'አማርኛ'}
                </button>
              ))}
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 10, marginTop: 12, lineHeight: 1.5 }}>
              Amharic covers main navigation today; the dictionary is built to expand to the full question bank later.
            </p>
          </article>

          <article className="game-card" style={{ padding: 18 }}>
            <div className="card-header" style={{ height: 'auto', padding: '0 0 12px' }}><span>ACCESSIBILITY</span></div>
            <CheckRow label="Sound effects" detail="Play interface sounds (coming with the audio pass)" checked={settings.sound} onChange={(v) => updateSettings({ sound: v })} />
            <CheckRow label="Reduced motion" detail="Minimise animations across the whole game" checked={settings.reducedMotion} onChange={(v) => updateSettings({ reducedMotion: v })} />
            <CheckRow label="High contrast" detail="Darker backgrounds, stronger borders" checked={settings.highContrast} onChange={(v) => updateSettings({ highContrast: v })} />
            <CheckRow label="Larger text" detail="Increase text size across the interface" checked={settings.textLarge} onChange={(v) => updateSettings({ textLarge: v })} />
          </article>
        </div>

        <article className="game-card" style={{ padding: 18 }}>
          <div className="card-header" style={{ height: 'auto', padding: '0 0 12px' }}><span><ShieldCheck size={13} style={{ verticalAlign: -2, marginRight: 6 }} />PRIVACY &amp; DATA</span></div>
          <div className="privacy-note" style={{ marginBottom: 10 }}><ShieldCheck /><div>No real name, email, phone, school or location is ever collected.</div></div>
          <div className="privacy-note" style={{ marginBottom: 10 }}><ShieldCheck /><div>Your profile is a local ID on this device plus a display name you chose.</div></div>
          <div className="privacy-note" style={{ marginBottom: 10 }}><ShieldCheck /><div>Matches use preset team signals only — there is no open chat.</div></div>
          <div className="privacy-note" style={{ marginBottom: 16 }}><ShieldCheck /><div>Exact age and personal details are never shown publicly.</div></div>
          <button className="secondary-button" style={{ borderColor: 'rgba(255,112,95,.4)', color: '#ff9d90', width: '100%' }}
            onClick={() => setConfirmReset(true)} disabled={!profile}>
            Reset local data &amp; delete profile
          </button>
        </article>
      </div>

      {confirmReset && (
        <div className="modal-scrim" onClick={() => setConfirmReset(false)} role="dialog" aria-modal="true">
          <div className="profile-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setConfirmReset(false)} aria-label="Close"><X /></button>
            <div className="modal-heading" style={{ marginBottom: 14 }}><h2>Delete your local profile?</h2></div>
            <p style={{ color: '#c3d3e0', fontSize: 13, lineHeight: 1.55, marginBottom: 18 }}>
              This removes your player profile, unlocks and local settings from this device. Team records remain in the arena's history. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="secondary-button" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button className="primary-button" style={{ background: 'linear-gradient(#ff8574,#e5533f)', color: '#2a0a05' }}
                onClick={() => { actions.resetProfile(); localStorage.clear(); setConfirmReset(false); pushToast('Local data cleared.', 'success'); navigate('/'); }}>
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
