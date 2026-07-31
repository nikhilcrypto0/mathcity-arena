import { useEffect, useState } from 'react';
import type { ClientQuestion, SubmittedAnswer } from '@mathcity/shared';
import { Lightbulb, Send, ArrowRight } from 'lucide-react';
import { Badge, Button } from './ui.tsx';
import type { AnswerResult } from '../lib/store.ts';

const TOPIC_LABELS: Record<string, string> = {
  simultaneous_equations: 'simultaneous equations',
  multi_step: 'multi-step',
};

export function QuestionCard({
  question, result, onSubmit, onNext, nextLabel = 'Next question',
}: {
  question: ClientQuestion | null;
  result: AnswerResult | null;
  onSubmit: (questionId: string, answer: SubmittedAnswer) => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  const [numeric, setNumeric] = useState('');
  const [multiParts, setMultiParts] = useState<string[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setNumeric('');
    setMultiParts(question?.steps ? question.steps.map(() => '') : []);
    setChoice(null);
    setOrder([]);
    setShowHint(false);
  }, [question?.id]);

  if (!question && !result) return null;

  if (result) {
    return (
      <div className={`rounded-2xl border p-4 animate-pop ${result.correct ? 'border-meadow-500/50 bg-meadow-500/10' : 'border-ember-500/50 bg-ember-500/10'}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl" aria-hidden>{result.correct ? '✓' : '✗'}</span>
          <span className={`text-lg font-black ${result.correct ? 'text-meadow-400' : 'text-ember-400'}`}>
            {result.correct ? 'Correct!' : 'Not quite.'}
          </span>
          {result.correct && result.streak >= 2 && <Badge tone="gold">🔥 {result.streak} streak</Badge>}
        </div>
        <p className="text-sm text-slate-200 mb-3">{result.explanation}</p>
        {result.correct && Object.keys(result.rewards).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3" aria-label="rewards earned">
            {Object.entries(result.rewards).map(([key, value]) => (
              <Badge key={key} tone="green">+{value} {key}</Badge>
            ))}
          </div>
        )}
        <Button variant="primary" size="sm" onClick={onNext}>
          {nextLabel} <ArrowRight className="inline w-4 h-4" aria-hidden />
        </Button>
      </div>
    );
  }

  const q = question!;

  const submit = () => {
    let answer: SubmittedAnswer | null = null;
    if (q.format === 'numeric') answer = { kind: 'number', raw: numeric };
    else if (q.format === 'coordinate') answer = { kind: 'coordinate', raw: numeric };
    else if (q.format === 'multiple_choice') {
      if (choice === null) return;
      answer = { kind: 'choice', index: choice };
    } else if (q.format === 'ordering') {
      if (order.length !== (q.choices?.length ?? 0)) return;
      answer = { kind: 'ordering', order };
    } else if (q.format === 'multi_step') {
      answer = { kind: 'multi', parts: multiParts.map((raw) => ({ kind: 'number', raw })) };
    }
    if (answer) onSubmit(q.id, answer);
  };

  const canSubmit =
    q.format === 'multiple_choice' ? choice !== null
    : q.format === 'ordering' ? order.length === (q.choices?.length ?? 0)
    : q.format === 'multi_step' ? multiParts.every((p) => p.trim() !== '')
    : numeric.trim() !== '';

  return (
    <div className="rounded-2xl border border-lake-500/30 bg-night-800/80 p-4 animate-slide-up">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge tone={q.level === 'advanced' ? 'gold' : 'lake'}>
          {q.level === 'advanced' ? '⭐ Advanced' : `Grade ${q.level}`}
        </Badge>
        <Badge tone="slate">{TOPIC_LABELS[q.topic] ?? q.topic.replace('_', ' ')}</Badge>
        <Badge tone="slate">{'●'.repeat(q.difficulty)}{'○'.repeat(5 - q.difficulty)}</Badge>
        <Badge tone="green">+{q.reward}</Badge>
      </div>
      <p className="text-base font-semibold text-white whitespace-pre-line mb-4">{q.prompt}</p>

      {q.format === 'multiple_choice' && q.choices && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label="answer choices">
          {q.choices.map((c, i) => (
            <button
              key={i}
              role="radio"
              aria-checked={choice === i}
              onClick={() => setChoice(i)}
              className={`px-4 py-3 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                choice === i
                  ? 'border-lake-400 bg-lake-500/20 text-lake-300'
                  : 'border-night-600 bg-night-900/60 text-slate-200 hover:border-lake-500/50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {q.format === 'ordering' && q.choices && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-2" aria-label="numbers to order">
            {q.choices.map((c, i) => {
              const position = order.indexOf(i);
              return (
                <button
                  key={i}
                  onClick={() =>
                    position >= 0
                      ? setOrder(order.filter((v) => v !== i))
                      : setOrder([...order, i])
                  }
                  className={`px-4 py-3 rounded-xl border font-black text-lg transition-all cursor-pointer ${
                    position >= 0
                      ? 'border-sunrise-400 bg-sunrise-500/20 text-sunrise-300'
                      : 'border-night-600 bg-night-900/60 text-white hover:border-lake-500/50'
                  }`}
                  aria-label={position >= 0 ? `${c}, position ${position + 1}` : c}
                >
                  {c}
                  {position >= 0 && <span className="ml-2 text-xs align-super">{position + 1}</span>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400">Tap in order — tap again to remove.</p>
        </div>
      )}

      {(q.format === 'numeric' || q.format === 'coordinate') && (
        <input
          value={numeric}
          onChange={(e) => setNumeric(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canSubmit && submit()}
          placeholder={q.format === 'coordinate' ? 'x, y' : 'Your answer (e.g. 12, 3/4, -5)'}
          aria-label="your answer"
          className="w-full mb-4 px-4 py-3 rounded-xl bg-night-950 border border-night-600 focus:border-lake-400 text-white font-bold text-lg"
          inputMode="text"
          autoComplete="off"
        />
      )}

      {q.format === 'multi_step' && q.steps && (
        <div className="space-y-2 mb-4">
          {q.steps.map((step, i) => (
            <label key={i} className="block">
              <span className="text-sm font-bold text-slate-300">{step}</span>
              <input
                value={multiParts[i] ?? ''}
                onChange={(e) => {
                  const next = [...multiParts];
                  next[i] = e.target.value;
                  setMultiParts(next);
                }}
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-night-950 border border-night-600 focus:border-lake-400 text-white font-bold"
                autoComplete="off"
              />
            </label>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="gold" size="md" onClick={submit} disabled={!canSubmit}>
          <Send className="inline w-4 h-4 mr-1" aria-hidden /> Submit
        </Button>
        {q.hint && (
          <Button variant="ghost" size="md" onClick={() => setShowHint(!showHint)} aria-expanded={showHint}>
            <Lightbulb className="inline w-4 h-4 mr-1" aria-hidden /> Hint
          </Button>
        )}
      </div>
      {showHint && q.hint && (
        <p className="mt-3 text-sm text-sunrise-300 bg-sunrise-500/10 border border-sunrise-500/30 rounded-xl px-3 py-2 animate-slide-up">
          💡 {q.hint}
        </p>
      )}
    </div>
  );
}
