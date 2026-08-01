import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, Crown } from 'lucide-react';
import type { CharacterId } from '@mathcity/shared';
import { useApp } from '../lib/store.ts';
import { apiClient, type AcademyPathInfo } from '../lib/api.ts';
import { CharacterArt } from '../components/Art.tsx';

function PathList({ title, meta, paths }: { title: string; meta: string; paths: AcademyPathInfo[] }) {
  return (
    <article className="game-card learning-paths">
      <div className="card-header"><span>{title}</span><small>{meta}</small></div>
      {paths.map((p) => {
        const pct = p.unlocked ? 100
          : Math.min(95, Math.round((p.trialProgress.bestScore / p.trialQuestionCount) * 100));
        return (
          <Link key={p.characterId} to={`/academy/${p.characterId}`} className="path-row">
            <span><CharacterArt id={p.characterId as CharacterId} size={34} locked={!p.unlocked} /></span>
            <div>
              <strong>{p.character.name}</strong>
              <small>{p.path.title}</small>
              <i><em style={{ width: `${pct}%` }} /></i>
            </div>
            <b>{p.unlocked ? 'DONE' : `${p.trialProgress.bestScore}/${p.trialQuestionCount}`}</b>
            <ChevronRight />
          </Link>
        );
      })}
    </article>
  );
}

export default function Academy() {
  const profile = useApp((s) => s.profile);
  const navigate = useNavigate();
  const [paths, setPaths] = useState<AcademyPathInfo[]>([]);

  useEffect(() => {
    apiClient.academy(profile?.id).then((r) => setPaths(r.paths)).catch(() => {});
  }, [profile?.id, profile?.unlockedCharacters.length]);

  const core = paths.filter((p) => p.character.tier !== 'dragon');
  const dragons = paths.filter((p) => p.character.tier === 'dragon');
  const unlockedCount = paths.filter((p) => p.unlocked).length;

  return (
    <main className="subpage">
      <button className="back-button" onClick={() => navigate('/hub')}><ArrowLeft /> Back to Game Hub</button>

      <section className="subpage-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span className="academy-emblem"><BookOpen /></span>
          <div>
            <span className="eyebrow">TRAINING ACADEMY</span>
            <h1>Learn mathematics, unlock heroes.</h1>
            <p>Read the lesson, study the worked example, practice, then pass the trial to unlock a character — permanently and free. Advanced mathematics is open to everyone.</p>
          </div>
        </div>
        <div className="collection-count">
          <strong>{unlockedCount} / {paths.length || 10}</strong>
          <span>paths mastered</span>
        </div>
      </section>

      <div className="training-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        <PathList title="KNOWLEDGE PATHS" meta={`${core.filter((p) => p.unlocked).length}/${core.length}`} paths={core} />
        <div style={{ display: 'grid', gap: 18 }}>
          <PathList title="DRAGON TRIALS — ADVANCED MASTERY" meta={`${dragons.filter((p) => p.unlocked).length}/${dragons.length}`} paths={dragons} />
          <article className="game-card party-quick-card">
            <div className="party-live"><Crown /><span>MYTHIC PATH<strong>Three dragons await</strong></span></div>
            <p>Dragon trials need advanced answers solved in real matches. Master the core paths first, then claim the sky.</p>
            <Link to="/characters" style={{ textDecoration: 'none' }}><button><Crown /> View the roster <ChevronRight /></button></Link>
          </article>
        </div>
      </div>
    </main>
  );
}
