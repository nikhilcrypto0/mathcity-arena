import type { CharacterId, ClientQuestion, Question, QuestionContext } from '@mathcity/shared';
import { CHARACTERS, CHARACTER_IDS } from '@mathcity/shared';
import { makeRng, type Rng } from './rng.ts';
import {
  ADVANCED_GENERATORS,
  ATTACK_GENERATORS,
  CRISIS_GENERATORS,
  DEFENSE_GENERATORS,
  STANDARD_GENERATORS,
  TOPIC_GENERATORS,
  type Generator,
} from './templates.ts';

const BANK_SEED = 20260731;

function hasDuplicateChoices(q: Question): boolean {
  if (!q.choices) return false;
  return new Set(q.choices).size !== q.choices.length;
}

/** Run a generator, retrying with fresh randomness if it produced duplicate MC choices. */
function generate(gen: Generator, rng: Rng, opts: Parameters<Generator>[1]): Question {
  for (let attempt = 0; attempt < 12; attempt++) {
    const q = gen(rng, opts);
    if (!hasDuplicateChoices(q)) return q;
  }
  // Deterministic fallback: drop the duplicate choices question rather than ship it broken.
  const q = gen(rng, opts);
  if (q.choices) {
    q.choices = q.choices.filter((c, i) => q.choices!.indexOf(c) === i);
  }
  return q;
}

function buildGroup(
  rng: Rng,
  specs: { gen: Generator; count: number }[],
  usage: Question['usage'],
  idPrefix: string,
): Question[] {
  const out: Question[] = [];
  let n = 0;
  for (const { gen, count } of specs) {
    for (let i = 0; i < count; i++) {
      n += 1;
      out.push(generate(gen, rng, { id: `${idPrefix}_${n}`, usage }));
    }
  }
  return out;
}

function buildTrainingQuestions(rng: Rng): Question[] {
  const out: Question[] = [];
  for (const characterId of CHARACTER_IDS) {
    const def = CHARACTERS[characterId];
    const gens = def.topics.flatMap((t) => TOPIC_GENERATORS[t] ?? []);
    if (gens.length === 0) continue;
    for (let i = 0; i < 6; i++) {
      const gen = gens[i % gens.length];
      out.push(
        generate(gen, rng, {
          id: `q_train_${characterId}_${i + 1}`,
          usage: 'training',
          character: characterId,
        }),
      );
    }
  }
  return out;
}

function buildTrialQuestions(rng: Rng): Question[] {
  const out: Question[] = [];
  for (const characterId of CHARACTER_IDS) {
    const def = CHARACTERS[characterId];
    const gens = def.topics.flatMap((t) => TOPIC_GENERATORS[t] ?? []);
    if (gens.length === 0) continue;
    for (let i = 0; i < def.trial.questions; i++) {
      const gen = gens[i % gens.length];
      out.push(
        generate(gen, rng, {
          id: `q_trial_${characterId}_${i + 1}`,
          usage: 'dragon_trial',
          character: characterId,
        }),
      );
    }
  }
  return out;
}

export function buildBank(seed: number = BANK_SEED): Question[] {
  const rng = makeRng(seed);
  return [
    ...buildGroup(rng, STANDARD_GENERATORS, 'standard', 'q_std'),
    ...buildGroup(rng, ADVANCED_GENERATORS, 'advanced', 'q_adv'),
    ...buildGroup(rng, CRISIS_GENERATORS, 'crisis', 'q_crisis'),
    ...buildGroup(rng, ATTACK_GENERATORS, 'attack', 'q_atk'),
    ...buildGroup(rng, DEFENSE_GENERATORS, 'defense', 'q_def'),
    ...buildTrainingQuestions(rng),
    ...buildTrialQuestions(rng),
  ];
}

export const QUESTION_BANK: Question[] = buildBank();

export const QUESTIONS_BY_ID: Map<string, Question> = new Map(
  QUESTION_BANK.map((q) => [q.id, q]),
);

export function questionsFor(
  usage: Question['usage'],
  filter?: { character?: CharacterId; advancedOnly?: boolean },
): Question[] {
  return QUESTION_BANK.filter((q) => {
    if (q.usage !== usage) return false;
    if (filter?.character && q.character !== filter.character) return false;
    if (filter?.advancedOnly && q.level !== 'advanced') return false;
    return true;
  });
}

export function toClientQuestion(q: Question, context: QuestionContext): ClientQuestion {
  return {
    id: q.id,
    topic: q.topic,
    difficulty: q.difficulty,
    level: q.level,
    format: q.format,
    prompt: q.prompt,
    choices: q.choices,
    steps: q.steps,
    reward: q.reward,
    hint: q.hint,
    context,
  };
}
