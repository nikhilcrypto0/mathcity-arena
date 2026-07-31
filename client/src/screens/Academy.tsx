import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CharacterId } from '@mathcity/shared';
import { useApp } from '../lib/store.ts';
import { apiClient, type AcademyPathInfo } from '../lib/api.ts';
import { CharacterArt } from '../components/Art.tsx';
import { Badge, Card, ProgressBar, SectionTitle } from '../components/ui.tsx';

export default function Academy() {
  const profile = useApp((s) => s.profile);
  const [paths, setPaths] = useState<AcademyPathInfo[]>([]);

  useEffect(() => {
    apiClient.academy(profile?.id).then((r) => setPaths(r.paths)).catch(() => {});
  }, [profile?.id, profile?.unlockedCharacters.length]);

  const core = paths.filter((p) => p.character.tier !== 'dragon');
  const dragons = paths.filter((p) => p.character.tier === 'dragon');

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <SectionTitle className="text-2xl">Training Academy</SectionTitle>
        <p className="text-sm text-slate-400 max-w-2xl">
          Every character guards a knowledge path: read the lesson, study the worked example,
          practice, then pass the trial to unlock the character — permanently, for free.
          Advanced mathematics is open to everyone, at any age.
        </p>
      </div>

      <PathGrid title="Knowledge paths" paths={core} />
      <PathGrid title="Dragon trials — advanced mastery" paths={dragons} gold />
    </div>
  );
}

function PathGrid({ title, paths, gold = false }: { title: string; paths: AcademyPathInfo[]; gold?: boolean }) {
  return (
    <div>
      <h3 className={`font-black uppercase tracking-wide text-sm mb-3 ${gold ? 'text-sunrise-400' : 'text-lake-300'}`}>{title}</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {paths.map((p) => (
          <Link key={p.characterId} to={`/academy/${p.characterId}`} className="block group">
            <Card className={`h-full transition-all group-hover:border-lake-400/60 ${p.unlocked ? '' : 'opacity-90'}`}>
              <div className="flex gap-3">
                <CharacterArt id={p.characterId as CharacterId} size={64} locked={!p.unlocked} />
                <div className="min-w-0 flex-1">
                  <p className="font-black truncate">{p.character.name}</p>
                  <p className="text-xs text-slate-400 mb-1">{p.path.title}</p>
                  {p.unlocked ? (
                    <Badge tone="green">Unlocked</Badge>
                  ) : (
                    <Badge tone={gold ? 'gold' : 'slate'}>
                      Trial: {p.passMark}/{p.trialQuestionCount} to pass
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={p.unlocked ? p.trialQuestionCount : p.trialProgress.bestScore}
                  max={p.trialQuestionCount}
                  color={p.unlocked ? 'var(--color-meadow-500)' : 'var(--color-sunrise-500)'}
                  label={`${p.character.name} trial progress`}
                  height={6}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {p.unlocked
                    ? 'Mastered — test it in the arena!'
                    : p.trialProgress.attempts > 0
                      ? `Best: ${p.trialProgress.bestScore}/${p.trialQuestionCount} · ${p.trialProgress.attempts} attempt${p.trialProgress.attempts === 1 ? '' : 's'} — retry freely`
                      : `Topics: ${p.character.topics.join(', ').replace(/_/g, ' ')}`}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
