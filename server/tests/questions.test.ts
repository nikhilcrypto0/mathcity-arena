import { describe, expect, it } from 'vitest';
import { parseCoordinate, parseNumeric, validateAnswer } from '../src/questions/validate.ts';
import { QUESTION_BANK, buildBank, questionsFor } from '../src/questions/bank.ts';
import { CHARACTERS, CHARACTER_IDS } from '@mathcity/shared';
import type { AnswerSpec, Question, SubmittedAnswer } from '@mathcity/shared';

const num = (raw: string): SubmittedAnswer => ({ kind: 'number', raw });

describe('parseNumeric', () => {
  it('parses plain integers and decimals', () => {
    expect(parseNumeric('42')).toBe(42);
    expect(parseNumeric('-7')).toBe(-7);
    expect(parseNumeric('3.5')).toBe(3.5);
    expect(parseNumeric('.5')).toBe(0.5);
    expect(parseNumeric('+8')).toBe(8);
  });

  it('tolerates whitespace', () => {
    expect(parseNumeric('  12  ')).toBe(12);
    expect(parseNumeric(' -3 ')).toBe(-3);
  });

  it('parses fractions including negatives', () => {
    expect(parseNumeric('3/4')).toBe(0.75);
    expect(parseNumeric('-1/2')).toBe(-0.5);
    expect(parseNumeric(' 2 / 5 ')).toBe(0.4);
  });

  it('parses mixed numbers', () => {
    expect(parseNumeric('1 1/2')).toBe(1.5);
    expect(parseNumeric('-1 1/2')).toBe(-1.5);
  });

  it('protects against division by zero', () => {
    expect(parseNumeric('3/0')).toBeNull();
    expect(parseNumeric('0/0')).toBeNull();
  });

  it('strips thousands commas and percent signs', () => {
    expect(parseNumeric('1,000')).toBe(1000);
    expect(parseNumeric('45%')).toBe(45);
  });

  it('rejects garbage', () => {
    expect(parseNumeric('')).toBeNull();
    expect(parseNumeric('abc')).toBeNull();
    expect(parseNumeric('1+1')).toBeNull();
    expect(parseNumeric('12abc')).toBeNull();
  });
});

describe('parseCoordinate', () => {
  it('parses common coordinate formats', () => {
    expect(parseCoordinate('3,4')).toEqual({ x: 3, y: 4 });
    expect(parseCoordinate('(3, 4)')).toEqual({ x: 3, y: 4 });
    expect(parseCoordinate('-2, 5')).toEqual({ x: -2, y: 5 });
    expect(parseCoordinate('3 4')).toEqual({ x: 3, y: 4 });
  });

  it('rejects malformed input', () => {
    expect(parseCoordinate('3')).toBeNull();
    expect(parseCoordinate('3,4,5')).toBeNull();
    expect(parseCoordinate('a,b')).toBeNull();
  });
});

describe('validateAnswer', () => {
  it('validates numbers with default tolerance', () => {
    const spec: AnswerSpec = { kind: 'number', value: 0.75 };
    expect(validateAnswer(spec, num('0.75'))).toBe(true);
    expect(validateAnswer(spec, num('3/4'))).toBe(true);
    expect(validateAnswer(spec, num('0.7501'))).toBe(true);
    expect(validateAnswer(spec, num('0.76'))).toBe(false);
  });

  it('accepts equivalent numeric forms for fraction answers', () => {
    const spec: AnswerSpec = { kind: 'fraction', num: 1, den: 2 };
    expect(validateAnswer(spec, num('1/2'))).toBe(true);
    expect(validateAnswer(spec, num('2/4'))).toBe(true);
    expect(validateAnswer(spec, num('0.5'))).toBe(true);
    expect(validateAnswer(spec, num('.5'))).toBe(true);
    expect(validateAnswer(spec, num('3/4'))).toBe(false);
  });

  it('never accepts an incorrect answer through weak validation', () => {
    const spec: AnswerSpec = { kind: 'number', value: 10 };
    expect(validateAnswer(spec, num('10a'))).toBe(false);
    expect(validateAnswer(spec, num(''))).toBe(false);
    expect(validateAnswer(spec, num('10/0'))).toBe(false);
  });

  it('validates choices, coordinates, ordering and multi-part answers', () => {
    expect(validateAnswer({ kind: 'choice', index: 2 }, { kind: 'choice', index: 2 })).toBe(true);
    expect(validateAnswer({ kind: 'choice', index: 2 }, { kind: 'choice', index: 1 })).toBe(false);

    const coord: AnswerSpec = { kind: 'coordinate', x: -1, y: 4 };
    expect(validateAnswer(coord, { kind: 'coordinate', raw: '(-1, 4)' })).toBe(true);
    expect(validateAnswer(coord, { kind: 'coordinate', raw: '1,4' })).toBe(false);

    const ord: AnswerSpec = { kind: 'ordering', order: [2, 0, 1] };
    expect(validateAnswer(ord, { kind: 'ordering', order: [2, 0, 1] })).toBe(true);
    expect(validateAnswer(ord, { kind: 'ordering', order: [0, 1, 2] })).toBe(false);

    const multi: AnswerSpec = {
      kind: 'multi',
      parts: [{ kind: 'number', value: 3 }, { kind: 'number', value: 5 }],
    };
    expect(
      validateAnswer(multi, { kind: 'multi', parts: [num('3'), num('5')] }),
    ).toBe(true);
    expect(
      validateAnswer(multi, { kind: 'multi', parts: [num('5'), num('3')] }),
    ).toBe(false);
  });
});

/** Build the "obviously correct" submission for a question's own answer spec. */
function correctSubmission(spec: AnswerSpec): SubmittedAnswer {
  switch (spec.kind) {
    case 'number':
      return num(String(spec.value));
    case 'fraction':
      return num(`${spec.num}/${spec.den}`);
    case 'choice':
      return { kind: 'choice', index: spec.index };
    case 'coordinate':
      return { kind: 'coordinate', raw: `${spec.x},${spec.y}` };
    case 'ordering':
      return { kind: 'ordering', order: spec.order };
    case 'multi':
      return { kind: 'multi', parts: spec.parts.map(correctSubmission) };
  }
}

describe('question bank', () => {
  it('meets the minimum content requirements', () => {
    expect(questionsFor('standard').length).toBeGreaterThanOrEqual(60);
    expect(questionsFor('advanced').length).toBeGreaterThanOrEqual(20);
    expect(questionsFor('crisis').length).toBeGreaterThanOrEqual(4);
    expect(questionsFor('attack').length).toBeGreaterThanOrEqual(5);
    expect(questionsFor('defense').length).toBeGreaterThanOrEqual(5);
    expect(questionsFor('training').length).toBeGreaterThanOrEqual(30);
    expect(questionsFor('dragon_trial').length).toBeGreaterThanOrEqual(30);
  });

  it('has unique ids', () => {
    const ids = QUESTION_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is deterministic for the same seed', () => {
    const a = buildBank(123);
    const b = buildBank(123);
    expect(a).toEqual(b);
  });

  it('every question is complete and self-consistent', () => {
    for (const q of QUESTION_BANK) {
      expect(q.prompt.length, q.id).toBeGreaterThan(5);
      expect(q.explanation.length, q.id).toBeGreaterThan(5);
      expect(q.reward, q.id).toBeGreaterThan(0);
      if (q.format === 'multiple_choice' || q.format === 'ordering') {
        expect(q.choices, q.id).toBeDefined();
        expect(new Set(q.choices).size, `${q.id} has duplicate choices`).toBe(q.choices!.length);
        if (q.answer.kind === 'choice') {
          expect(q.answer.index, q.id).toBeGreaterThanOrEqual(0);
          expect(q.answer.index, q.id).toBeLessThan(q.choices!.length);
        }
        if (q.answer.kind === 'ordering') {
          expect(q.answer.order.length, q.id).toBe(q.choices!.length);
        }
      }
    }
  });

  it('every question validates its own correct answer', () => {
    for (const q of QUESTION_BANK) {
      const submission = correctSubmission(q.answer);
      expect(validateAnswer(q.answer, submission), q.id).toBe(true);
    }
  });

  it('every character has a full set of trial questions', () => {
    for (const id of CHARACTER_IDS) {
      const trial = questionsFor('dragon_trial', { character: id });
      expect(trial.length, id).toBe(CHARACTERS[id].trial.questions);
    }
  });

  it('dragon trials draw on the advanced curriculum', () => {
    const elite = questionsFor('dragon_trial', { character: 'dragon_elite' });
    expect(elite.some((q: Question) => q.level === 'advanced')).toBe(true);
  });
});
