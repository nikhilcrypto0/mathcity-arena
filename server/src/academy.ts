import type { CharacterId, PlayerProfile, Question, SubmittedAnswer } from '@mathcity/shared';
import { CHARACTERS, CHARACTER_IDS } from '@mathcity/shared';
import { questionsFor, toClientQuestion } from './questions/bank.ts';
import { validateAnswer } from './questions/validate.ts';
import { upsertPlayer } from './store.ts';

export interface WorkedExample {
  problem: string;
  steps: string[];
  answer: string;
}

export interface KnowledgePath {
  characterId: CharacterId;
  title: string;
  lesson: string[];
  workedExample: WorkedExample;
}

// Short concept lessons — one knowledge path per character.
export const KNOWLEDGE_PATHS: Record<CharacterId, KnowledgePath> = {
  scout: {
    characterId: 'scout',
    title: 'Integers & Number Sense',
    lesson: [
      'Integers are whole numbers that can be positive, negative or zero: ..., -3, -2, -1, 0, 1, 2, 3, ...',
      'Picture a number line. Adding moves you right; subtracting moves you left. Adding a negative number is the same as subtracting.',
      'When multiplying integers, multiply the sizes first, then set the sign: same signs give a positive result, different signs give a negative result.',
    ],
    workedExample: {
      problem: 'Calculate (-7) + 12 − (-3).',
      steps: [
        'Start at -7 on the number line.',
        'Add 12: -7 + 12 = 5.',
        'Subtracting -3 is the same as adding 3: 5 + 3 = 8.',
      ],
      answer: '8',
    },
  },
  archer: {
    characterId: 'archer',
    title: 'Fractions, Ratios & Percentages',
    lesson: [
      'A fraction shows parts of a whole. To add fractions, make the denominators match first, then add the numerators.',
      'A ratio compares quantities. To split an amount in a ratio a:b, add the parts (a+b), find the value of one part, then multiply.',
      'A percentage is a fraction out of 100. To find p% of a number, multiply the number by p and divide by 100.',
    ],
    workedExample: {
      problem: 'Split 120 birr between two teams in the ratio 2:3.',
      steps: [
        '2 + 3 = 5 parts in total.',
        'One part is 120 ÷ 5 = 24 birr.',
        'The shares are 2 × 24 = 48 birr and 3 × 24 = 72 birr.',
      ],
      answer: '48 birr and 72 birr',
    },
  },
  guardian: {
    characterId: 'guardian',
    title: 'Equations & Inequalities',
    lesson: [
      'An equation is a balance: whatever you do to one side, you must do to the other.',
      'To solve for x, undo operations in reverse order: undo addition/subtraction first, then multiplication/division.',
      'Inequalities work the same way, but keep the direction of the sign (it only flips when multiplying or dividing by a negative number).',
    ],
    workedExample: {
      problem: 'Solve 3x + 5 = 20.',
      steps: [
        'Subtract 5 from both sides: 3x = 15.',
        'Divide both sides by 3: x = 5.',
        'Check: 3 × 5 + 5 = 20 ✓',
      ],
      answer: 'x = 5',
    },
  },
  giant: {
    characterId: 'giant',
    title: 'Geometry & Measurement',
    lesson: [
      'Area measures the space inside a shape. Rectangle: length × width. Triangle: half × base × height.',
      'Perimeter is the distance around a shape — add every side. For a rectangle it is 2 × (length + width).',
      'Keep units consistent: convert everything to the same unit before calculating. 1 km = 1000 m, 1 m = 100 cm.',
    ],
    workedExample: {
      problem: 'A rectangular garden is 12 m by 8 m. Find its area and perimeter.',
      steps: [
        'Area = 12 × 8 = 96 m².',
        'Perimeter = 2 × (12 + 8) = 2 × 20 = 40 m.',
      ],
      answer: 'Area 96 m², perimeter 40 m',
    },
  },
  engineer: {
    characterId: 'engineer',
    title: 'Coordinates & Scale',
    lesson: [
      'A coordinate pair (x, y) locates a point: x steps across, then y steps up.',
      'The midpoint of two points is the average of the x values and the average of the y values.',
      'A map scale like 1 cm : 500 m means every map centimetre represents 500 real metres — multiply to find real distances.',
    ],
    workedExample: {
      problem: 'Find the midpoint of A(2, 6) and B(8, 2).',
      steps: [
        'Average the x values: (2 + 8) ÷ 2 = 5.',
        'Average the y values: (6 + 2) ÷ 2 = 4.',
      ],
      answer: '(5, 4)',
    },
  },
  healer: {
    characterId: 'healer',
    title: 'Statistics & Probability',
    lesson: [
      'Mean: add all values and divide by how many there are. Median: the middle value once sorted. Mode: the most frequent value. Range: biggest minus smallest.',
      'Probability measures how likely something is, from 0 (impossible) to 1 (certain).',
      'P(event) = favourable outcomes ÷ total outcomes, when all outcomes are equally likely.',
    ],
    workedExample: {
      problem: 'Find the mean and median of 4, 9, 5, 8, 4.',
      steps: [
        'Mean: (4 + 9 + 5 + 8 + 4) ÷ 5 = 30 ÷ 5 = 6.',
        'Sorted: 4, 4, 5, 8, 9 — the middle value is 5.',
      ],
      answer: 'Mean 6, median 5',
    },
  },
  necromancer: {
    characterId: 'necromancer',
    title: 'Patterns, Sequences & Logic',
    lesson: [
      'In an arithmetic sequence you add the same amount each step. Find the difference between neighbours to continue it.',
      'In a geometric sequence you multiply by the same amount each step.',
      'For multi-step problems, write down what you know, solve one small step at a time, and check each step before moving on.',
    ],
    workedExample: {
      problem: 'Find the next term of 5, 8, 11, 14, ...',
      steps: [
        'The difference between neighbours is 3.',
        'Next term: 14 + 3 = 17.',
      ],
      answer: '17',
    },
  },
  dragon_standard: {
    characterId: 'dragon_standard',
    title: 'Grade 8 Mastery — The Abay Trial',
    lesson: [
      'The Abay Dragon answers to those who can mix topics: equations, geometry, ratios, coordinates and probability in one sitting.',
      'Read each problem twice. Decide which tool it needs before calculating.',
      'Accuracy beats speed — a wrong fast answer earns nothing.',
    ],
    workedExample: {
      problem: 'A triangle has base 10 and height h. Its area is 35. Find h.',
      steps: [
        'Area = ½ × base × height → 35 = ½ × 10 × h.',
        '35 = 5h, so h = 7.',
      ],
      answer: 'h = 7',
    },
  },
  dragon_elite: {
    characterId: 'dragon_elite',
    title: 'Advanced Algebra — The Tisisat Trial',
    lesson: [
      'Simultaneous equations: solve two equations together. Substitute one into the other, or add/subtract them to eliminate a variable.',
      'Quadratics: to solve x² + bx + c = 0, find two numbers that multiply to c and add to b, then factorise.',
      'Functions: f(x) is a machine — feed it x, follow the rule. For f(g(x)), work out the inside machine first.',
    ],
    workedExample: {
      problem: 'Solve: x + y = 10 and 2x − y = 5.',
      steps: [
        'Add the equations: 3x = 15, so x = 5.',
        'Substitute back: 5 + y = 10, so y = 5.',
      ],
      answer: 'x = 5, y = 5',
    },
  },
  dragon_mythic: {
    characterId: 'dragon_mythic',
    title: 'Mixed Mastery — The Lalibela Trial',
    lesson: [
      'The Lalibela Dragon demands everything at once: long, multi-stage problems mixing algebra, geometry and reasoning.',
      'Break big problems into stages. Name intermediate results. Carry exact values, not rounded ones.',
      'Optional frontier: differentiation. For y = axⁿ, dy/dx = n·a·xⁿ⁻¹ — multiply by the power, lower the power by one.',
    ],
    workedExample: {
      problem: 'Differentiate y = 4x³.',
      steps: [
        'Multiply by the power: 4 × 3 = 12.',
        'Lower the power by one: x³ → x².',
      ],
      answer: 'dy/dx = 12x²',
    },
  },
};

export function academyOverview(profile: PlayerProfile | null) {
  return CHARACTER_IDS.map((id) => {
    const def = CHARACTERS[id];
    const path = KNOWLEDGE_PATHS[id];
    const trial = profile?.trials[id];
    return {
      characterId: id,
      character: def,
      path,
      training: questionsFor('training', { character: id }).map((q) => toClientQuestion(q, 'training')),
      trialQuestionCount: def.trial.questions,
      passMark: def.trial.passMark,
      unlocked: profile?.unlockedCharacters.includes(id) ?? def.starter,
      trialProgress: trial ?? { attempts: 0, bestScore: 0, passed: false },
    };
  });
}

export function trialQuestionsFor(characterId: CharacterId) {
  return questionsFor('dragon_trial', { character: characterId });
}

export interface TrialGrade {
  correct: number;
  total: number;
  passed: boolean;
  unlocked: boolean;
  perQuestion: { questionId: string; correct: boolean; explanation: string }[];
}

/** Grade a trial attempt server-side and permanently unlock on success. */
export function gradeTrial(
  profile: PlayerProfile,
  characterId: CharacterId,
  answers: { questionId: string; answer: SubmittedAnswer }[],
): TrialGrade | { error: string } {
  const def = CHARACTERS[characterId];
  if (!def) return { error: 'Unknown character.' };
  const questions = trialQuestionsFor(characterId);
  if (questions.length === 0) return { error: 'No trial available.' };

  const byId = new Map<string, Question>(questions.map((q) => [q.id, q]));
  let correct = 0;
  const perQuestion: TrialGrade['perQuestion'] = [];
  for (const submission of answers) {
    const q = byId.get(submission.questionId);
    if (!q) continue;
    const isCorrect = validateAnswer(q.answer, submission.answer);
    if (isCorrect) correct += 1;
    perQuestion.push({ questionId: q.id, correct: isCorrect, explanation: q.explanation });
  }

  const passed = correct >= def.trial.passMark;
  const existing = profile.trials[characterId] ?? { attempts: 0, bestScore: 0, passed: false };
  profile.trials[characterId] = {
    attempts: existing.attempts + 1,
    bestScore: Math.max(existing.bestScore, correct),
    passed: existing.passed || passed,
  };
  let unlocked = false;
  if (passed && !profile.unlockedCharacters.includes(characterId)) {
    profile.unlockedCharacters.push(characterId);
    unlocked = true;
    if (def.tier === 'dragon') profile.stats.dragonTrialsCompleted += 1;
  }
  upsertPlayer(profile);

  return { correct, total: questions.length, passed, unlocked, perQuestion };
}
