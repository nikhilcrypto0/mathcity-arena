import { Link } from 'react-router-dom';
import { CHARACTERS, CHARACTER_IDS } from '@mathcity/shared';
import { useApp } from '../lib/store.ts';
import { CharacterArt } from '../components/Art.tsx';
import { Badge, Button, Card, SectionTitle } from '../components/ui.tsx';

export default function Characters() {
  const profile = useApp((s) => s.profile);
  const unlocked = new Set(profile?.unlockedCharacters ?? ['scout', 'archer']);

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <SectionTitle className="text-2xl">Character Collection</SectionTitle>
        <p className="text-sm text-slate-400">
          Characters unlock permanently by learning mathematics — owning one still requires
          match resources, energy and timing to deploy.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CHARACTER_IDS.map((id) => {
          const def = CHARACTERS[id];
          const isUnlocked = unlocked.has(id);
          return (
            <Card key={id} className={def.tier === 'dragon' ? 'border-sunrise-500/30' : ''}>
              <div className="flex gap-3 mb-2">
                <div className={isUnlocked ? 'animate-float' : ''}>
                  <CharacterArt id={id} size={72} locked={!isUnlocked} />
                </div>
                <div className="min-w-0">
                  <p className="font-black truncate">{def.name}</p>
                  <p className="text-xs text-slate-400 italic mb-1">{def.title}</p>
                  <div className="flex flex-wrap gap-1">
                    {isUnlocked ? <Badge tone="green">Unlocked</Badge> : <Badge tone="slate">🔒 Locked</Badge>}
                    {def.tier === 'dragon' && <Badge tone="gold">Dragon</Badge>}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-300 mb-2">{def.description}</p>
              <p className="text-[11px] text-slate-400 mb-1">
                <span className="font-bold text-lake-300">Mathematics:</span> {def.topics.join(', ').replace(/_/g, ' ')}
              </p>
              <p className="text-[11px] text-slate-400 mb-2">
                <span className="font-bold text-lake-300">Abilities:</span> {def.abilities.join(' · ')}
              </p>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span>⚡{def.deployCost.energy} ✨{def.deployCost.mana} · ⚔{def.power} · ❤{def.health}</span>
                {def.maxPerMatch !== null && <span className="text-sunrise-300">{def.maxPerMatch}/match</span>}
              </div>
              {!isUnlocked && (
                <Link to={`/academy/${id}`} className="block mt-3">
                  <Button variant="gold" size="sm" className="w-full">
                    Unlock: master {def.topics[0].replace(/_/g, ' ')} →
                  </Button>
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
