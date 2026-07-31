import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, LockKeyhole, BadgeCheck } from 'lucide-react';
import { CHARACTERS, CHARACTER_IDS } from '@mathcity/shared';
import { useApp } from '../lib/store.ts';
import { CharacterArt } from '../components/Art.tsx';

const COLORS = ['green', 'blue', 'pink', 'violet'] as const;

export default function Characters() {
  const profile = useApp((s) => s.profile);
  const navigate = useNavigate();
  const unlocked = new Set(profile?.unlockedCharacters ?? ['scout', 'archer']);

  return (
    <main className="subpage">
      <button className="back-button" onClick={() => navigate('/hub')}><ArrowLeft /> Back to Game Hub</button>

      <section className="subpage-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span className="academy-emblem"><Shield /></span>
          <div>
            <span className="eyebrow">THE KNOWLEDGE ROSTER</span>
            <h1>Character collection</h1>
            <p>Characters unlock permanently by learning mathematics — deploying one in a match still costs energy, mana and timing.</p>
          </div>
        </div>
        <div className="collection-count">
          <strong>{unlocked.size} / {CHARACTER_IDS.length}</strong>
          <span>unlocked</span>
        </div>
      </section>

      <div className="collection-grid" aria-label="Character collection">
        {CHARACTER_IDS.map((id, i) => {
          const def = CHARACTERS[id];
          const isUnlocked = unlocked.has(id);
          const color = def.tier === 'dragon' ? 'violet' : COLORS[i % COLORS.length];
          const best = profile?.trials?.[id]?.bestScore ?? 0;
          const mastery = isUnlocked ? 100 : Math.min(90, 30 + best * 12);
          return (
            <Link
              key={id}
              to={`/academy/${id}`}
              className={`character-card ${color} ${isUnlocked ? '' : 'locked'}`}
              aria-label={`${def.name} — ${isUnlocked ? 'unlocked' : 'locked'}`}
            >
              <div className="character-level">{isUnlocked ? 'UNLOCKED' : `${def.deployCost.energy}⚡`}</div>
              {isUnlocked
                ? <BadgeCheck className="lock-icon" style={{ background: 'rgba(57,217,154,.35)' }} />
                : <LockKeyhole className="lock-icon" />}
              <div className="character-portrait">
                <div style={{ position: 'relative', zIndex: 2 }}><CharacterArt id={id} size={132} locked={!isUnlocked} /></div>
                <div className="portrait-glow" />
              </div>
              <div className="character-info">
                <strong>{def.name}</strong>
                <small>{def.topics.slice(0, 2).join(' + ').replace(/_/g, ' ')}</small>
                <div className="mastery"><i style={{ width: `${mastery}%` }} /></div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="free-promise">
        <BadgeCheck />
        <div>
          <strong>100% free — every character, dragon and lesson.</strong>
          <p>Advanced mathematics is open to everyone. No payments, ever.</p>
        </div>
      </div>
    </main>
  );
}
