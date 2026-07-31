import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CharacterId, ClientQuestion, SubmittedAnswer } from '@mathcity/shared';
import { ArrowLeft, BookOpen, PencilRuler, Swords, CheckCircle2 } from 'lucide-react';
import { useApp } from '../lib/store.ts';
import { actions } from '../lib/socket.ts';
import { apiClient, type AcademyPathInfo } from '../lib/api.ts';
import { CharacterArt } from '../components/Art.tsx';
import { Badge, Button, Card, SectionTitle } from '../components/ui.tsx';
import { QuestionCard } from '../components/QuestionCard.tsx';

type Stage = 'lesson' | 'example' | 'guided' | 'independent' | 'trial';

export default function AcademyPath() {
  const { characterId } = useParams<{ characterId: string }>();
  const profile = useApp((s) => s.profile);
  const trial = useApp((s) => s.trial);
  const trialResult = useApp((s) => s.trialResult);
  const set = useApp((s) => s.set);
  const [info, setInfo] = useState<AcademyPathInfo | null>(null);
  const [stage, setStage] = useState<Stage>('lesson');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const practiceResult = useApp((s) => s.practiceResult);
  const setPracticeResult = (value: null) => set({ practiceResult: value });
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialAnswers, setTrialAnswers] = useState<{ questionId: string; answer: SubmittedAnswer }[]>([]);

  useEffect(() => {
    apiClient.academy(profile?.id).then((r) => {
      setInfo(r.paths.find((p) => p.characterId === characterId) ?? null);
    }).catch(() => {});
  }, [characterId, profile?.id, profile?.unlockedCharacters.length, trialResult]);

  const guided = useMemo(() => info?.training.slice(0, 3) ?? [], [info]);
  const independent = useMemo(() => info?.training.slice(3, 6) ?? [], [info]);

  if (!info) return <p className="text-center py-20 text-slate-400 font-bold">Loading path…</p>;

  const practiceSet = stage === 'guided' ? guided : independent;
  const currentPractice: ClientQuestion | null = practiceSet[practiceIndex] ?? null;

  const stages: { id: Stage; label: string; icon: typeof BookOpen }[] = [
    { id: 'lesson', label: 'Lesson', icon: BookOpen },
    { id: 'example', label: 'Worked example', icon: PencilRuler },
    { id: 'guided', label: 'Guided practice', icon: PencilRuler },
    { id: 'independent', label: 'Independent', icon: PencilRuler },
    { id: 'trial', label: 'Character trial', icon: Swords },
  ];

  const submitPractice = (questionId: string, answer: SubmittedAnswer) => {
    actions.practiceAnswer(questionId, answer);
  };

  const startTrial = () => {
    setTrialIndex(0);
    setTrialAnswers([]);
    set({ trialResult: null });
    actions.trialQuestions(info.characterId as CharacterId);
    setStage('trial');
  };

  const trialQuestions = trial?.characterId === info.characterId ? trial.questions : [];
  const currentTrialQ = trialQuestions[trialIndex] ?? null;

  const submitTrialAnswer = (questionId: string, answer: SubmittedAnswer) => {
    const collected = [...trialAnswers, { questionId, answer }];
    setTrialAnswers(collected);
    if (trialIndex + 1 < trialQuestions.length) {
      setTrialIndex(trialIndex + 1);
    } else {
      actions.trialSubmit(info.characterId as CharacterId, collected);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-slide-up">
      <Link to="/academy" className="inline-flex items-center gap-1 text-sm font-bold text-lake-300">
        <ArrowLeft className="w-4 h-4" aria-hidden /> All paths
      </Link>

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <CharacterArt id={info.characterId as CharacterId} size={84} locked={!info.unlocked} />
          <div className="flex-1 min-w-52">
            <SectionTitle>{info.character.name}</SectionTitle>
            <p className="text-sm text-slate-400 italic mb-1">{info.character.title} — {info.path.title}</p>
            <p className="text-xs text-slate-300 mb-2">{info.character.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {info.character.abilities.slice(0, 4).map((a) => <Badge key={a} tone="lake">{a}</Badge>)}
            </div>
          </div>
          {info.unlocked && <Badge tone="green">✓ Unlocked</Badge>}
        </div>
      </Card>

      {/* Stage tabs */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="learning stages">
        {stages.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={stage === s.id}
            onClick={() => {
              if (s.id === 'trial') startTrial();
              else { setStage(s.id); setPracticeIndex(0); setPracticeResult(null); }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-black cursor-pointer transition-all ${
              stage === s.id ? 'bg-lake-500/25 text-lake-300 ring-1 ring-lake-400' : 'bg-night-800/70 text-slate-400 hover:text-white'
            }`}
          >
            <s.icon className="w-4 h-4" aria-hidden /> {s.label}
          </button>
        ))}
      </div>

      {stage === 'lesson' && (
        <Card className="space-y-3">
          {info.path.lesson.map((p, i) => (
            <p key={i} className="text-sm text-slate-200 leading-relaxed">
              <span className="font-black text-lake-400 mr-2">{i + 1}.</span>{p}
            </p>
          ))}
          <Button variant="primary" onClick={() => setStage('example')}>Next: worked example →</Button>
        </Card>
      )}

      {stage === 'example' && (
        <Card className="space-y-3">
          <p className="font-black text-white">{info.path.workedExample.problem}</p>
          {info.path.workedExample.steps.map((s, i) => (
            <p key={i} className="text-sm text-slate-300 pl-4 border-l-2 border-lake-500/40">{s}</p>
          ))}
          <p className="font-black text-meadow-400">Answer: {info.path.workedExample.answer}</p>
          <Button variant="primary" onClick={() => { setStage('guided'); setPracticeIndex(0); setPracticeResult(null); }}>
            Try guided practice →
          </Button>
        </Card>
      )}

      {(stage === 'guided' || stage === 'independent') && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-slate-300">
              {stage === 'guided' ? 'Guided practice (hints open)' : 'Independent practice'} — question {Math.min(practiceIndex + 1, practiceSet.length)} of {practiceSet.length}
            </p>
            <Badge tone="slate">practice only — no ranked effect</Badge>
          </div>
          {practiceIndex < practiceSet.length ? (
            <QuestionCard
              question={practiceResult ? null : currentPractice}
              result={practiceResult}
              onSubmit={submitPractice}
              onNext={() => { setPracticeResult(null); setPracticeIndex(practiceIndex + 1); }}
              nextLabel={practiceIndex + 1 < practiceSet.length ? 'Next question' : 'Finish practice'}
            />
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 className="w-10 h-10 text-meadow-400 mx-auto mb-2" aria-hidden />
              <p className="font-black mb-3">Practice complete!</p>
              {stage === 'guided' ? (
                <Button variant="primary" onClick={() => { setStage('independent'); setPracticeIndex(0); setPracticeResult(null); }}>
                  Independent practice →
                </Button>
              ) : (
                <Button variant="gold" onClick={startTrial}>Attempt the character trial →</Button>
              )}
            </div>
          )}
        </Card>
      )}

      {stage === 'trial' && (
        <Card>
          {trialResult && trialResult.characterId === info.characterId ? (
            <div className="text-center py-4">
              <p className={`text-3xl font-black mb-2 ${trialResult.passed ? 'text-meadow-400' : 'text-ember-400'}`}>
                {trialResult.correct}/{trialResult.total}
              </p>
              {trialResult.passed ? (
                <>
                  <p className="font-black text-meadow-400 mb-1">Trial passed!</p>
                  {trialResult.unlocked && (
                    <p className="text-sm text-sunrise-300 font-bold mb-3 animate-pop">
                      🎉 {info.character.name} is permanently unlocked!
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-300 mb-3">
                  You need {info.passMark}/{info.trialQuestionCount}. Review the explanations below and retry freely — mistakes are training.
                </p>
              )}
              <div className="text-left space-y-2 max-h-60 overflow-y-auto mc-scroll mb-4">
                {trialResult.perQuestion.map((q, i) => (
                  <p key={q.questionId} className={`text-xs rounded-lg px-3 py-2 ${q.correct ? 'bg-meadow-500/10 text-meadow-300' : 'bg-ember-500/10 text-slate-300'}`}>
                    <span className="font-black">{q.correct ? '✓' : '✗'} Q{i + 1}:</span> {q.explanation}
                  </p>
                ))}
              </div>
              <div className="flex justify-center gap-2">
                {!trialResult.passed && <Button variant="gold" onClick={startTrial}>Retry trial</Button>}
                <Link to="/academy"><Button variant="secondary">Back to Academy</Button></Link>
              </div>
            </div>
          ) : currentTrialQ ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-slate-300">
                  Trial question {trialIndex + 1} of {trialQuestions.length}
                </p>
                <Badge tone="gold">pass mark {info.passMark}/{info.trialQuestionCount}</Badge>
              </div>
              <QuestionCard
                question={currentTrialQ}
                result={null}
                onSubmit={submitTrialAnswer}
                onNext={() => {}}
              />
              <p className="text-[11px] text-slate-500 mt-2">Answers are graded together at the end — explanations for every mistake.</p>
            </>
          ) : (
            <p className="text-center py-8 text-slate-400 font-bold">Summoning trial questions…</p>
          )}
        </Card>
      )}
    </div>
  );
}
