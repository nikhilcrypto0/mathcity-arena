import type { Question, QuestionTopic, QuestionUsage, CharacterId } from '@mathcity/shared';
import { gcd, type Rng } from './rng.ts';

interface BuildOpts {
  id: string;
  usage: QuestionUsage;
  character?: CharacterId;
  rewardOverride?: number;
}

export type Generator = (rng: Rng, opts: BuildOpts) => Question;

const fmt = (n: number) => (n < 0 ? `(${n})` : `${n}`);
const rewardFor = (difficulty: number) => 10 + difficulty * 5;

function base(
  opts: BuildOpts,
  fields: Omit<Question, 'id' | 'usage' | 'reward' | 'character'> & { reward?: number },
): Question {
  return {
    id: opts.id,
    usage: opts.usage,
    character: opts.character,
    reward: opts.rewardOverride ?? fields.reward ?? rewardFor(fields.difficulty),
    ...fields,
  };
}

function simplify(num: number, den: number): [number, number] {
  const g = gcd(num, den);
  return [num / g, den / g];
}

// ---------------------------------------------------------------------------
// Integers & arithmetic (Scout)
// ---------------------------------------------------------------------------

export const integerAdd: Generator = (rng, opts) => {
  const a = rng.int(-20, 20);
  let b = rng.int(-20, 20);
  if (a === 0 && b === 0) b = 7;
  return base(opts, {
    topic: 'integers', difficulty: 1, level: 6, format: 'numeric',
    prompt: `Calculate: ${fmt(a)} + ${fmt(b)}`,
    answer: { kind: 'number', value: a + b },
    explanation: `Adding ${fmt(b)} to ${fmt(a)} moves ${Math.abs(b)} steps ${b >= 0 ? 'up' : 'down'} the number line, giving ${a + b}.`,
    hint: 'Picture a number line: adding a negative moves left.',
  });
};

export const integerSubtract: Generator = (rng, opts) => {
  const a = rng.int(-15, 15);
  const b = rng.int(-15, 15);
  return base(opts, {
    topic: 'integers', difficulty: 2, level: 6, format: 'numeric',
    prompt: `Calculate: ${fmt(a)} − ${fmt(b)}`,
    answer: { kind: 'number', value: a - b },
    explanation: `Subtracting ${fmt(b)} is the same as adding ${fmt(-b)}, so ${fmt(a)} − ${fmt(b)} = ${a - b}.`,
    hint: 'Subtracting a negative is the same as adding.',
  });
};

export const integerMultiply: Generator = (rng, opts) => {
  const choicesA = [-12, -11, -9, -8, -7, -6, -4, -3, 3, 4, 6, 7, 8, 9, 11, 12];
  const choicesB = [-9, -8, -7, -6, -4, -3, -2, 2, 3, 4, 6, 7, 8, 9];
  const a = rng.pick(choicesA);
  const b = rng.pick(choicesB);
  return base(opts, {
    topic: 'integers', difficulty: 2, level: 6, format: 'numeric',
    prompt: `Calculate: ${fmt(a)} × ${fmt(b)}`,
    answer: { kind: 'number', value: a * b },
    explanation: `${Math.abs(a)} × ${Math.abs(b)} = ${Math.abs(a * b)}; ${a < 0 !== b < 0 ? 'one negative sign makes the result negative' : 'the signs match, so the result is positive'}: ${a * b}.`,
    hint: 'Multiply the sizes first, then decide the sign.',
  });
};

export const orderOfOperations: Generator = (rng, opts) => {
  const a = rng.int(2, 15);
  const b = rng.int(2, 9);
  const c = rng.int(2, 9);
  return base(opts, {
    topic: 'arithmetic', difficulty: 2, level: 6, format: 'numeric',
    prompt: `Calculate: ${a} + ${b} × ${c}`,
    answer: { kind: 'number', value: a + b * c },
    explanation: `Multiplication comes before addition: ${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${a + b * c}.`,
    hint: 'Multiply before you add.',
  });
};

export const orderOfOperationsParen: Generator = (rng, opts) => {
  const a = rng.int(2, 9);
  const b = rng.int(2, 9);
  const c = rng.int(2, 6);
  return base(opts, {
    topic: 'arithmetic', difficulty: 2, level: 6, format: 'numeric',
    prompt: `Calculate: (${a} + ${b}) × ${c}`,
    answer: { kind: 'number', value: (a + b) * c },
    explanation: `Brackets first: ${a} + ${b} = ${a + b}, then ${a + b} × ${c} = ${(a + b) * c}.`,
    hint: 'Work out the bracket before multiplying.',
  });
};

export const longMultiplication: Generator = (rng, opts) => {
  const a = rng.int(13, 48);
  const b = rng.int(11, 25);
  return base(opts, {
    topic: 'arithmetic', difficulty: 3, level: 7, format: 'numeric',
    prompt: `Calculate: ${a} × ${b}`,
    answer: { kind: 'number', value: a * b },
    explanation: `${a} × ${b} = ${a} × ${b - (b % 10)} + ${a} × ${b % 10} = ${a * (b - (b % 10))} + ${a * (b % 10)} = ${a * b}.`,
    hint: 'Split the second number into tens and units.',
  });
};

export const division: Generator = (rng, opts) => {
  const quotient = rng.int(6, 24);
  const divisor = rng.int(3, 12);
  const dividend = quotient * divisor;
  return base(opts, {
    topic: 'arithmetic', difficulty: 2, level: 6, format: 'numeric',
    prompt: `Calculate: ${dividend} ÷ ${divisor}`,
    answer: { kind: 'number', value: quotient },
    explanation: `${divisor} × ${quotient} = ${dividend}, so ${dividend} ÷ ${divisor} = ${quotient}.`,
    hint: 'Think: divisor × what = dividend?',
  });
};

// ---------------------------------------------------------------------------
// Fractions, ratios, percentages (Archer)
// ---------------------------------------------------------------------------

export const fractionAddSameDen: Generator = (rng, opts) => {
  const den = rng.pick([5, 7, 9, 11, 13]);
  const a = rng.int(1, den - 3);
  const b = rng.int(1, den - a - 1);
  const [n, d] = simplify(a + b, den);
  return base(opts, {
    topic: 'fractions', difficulty: 2, level: 6, format: 'numeric',
    prompt: `Calculate: ${a}/${den} + ${b}/${den}. Give your answer as a fraction.`,
    answer: { kind: 'fraction', num: n, den: d },
    explanation: `Same denominators: add the numerators. ${a} + ${b} = ${a + b}, so the answer is ${a + b}/${den}${n !== a + b ? `, which simplifies to ${n}/${d}` : ''}.`,
    hint: 'When denominators match, just add the tops.',
  });
};

export const fractionAddDiffDen: Generator = (rng, opts) => {
  const a = rng.pick([2, 3, 4, 5]);
  let b = rng.pick([3, 4, 5, 6]);
  if (b === a) b = a + 1;
  const [n, d] = simplify(a + b, a * b);
  return base(opts, {
    topic: 'fractions', difficulty: 3, level: 7, format: 'numeric',
    prompt: `Calculate: 1/${a} + 1/${b}. Give your answer as a fraction.`,
    answer: { kind: 'fraction', num: n, den: d },
    explanation: `Common denominator ${a * b}: ${b}/${a * b} + ${a}/${a * b} = ${a + b}/${a * b}${n !== a + b ? ` = ${n}/${d}` : ''}.`,
    hint: `Use ${a * b} as the common denominator.`,
  });
};

export const fractionSimplifyMC: Generator = (rng, opts) => {
  const k = rng.pick([2, 3, 4, 5]);
  const n = rng.int(1, 5);
  let d = rng.int(n + 1, 9);
  if (gcd(n, d) !== 1) d = n + 1;
  const correct = `${n}/${d}`;
  const distractors = [`${n}/${d + 1}`, `${n + 1}/${d}`, `${k}/${d}`].filter((c) => c !== correct);
  const options = rng.shuffle([correct, ...distractors.slice(0, 3)]);
  return base(opts, {
    topic: 'fractions', difficulty: 2, level: 6, format: 'multiple_choice',
    prompt: `Simplify the fraction ${n * k}/${d * k} to its lowest terms.`,
    choices: options,
    answer: { kind: 'choice', index: options.indexOf(correct) },
    explanation: `Divide top and bottom by ${k}: ${n * k} ÷ ${k} = ${n} and ${d * k} ÷ ${k} = ${d}, giving ${correct}.`,
    hint: `Both numbers divide by ${k}.`,
  });
};

export const fractionOfQuantity: Generator = (rng, opts) => {
  const den = rng.pick([3, 4, 5, 6, 8]);
  const num = rng.int(1, den - 1);
  const quantity = den * rng.int(4, 12);
  return base(opts, {
    topic: 'fractions', difficulty: 2, level: 6, format: 'numeric',
    prompt: `A market stall has ${quantity} mangoes. ${num}/${den} of them are sold. How many mangoes are sold?`,
    answer: { kind: 'number', value: (quantity * num) / den },
    explanation: `${quantity} ÷ ${den} = ${quantity / den}, and ${quantity / den} × ${num} = ${(quantity * num) / den}.`,
    hint: `First find 1/${den} of ${quantity}.`,
  });
};

export const ratioShare: Generator = (rng, opts) => {
  const a = rng.int(1, 4);
  let b = rng.int(2, 6);
  if (b === a) b += 1;
  const unit = rng.int(20, 60);
  const total = (a + b) * unit;
  const larger = Math.max(a, b) * unit;
  return base(opts, {
    topic: 'ratios', difficulty: 3, level: 7, format: 'numeric',
    prompt: `Two teams share ${total} birr in the ratio ${a}:${b}. How many birr does the team with the LARGER share receive?`,
    answer: { kind: 'number', value: larger },
    explanation: `${a} + ${b} = ${a + b} parts. Each part is ${total} ÷ ${a + b} = ${unit} birr. The larger share is ${Math.max(a, b)} × ${unit} = ${larger} birr.`,
    hint: 'Find the value of one part first.',
  });
};

export const ratioSimplifyMC: Generator = (rng, opts) => {
  const k = rng.pick([2, 3, 4, 5, 6]);
  const a = rng.int(1, 5);
  let b = rng.int(a + 1, 9);
  if (gcd(a, b) !== 1) b = a + 1;
  const correct = `${a} : ${b}`;
  const options = rng.shuffle([correct, `${a} : ${b + 1}`, `${b} : ${a}`, `${a * 2} : ${b * 3}`]);
  return base(opts, {
    topic: 'ratios', difficulty: 2, level: 6, format: 'multiple_choice',
    prompt: `Write the ratio ${a * k} : ${b * k} in its simplest form.`,
    choices: options,
    answer: { kind: 'choice', index: options.indexOf(correct) },
    explanation: `Divide both sides by ${k}: ${a * k} ÷ ${k} = ${a}, ${b * k} ÷ ${k} = ${b}. Simplest form is ${correct}.`,
    hint: `Both sides divide by ${k}.`,
  });
};

export const percentOf: Generator = (rng, opts) => {
  const p = rng.pick([10, 20, 25, 30, 40, 50, 60, 75, 80, 90]);
  const n = 20 * rng.int(2, 15);
  return base(opts, {
    topic: 'percentages', difficulty: 2, level: 6, format: 'numeric',
    prompt: `Find ${p}% of ${n}.`,
    answer: { kind: 'number', value: (n * p) / 100 },
    explanation: `${p}% means ${p}/100. ${n} × ${p}/100 = ${(n * p) / 100}.`,
    hint: '10% is the number divided by 10 — build from there.',
  });
};

export const percentIncrease: Generator = (rng, opts) => {
  const p = rng.pick([10, 20, 25, 50]);
  const n = rng.pick([40, 60, 80, 120, 200, 240, 320]);
  const result = n + (n * p) / 100;
  return base(opts, {
    topic: 'percentages', difficulty: 3, level: 7, format: 'numeric',
    prompt: `A solar panel produced ${n} watts. After cleaning, output increased by ${p}%. What is the new output in watts?`,
    answer: { kind: 'number', value: result },
    explanation: `The increase is ${n} × ${p}/100 = ${(n * p) / 100} watts. New output: ${n} + ${(n * p) / 100} = ${result} watts.`,
    hint: 'Find the increase first, then add it on.',
  });
};

// ---------------------------------------------------------------------------
// Equations & inequalities (Guardian)
// ---------------------------------------------------------------------------

export const oneStepEquation: Generator = (rng, opts) => {
  const x = rng.int(2, 15);
  const a = rng.int(3, 20);
  return base(opts, {
    topic: 'equations', difficulty: 2, level: 7, format: 'numeric',
    prompt: `Solve for x:  x + ${a} = ${x + a}`,
    answer: { kind: 'number', value: x },
    explanation: `Subtract ${a} from both sides: x = ${x + a} − ${a} = ${x}.`,
    hint: 'Do the same thing to both sides.',
  });
};

export const twoStepEquation: Generator = (rng, opts) => {
  const x = rng.int(2, 12);
  const a = rng.int(2, 9);
  const b = rng.int(1, 20);
  return base(opts, {
    topic: 'equations', difficulty: 3, level: 7, format: 'numeric',
    prompt: `Solve for x:  ${a}x + ${b} = ${a * x + b}`,
    answer: { kind: 'number', value: x },
    explanation: `Subtract ${b}: ${a}x = ${a * x}. Divide by ${a}: x = ${x}.`,
    hint: 'Undo the addition first, then the multiplication.',
  });
};

export const equationBothSides: Generator = (rng, opts) => {
  const x = rng.int(2, 10);
  const a = rng.int(3, 8);
  const b = rng.int(1, a - 2 >= 1 ? a - 1 : 1);
  const c = (a - b) * x;
  return base(opts, {
    topic: 'equations', difficulty: 4, level: 8, format: 'numeric',
    prompt: `Solve for x:  ${a}x = ${b}x + ${c}`,
    answer: { kind: 'number', value: x },
    explanation: `Subtract ${b}x from both sides: ${a - b}x = ${c}. Divide by ${a - b}: x = ${x}.`,
    hint: 'Collect the x terms on one side.',
  });
};

export const inequalityMC: Generator = (rng, opts) => {
  const a = rng.int(2, 12);
  const b = rng.int(a + 2, a + 15);
  const correct = `x < ${b - a}`;
  const options = rng.shuffle([correct, `x > ${b - a}`, `x < ${b + a}`, `x > ${b}`]);
  return base(opts, {
    topic: 'inequalities', difficulty: 3, level: 7, format: 'multiple_choice',
    prompt: `Which describes all solutions of  x + ${a} < ${b} ?`,
    choices: options,
    answer: { kind: 'choice', index: options.indexOf(correct) },
    explanation: `Subtract ${a} from both sides: x < ${b - a}. The inequality direction does not change when subtracting.`,
    hint: 'Treat it like an equation, but keep the < sign.',
  });
};

// ---------------------------------------------------------------------------
// Geometry, area, perimeter, measurement (Giant)
// ---------------------------------------------------------------------------

export const rectangleArea: Generator = (rng, opts) => {
  const l = rng.int(4, 15);
  const w = rng.int(3, 12);
  return base(opts, {
    topic: 'area', difficulty: 2, level: 6, format: 'numeric',
    prompt: `A garden plot is ${l} m long and ${w} m wide. What is its area in square metres?`,
    answer: { kind: 'number', value: l * w },
    explanation: `Area of a rectangle = length × width = ${l} × ${w} = ${l * w} m².`,
    hint: 'Area of a rectangle = length × width.',
  });
};

export const triangleArea: Generator = (rng, opts) => {
  const b = 2 * rng.int(3, 10);
  const h = rng.int(4, 12);
  return base(opts, {
    topic: 'geometry', difficulty: 3, level: 7, format: 'numeric',
    prompt: `A triangular sail has base ${b} m and height ${h} m. What is its area in square metres?`,
    answer: { kind: 'number', value: (b * h) / 2 },
    explanation: `Area of a triangle = ½ × base × height = ½ × ${b} × ${h} = ${(b * h) / 2} m².`,
    hint: 'Half of base times height.',
  });
};

export const rectanglePerimeter: Generator = (rng, opts) => {
  const l = rng.int(5, 20);
  const w = rng.int(3, 15);
  return base(opts, {
    topic: 'perimeter', difficulty: 2, level: 6, format: 'numeric',
    prompt: `A wall must surround a ${l} m by ${w} m district square. How many metres of wall are needed?`,
    answer: { kind: 'number', value: 2 * (l + w) },
    explanation: `Perimeter = 2 × (length + width) = 2 × (${l} + ${w}) = ${2 * (l + w)} m.`,
    hint: 'Add length and width, then double.',
  });
};

export const unitConversionMC: Generator = (rng, opts) => {
  const variants = [
    { q: (n: number) => `${n} km = ? m`, mult: 1000, unit: 'm', ns: [2, 3, 4, 5, 7] },
    { q: (n: number) => `${n} m = ? cm`, mult: 100, unit: 'cm', ns: [3, 5, 8, 12] },
    { q: (n: number) => `${n} kg = ? g`, mult: 1000, unit: 'g', ns: [2, 4, 6, 9] },
    { q: (n: number) => `${n} hours = ? minutes`, mult: 60, unit: 'minutes', ns: [2, 3, 4, 5] },
  ];
  const v = rng.pick(variants);
  const n = rng.pick(v.ns);
  const correct = `${n * v.mult}`;
  const options = rng.shuffle([correct, `${n * v.mult * 10}`, `${(n * v.mult) / 10}`, `${n * v.mult + v.mult / 2}`]);
  return base(opts, {
    topic: 'measurement', difficulty: 2, level: 6, format: 'multiple_choice',
    prompt: `Convert: ${v.q(n)}`,
    choices: options,
    answer: { kind: 'choice', index: options.indexOf(correct) },
    explanation: `Multiply by ${v.mult}: ${n} × ${v.mult} = ${n * v.mult} ${v.unit}.`,
    hint: `1 of the bigger unit = ${v.mult} of the smaller.`,
  });
};

// ---------------------------------------------------------------------------
// Coordinates & scale (Engineer)
// ---------------------------------------------------------------------------

export const midpoint: Generator = (rng, opts) => {
  const x1 = 2 * rng.int(-4, 4);
  const y1 = 2 * rng.int(-4, 4);
  const x2 = 2 * rng.int(-4, 4);
  const y2 = 2 * rng.int(-4, 4);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return base(opts, {
    topic: 'coordinates', difficulty: 3, level: 7, format: 'coordinate',
    prompt: `Two stations sit at A(${x1}, ${y1}) and B(${x2}, ${y2}). Give the coordinates of the midpoint of AB as x,y.`,
    answer: { kind: 'coordinate', x: mx, y: my },
    explanation: `Midpoint = ((${x1}+${x2})/2, (${y1}+${y2})/2) = (${mx}, ${my}).`,
    hint: 'Average the x values, then average the y values.',
  });
};

export const reflection: Generator = (rng, opts) => {
  const x = rng.int(-8, 8);
  const y = rng.int(1, 8);
  const overX = rng.next() < 0.5;
  const rx = overX ? x : -x;
  const ry = overX ? -y : y;
  return base(opts, {
    topic: 'coordinates', difficulty: 2, level: 7, format: 'coordinate',
    prompt: `Reflect the point P(${x}, ${y}) in the ${overX ? 'x' : 'y'}-axis. Give the image coordinates as x,y.`,
    answer: { kind: 'coordinate', x: rx, y: ry },
    explanation: overX
      ? `Reflecting in the x-axis keeps x and flips the sign of y: (${x}, ${y}) → (${rx}, ${ry}).`
      : `Reflecting in the y-axis keeps y and flips the sign of x: (${x}, ${y}) → (${rx}, ${ry}).`,
    hint: overX ? 'The x value stays the same.' : 'The y value stays the same.',
  });
};

export const mapScale: Generator = (rng, opts) => {
  const scale = rng.pick([100, 200, 500, 1000]);
  const cm = rng.int(2, 12);
  return base(opts, {
    topic: 'scale', difficulty: 3, level: 7, format: 'numeric',
    prompt: `A city map uses a scale of 1 cm : ${scale} m. Two buildings are ${cm} cm apart on the map. What is the real distance in metres?`,
    answer: { kind: 'number', value: cm * scale },
    explanation: `Each map centimetre represents ${scale} m, so ${cm} cm represents ${cm} × ${scale} = ${cm * scale} m.`,
    hint: 'Multiply map distance by the scale.',
  });
};

// ---------------------------------------------------------------------------
// Statistics & probability (Healer)
// ---------------------------------------------------------------------------

export const meanOfList: Generator = (rng, opts) => {
  const mean = rng.int(4, 15);
  const count = rng.pick([4, 5]);
  const deltas = count === 4 ? [-3, -1, 1, 3] : [-4, -2, 0, 2, 4];
  const list = rng.shuffle(deltas).map((d) => mean + d);
  return base(opts, {
    topic: 'statistics', difficulty: 2, level: 7, format: 'numeric',
    prompt: `Find the mean of: ${list.join(', ')}`,
    answer: { kind: 'number', value: mean },
    explanation: `Sum = ${list.reduce((s, v) => s + v, 0)}. Divide by ${count} values: ${list.reduce((s, v) => s + v, 0)} ÷ ${count} = ${mean}.`,
    hint: 'Add them all, divide by how many there are.',
  });
};

export const medianOfList: Generator = (rng, opts) => {
  const startValue = rng.int(2, 10);
  const sorted = [startValue, startValue + rng.int(1, 3), startValue + rng.int(4, 6), startValue + rng.int(7, 9), startValue + rng.int(10, 13)];
  const shuffled = rng.shuffle(sorted);
  return base(opts, {
    topic: 'statistics', difficulty: 2, level: 7, format: 'numeric',
    prompt: `Find the median of: ${shuffled.join(', ')}`,
    answer: { kind: 'number', value: sorted[2] },
    explanation: `In order: ${sorted.join(', ')}. The middle (3rd of 5) value is ${sorted[2]}.`,
    hint: 'Sort the numbers first, then take the middle one.',
  });
};

export const modeOfList: Generator = (rng, opts) => {
  const mode = rng.int(2, 9);
  let other1 = rng.int(2, 9);
  if (other1 === mode) other1 = mode + 1;
  let other2 = rng.int(2, 12);
  if (other2 === mode || other2 === other1) other2 = mode + 2;
  const list = rng.shuffle([mode, mode, mode, other1, other2]);
  return base(opts, {
    topic: 'statistics', difficulty: 1, level: 6, format: 'numeric',
    prompt: `Find the mode of: ${list.join(', ')}`,
    answer: { kind: 'number', value: mode },
    explanation: `${mode} appears three times — more than any other value — so the mode is ${mode}.`,
    hint: 'The mode is the most frequent value.',
  });
};

export const rangeOfList: Generator = (rng, opts) => {
  const min = rng.int(2, 10);
  const max = min + rng.int(5, 20);
  const list = rng.shuffle([min, max, min + rng.int(1, 4), max - rng.int(1, 4)]);
  return base(opts, {
    topic: 'statistics', difficulty: 1, level: 6, format: 'numeric',
    prompt: `Find the range of: ${list.join(', ')}`,
    answer: { kind: 'number', value: max - min },
    explanation: `Range = largest − smallest = ${max} − ${min} = ${max - min}.`,
    hint: 'Biggest minus smallest.',
  });
};

export const simpleProbability: Generator = (rng, opts) => {
  const red = rng.int(2, 5);
  const blue = rng.int(3, 7);
  const [n, d] = simplify(red, red + blue);
  return base(opts, {
    topic: 'probability', difficulty: 3, level: 8, format: 'numeric',
    prompt: `A bag holds ${red} red and ${blue} blue marbles. One marble is taken at random. What is the probability it is red? Answer as a fraction.`,
    answer: { kind: 'fraction', num: n, den: d },
    explanation: `${red} red out of ${red + blue} total gives ${red}/${red + blue}${n !== red ? ` = ${n}/${d}` : ''}.`,
    hint: 'Favourable outcomes over total outcomes.',
  });
};

// ---------------------------------------------------------------------------
// Patterns & sequences (Necromancer)
// ---------------------------------------------------------------------------

export const nextTermArithmetic: Generator = (rng, opts) => {
  const start = rng.int(1, 12);
  const diff = rng.pick([-7, -4, -3, 3, 4, 5, 6, 7, 9]);
  const terms = [0, 1, 2, 3].map((i) => start + i * diff);
  return base(opts, {
    topic: 'sequences', difficulty: 2, level: 7, format: 'numeric',
    prompt: `What is the next term? ${terms.join(', ')}, ...`,
    answer: { kind: 'number', value: start + 4 * diff },
    explanation: `Each term ${diff >= 0 ? 'increases' : 'decreases'} by ${Math.abs(diff)}: ${terms[3]} ${diff >= 0 ? '+' : '−'} ${Math.abs(diff)} = ${start + 4 * diff}.`,
    hint: 'Find the constant difference between terms.',
  });
};

export const nextTermGeometric: Generator = (rng, opts) => {
  const start = rng.int(1, 5);
  const ratio = rng.pick([2, 3]);
  const terms = [0, 1, 2].map((i) => start * ratio ** i);
  return base(opts, {
    topic: 'sequences', difficulty: 3, level: 8, format: 'numeric',
    prompt: `What is the next term? ${terms.join(', ')}, ...`,
    answer: { kind: 'number', value: start * ratio ** 3 },
    explanation: `Each term is multiplied by ${ratio}: ${terms[2]} × ${ratio} = ${start * ratio ** 3}.`,
    hint: 'Each term is the previous one times a fixed number.',
  });
};

export const orderNumbers: Generator = (rng, opts) => {
  const pool = rng.shuffle([rng.int(-9, -1), rng.int(0, 4), rng.int(5, 9), rng.int(10, 20)]);
  const sorted = [...pool].sort((a, b) => a - b);
  const order = sorted.map((v) => pool.indexOf(v));
  return base(opts, {
    topic: 'patterns', difficulty: 2, level: 6, format: 'ordering',
    prompt: 'Tap the numbers from SMALLEST to LARGEST.',
    choices: pool.map(String),
    answer: { kind: 'ordering', order },
    explanation: `From smallest to largest: ${sorted.join(', ')}.`,
    hint: 'Negative numbers are smaller than zero.',
  });
};

// ---------------------------------------------------------------------------
// Advanced (Dragons): simultaneous equations, functions, quadratics, trig,
// coordinate geometry, indices, differentiation
// ---------------------------------------------------------------------------

export const simultaneousEquations: Generator = (rng, opts) => {
  const x = rng.int(1, 8);
  const y = rng.int(1, 8);
  const a = rng.int(1, 3);
  const b = rng.int(1, 3);
  const c1 = a * x + b * y;
  const d = rng.int(1, 3);
  // Guarantee a non-zero determinant: use (a, b) and (d, -1).
  const c2 = d * x - y;
  return base(opts, {
    topic: 'simultaneous_equations', difficulty: 4, level: 'advanced', format: 'multi_step',
    prompt: `Solve the simultaneous equations:\n${a === 1 ? '' : a}x + ${b === 1 ? '' : b}y = ${c1}\n${d === 1 ? '' : d}x − y = ${c2}`,
    steps: ['x = ?', 'y = ?'],
    answer: { kind: 'multi', parts: [{ kind: 'number', value: x }, { kind: 'number', value: y }] },
    explanation: `From the second equation y = ${d === 1 ? '' : d}x − ${c2}. Substitute into the first: x = ${x}, then y = ${y}.`,
    hint: 'Rearrange the second equation to express y, then substitute.',
  });
};

export const functionEvaluate: Generator = (rng, opts) => {
  const a = rng.int(2, 6);
  const b = rng.int(-9, 9);
  const k = rng.int(2, 9);
  return base(opts, {
    topic: 'functions', difficulty: 3, level: 'advanced', format: 'numeric',
    prompt: `If f(x) = ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)}, find f(${k}).`,
    answer: { kind: 'number', value: a * k + b },
    explanation: `f(${k}) = ${a} × ${k} ${b >= 0 ? '+' : '−'} ${Math.abs(b)} = ${a * k + b}.`,
    hint: `Replace x with ${k}.`,
  });
};

export const functionComposite: Generator = (rng, opts) => {
  const a = rng.int(2, 5);
  const b = rng.int(1, 6);
  const c = rng.int(1, 5);
  const k = rng.int(1, 6);
  const inner = k + c;
  return base(opts, {
    topic: 'functions', difficulty: 4, level: 'advanced', format: 'numeric',
    prompt: `f(x) = ${a}x + ${b} and g(x) = x + ${c}. Find f(g(${k})).`,
    answer: { kind: 'number', value: a * inner + b },
    explanation: `g(${k}) = ${k} + ${c} = ${inner}. Then f(${inner}) = ${a} × ${inner} + ${b} = ${a * inner + b}.`,
    hint: 'Work out the inside function first.',
  });
};

export const quadraticRoots: Generator = (rng, opts) => {
  const p = rng.int(-6, -1);
  const q = rng.int(1, 6);
  const sum = p + q;
  const prod = p * q;
  const sumTerm = sum === 0 ? '' : ` ${-sum >= 0 ? '+' : '−'} ${Math.abs(sum) === 1 ? '' : Math.abs(sum)}x`.replace('+ x', '+ x');
  return base(opts, {
    topic: 'quadratics', difficulty: 4, level: 'advanced', format: 'multi_step',
    prompt: `Solve x²${sum === 0 ? '' : sumTerm} ${prod >= 0 ? '+' : '−'} ${Math.abs(prod)} = 0. Enter the smaller root first.`,
    steps: ['Smaller root = ?', 'Larger root = ?'],
    answer: { kind: 'multi', parts: [{ kind: 'number', value: p }, { kind: 'number', value: q }] },
    explanation: `The quadratic factorises as (x ${-p >= 0 ? '+' : '−'} ${Math.abs(p)})(x ${-q >= 0 ? '+' : '−'} ${Math.abs(q)}) = 0, so x = ${p} or x = ${q}.`,
    hint: `Find two numbers that multiply to ${prod} and add to ${sum}.`,
  });
};

export const expandBrackets: Generator = (rng, opts) => {
  const a = rng.int(1, 6);
  const b = rng.int(1, 6);
  const correct = `x² + ${a + b}x + ${a * b}`;
  const options = rng.shuffle([
    correct,
    `x² + ${a * b}x + ${a + b}`,
    `x² + ${a + b}x + ${a + b}`,
    `x² + ${a * b}`,
  ]);
  return base(opts, {
    topic: 'quadratics', difficulty: 3, level: 'advanced', format: 'multiple_choice',
    prompt: `Expand (x + ${a})(x + ${b}).`,
    choices: options,
    answer: { kind: 'choice', index: options.indexOf(correct) },
    explanation: `x·x + x·${b} + ${a}·x + ${a}·${b} = x² + ${a + b}x + ${a * b}.`,
    hint: 'Multiply every term in the first bracket by every term in the second.',
  });
};

export const trigRatio: Generator = (rng, opts) => {
  const triples: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15]];
  const [opp, adj, hyp] = rng.pick(triples);
  const fn = rng.pick(['sin', 'cos', 'tan'] as const);
  const [num, den] = fn === 'sin' ? simplify(opp, hyp) : fn === 'cos' ? simplify(adj, hyp) : simplify(opp, adj);
  return base(opts, {
    topic: 'trigonometry', difficulty: 4, level: 'advanced', format: 'numeric',
    prompt: `In a right-angled triangle, the side OPPOSITE angle θ is ${opp}, the ADJACENT side is ${adj}, and the hypotenuse is ${hyp}. Find ${fn} θ as a fraction.`,
    answer: { kind: 'fraction', num, den },
    explanation: `${fn} θ = ${fn === 'sin' ? 'opposite/hypotenuse' : fn === 'cos' ? 'adjacent/hypotenuse' : 'opposite/adjacent'} = ${fn === 'sin' ? `${opp}/${hyp}` : fn === 'cos' ? `${adj}/${hyp}` : `${opp}/${adj}`}${num / den !== (fn === 'sin' ? opp / hyp : fn === 'cos' ? adj / hyp : opp / adj) ? '' : ` = ${num}/${den}`}.`,
    hint: 'SOH-CAH-TOA.',
  });
};

export const trigExactMC: Generator = (rng, opts) => {
  const facts = [
    { q: 'sin 30°', a: '1/2' },
    { q: 'cos 60°', a: '1/2' },
    { q: 'tan 45°', a: '1' },
    { q: 'sin 90°', a: '1' },
    { q: 'cos 0°', a: '1' },
    { q: 'sin 0°', a: '0' },
  ];
  const f = rng.pick(facts);
  const distractorPool = ['0', '1/2', '1', '2', '√3', '1/4'].filter((d) => d !== f.a);
  const options = rng.shuffle([f.a, ...rng.shuffle(distractorPool).slice(0, 3)]);
  return base(opts, {
    topic: 'trigonometry', difficulty: 3, level: 'advanced', format: 'multiple_choice',
    prompt: `What is the exact value of ${f.q}?`,
    choices: options,
    answer: { kind: 'choice', index: options.indexOf(f.a) },
    explanation: `${f.q} = ${f.a} — one of the exact values worth memorising.`,
    hint: 'These come from the special 30-60-90 and 45-45-90 triangles.',
  });
};

export const distanceBetweenPoints: Generator = (rng, opts) => {
  const triples: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]];
  const [dx, dy, dist] = rng.pick(triples);
  const x1 = rng.int(-5, 5);
  const y1 = rng.int(-5, 5);
  return base(opts, {
    topic: 'coordinates', difficulty: 4, level: 'advanced', format: 'numeric',
    prompt: `Find the distance between A(${x1}, ${y1}) and B(${x1 + dx}, ${y1 + dy}).`,
    answer: { kind: 'number', value: dist },
    explanation: `Δx = ${dx}, Δy = ${dy}. Distance = √(${dx}² + ${dy}²) = √${dx * dx + dy * dy} = ${dist}.`,
    hint: 'Use Pythagoras on the differences in x and y.',
  });
};

export const gradientOfLine: Generator = (rng, opts) => {
  const m = rng.pick([-3, -2, -1, 1, 2, 3, 4]);
  const x1 = rng.int(-4, 2);
  const dx = rng.int(1, 4);
  const y1 = rng.int(-5, 5);
  return base(opts, {
    topic: 'coordinates', difficulty: 3, level: 'advanced', format: 'numeric',
    prompt: `Find the gradient of the line through (${x1}, ${y1}) and (${x1 + dx}, ${y1 + m * dx}).`,
    answer: { kind: 'number', value: m },
    explanation: `Gradient = rise/run = (${y1 + m * dx} − ${y1}) / (${x1 + dx} − ${x1}) = ${m * dx}/${dx} = ${m}.`,
    hint: 'Change in y divided by change in x.',
  });
};

export const indicesLaw: Generator = (rng, opts) => {
  const baseN = rng.pick([2, 3, 5]);
  const m = rng.int(1, 3);
  const n = rng.int(1, 3);
  return base(opts, {
    topic: 'functions', difficulty: 3, level: 'advanced', format: 'numeric',
    prompt: `Calculate the value of ${baseN}^${m} × ${baseN}^${n}.`,
    answer: { kind: 'number', value: baseN ** (m + n) },
    explanation: `Add the indices: ${baseN}^${m} × ${baseN}^${n} = ${baseN}^${m + n} = ${baseN ** (m + n)}.`,
    hint: 'Same base: add the powers.',
  });
};

export const differentiatePolynomial: Generator = (rng, opts) => {
  const a = rng.int(2, 6);
  const n = rng.int(2, 4);
  const correct = `${a * n}x${n - 1 === 1 ? '' : `^${n - 1}`}`;
  const options = rng.shuffle([
    correct,
    `${a}x^${n - 1}`,
    `${a * n}x^${n}`,
    `${a + n}x${n - 1 === 1 ? '' : `^${n - 1}`}`,
  ]);
  return base(opts, {
    topic: 'differentiation', difficulty: 5, level: 'advanced', format: 'multiple_choice',
    prompt: `(Optional challenge) Differentiate y = ${a}x^${n} with respect to x.`,
    choices: options,
    answer: { kind: 'choice', index: options.indexOf(correct) },
    explanation: `Bring the power down and reduce it by one: dy/dx = ${a}·${n}·x^${n - 1} = ${correct}.`,
    hint: 'Multiply by the power, then lower the power by one.',
  });
};

// ---------------------------------------------------------------------------
// Crisis questions (reward value = damage-reduction points)
// ---------------------------------------------------------------------------

export const crisisRate: Generator = (rng, opts) => {
  const perHour = rng.pick([8, 12, 15, 20, 25]);
  const hours = rng.int(3, 6);
  return base(opts, {
    topic: 'multi_step', difficulty: 3, level: 7, format: 'numeric',
    prompt: `EMERGENCY: Flood water rises ${perHour} cm every hour. How many centimetres will it rise in ${hours} hours?`,
    answer: { kind: 'number', value: perHour * hours },
    explanation: `${perHour} cm/hour × ${hours} hours = ${perHour * hours} cm.`,
    hint: 'Rate × time.',
    reward: 100,
  });
};

export const crisisBudget: Generator = (rng, opts) => {
  const price = rng.pick([12, 15, 20, 25]);
  const count = rng.int(6, 12);
  const budget = price * count;
  return base(opts, {
    topic: 'multi_step', difficulty: 3, level: 7, format: 'numeric',
    prompt: `EMERGENCY: Sandbags cost ${price} birr each. The council has ${budget} birr. How many sandbags can it buy?`,
    answer: { kind: 'number', value: count },
    explanation: `${budget} ÷ ${price} = ${count} sandbags.`,
    hint: 'Divide the budget by the price.',
    reward: 80,
  });
};

export const crisisCapacity: Generator = (rng, opts) => {
  const perMinute = rng.pick([150, 200, 250, 300]);
  const minutes = rng.int(3, 6);
  return base(opts, {
    topic: 'multi_step', difficulty: 3, level: 7, format: 'numeric',
    prompt: `EMERGENCY: A drainage channel moves ${perMinute} litres of water per minute. How many litres in ${minutes} minutes?`,
    answer: { kind: 'number', value: perMinute * minutes },
    explanation: `${perMinute} L/min × ${minutes} min = ${perMinute * minutes} litres.`,
    hint: 'Multiply the rate by the minutes.',
    reward: 70,
  });
};

export const crisisShare: Generator = (rng, opts) => {
  const shelters = rng.pick([4, 5, 8]);
  const people = shelters * rng.int(20, 60);
  return base(opts, {
    topic: 'multi_step', difficulty: 3, level: 7, format: 'numeric',
    prompt: `EMERGENCY: ${people} people must be shared equally between ${shelters} shelters. How many people per shelter?`,
    answer: { kind: 'number', value: people / shelters },
    explanation: `${people} ÷ ${shelters} = ${people / shelters} people per shelter.`,
    hint: 'Divide people by shelters.',
    reward: 80,
  });
};

// ---------------------------------------------------------------------------
// Generator groups used by the bank builder
// ---------------------------------------------------------------------------

export const STANDARD_GENERATORS: { gen: Generator; count: number }[] = [
  { gen: integerAdd, count: 4 },
  { gen: integerSubtract, count: 3 },
  { gen: integerMultiply, count: 3 },
  { gen: orderOfOperations, count: 3 },
  { gen: orderOfOperationsParen, count: 2 },
  { gen: longMultiplication, count: 2 },
  { gen: division, count: 3 },
  { gen: fractionAddSameDen, count: 3 },
  { gen: fractionAddDiffDen, count: 2 },
  { gen: fractionSimplifyMC, count: 2 },
  { gen: fractionOfQuantity, count: 3 },
  { gen: ratioShare, count: 3 },
  { gen: ratioSimplifyMC, count: 2 },
  { gen: percentOf, count: 3 },
  { gen: percentIncrease, count: 3 },
  { gen: oneStepEquation, count: 3 },
  { gen: twoStepEquation, count: 3 },
  { gen: equationBothSides, count: 2 },
  { gen: inequalityMC, count: 2 },
  { gen: rectangleArea, count: 3 },
  { gen: triangleArea, count: 2 },
  { gen: rectanglePerimeter, count: 2 },
  { gen: unitConversionMC, count: 2 },
  { gen: midpoint, count: 2 },
  { gen: reflection, count: 2 },
  { gen: mapScale, count: 2 },
  { gen: meanOfList, count: 2 },
  { gen: medianOfList, count: 2 },
  { gen: modeOfList, count: 1 },
  { gen: rangeOfList, count: 1 },
  { gen: simpleProbability, count: 2 },
  { gen: nextTermArithmetic, count: 2 },
  { gen: nextTermGeometric, count: 2 },
  { gen: orderNumbers, count: 2 },
];

export const ADVANCED_GENERATORS: { gen: Generator; count: number }[] = [
  { gen: simultaneousEquations, count: 4 },
  { gen: functionEvaluate, count: 3 },
  { gen: functionComposite, count: 2 },
  { gen: quadraticRoots, count: 3 },
  { gen: expandBrackets, count: 2 },
  { gen: trigRatio, count: 2 },
  { gen: trigExactMC, count: 2 },
  { gen: distanceBetweenPoints, count: 2 },
  { gen: gradientOfLine, count: 2 },
  { gen: indicesLaw, count: 2 },
  { gen: differentiatePolynomial, count: 2 },
];

export const CRISIS_GENERATORS: { gen: Generator; count: number }[] = [
  { gen: crisisRate, count: 3 },
  { gen: crisisBudget, count: 3 },
  { gen: crisisCapacity, count: 3 },
  { gen: crisisShare, count: 3 },
];

export const ATTACK_GENERATORS: { gen: Generator; count: number }[] = [
  { gen: integerMultiply, count: 3 },
  { gen: percentOf, count: 3 },
  { gen: orderOfOperations, count: 2 },
  { gen: division, count: 2 },
  { gen: fractionOfQuantity, count: 2 },
];

export const DEFENSE_GENERATORS: { gen: Generator; count: number }[] = [
  { gen: oneStepEquation, count: 3 },
  { gen: twoStepEquation, count: 3 },
  { gen: inequalityMC, count: 2 },
  { gen: rectanglePerimeter, count: 2 },
  { gen: meanOfList, count: 2 },
];

/** Topic-keyed generators used for Training Academy paths and character trials. */
export const TOPIC_GENERATORS: Partial<Record<QuestionTopic, Generator[]>> = {
  integers: [integerAdd, integerSubtract, integerMultiply],
  arithmetic: [orderOfOperations, orderOfOperationsParen, division, longMultiplication],
  fractions: [fractionAddSameDen, fractionAddDiffDen, fractionSimplifyMC, fractionOfQuantity],
  ratios: [ratioShare, ratioSimplifyMC],
  percentages: [percentOf, percentIncrease],
  equations: [oneStepEquation, twoStepEquation, equationBothSides],
  inequalities: [inequalityMC],
  geometry: [triangleArea, rectangleArea],
  area: [rectangleArea, triangleArea],
  perimeter: [rectanglePerimeter],
  measurement: [unitConversionMC],
  coordinates: [midpoint, reflection, distanceBetweenPoints, gradientOfLine],
  scale: [mapScale],
  statistics: [meanOfList, medianOfList, modeOfList, rangeOfList],
  probability: [simpleProbability],
  patterns: [orderNumbers, nextTermArithmetic],
  sequences: [nextTermArithmetic, nextTermGeometric],
  multi_step: [crisisRate, crisisShare, simultaneousEquations],
  functions: [functionEvaluate, functionComposite, indicesLaw],
  simultaneous_equations: [simultaneousEquations],
  quadratics: [quadraticRoots, expandBrackets],
  trigonometry: [trigRatio, trigExactMC],
  differentiation: [differentiatePolynomial],
};
