import type { AnswerSpec, SubmittedAnswer } from '@mathcity/shared';

const DEFAULT_TOLERANCE = 0.001;

/**
 * Parse a free-text numeric answer. Handles whitespace, sign, decimals,
 * fractions ("3/4", "-2/5"), mixed numbers ("1 1/2"), thousands commas and a
 * trailing percent sign. Returns null (never throws) for garbage or division
 * by zero.
 */
export function parseNumeric(rawInput: string): number | null {
  if (typeof rawInput !== 'string') return null;
  let raw = rawInput.trim().replace(/\s+/g, ' ');
  if (raw === '') return null;
  raw = raw.replace(/%$/, '').trim();
  raw = raw.replace(/,(?=\d{3}\b)/g, '');

  // Mixed number: "1 1/2" or "-1 1/2"
  const mixed = raw.match(/^(-?)(\d+) (\d+)\/(\d+)$/);
  if (mixed) {
    const sign = mixed[1] === '-' ? -1 : 1;
    const whole = Number(mixed[2]);
    const num = Number(mixed[3]);
    const den = Number(mixed[4]);
    if (den === 0) return null;
    return sign * (whole + num / den);
  }

  // Plain fraction: "3/4", "-3/4", "3/-4"
  const frac = raw.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const num = Number(frac[1]);
    const den = Number(frac[2]);
    if (den === 0) return null;
    return num / den;
  }

  const cleaned = raw.replace(/\s/g, '');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Parse "3,4" / "(3, 4)" / "3 4" into a coordinate pair. */
export function parseCoordinate(rawInput: string): { x: number; y: number } | null {
  if (typeof rawInput !== 'string') return null;
  const raw = rawInput.trim().replace(/^\(|\)$/g, '');
  const parts = raw.split(/[,;]| +/).filter((p) => p.length > 0);
  if (parts.length !== 2) return null;
  const x = parseNumeric(parts[0]);
  const y = parseNumeric(parts[1]);
  if (x === null || y === null) return null;
  return { x, y };
}

function numbersMatch(expected: number, actual: number, tolerance: number): boolean {
  return Math.abs(expected - actual) <= tolerance + 1e-9;
}

export function validateAnswer(spec: AnswerSpec, submitted: SubmittedAnswer): boolean {
  switch (spec.kind) {
    case 'number': {
      if (submitted.kind !== 'number') return false;
      const value = parseNumeric(submitted.raw);
      if (value === null) return false;
      return numbersMatch(spec.value, value, spec.tolerance ?? DEFAULT_TOLERANCE);
    }
    case 'fraction': {
      if (submitted.kind !== 'number') return false;
      if (spec.den === 0) return false;
      const value = parseNumeric(submitted.raw);
      if (value === null) return false;
      return numbersMatch(spec.num / spec.den, value, DEFAULT_TOLERANCE);
    }
    case 'choice': {
      return submitted.kind === 'choice' && submitted.index === spec.index;
    }
    case 'coordinate': {
      if (submitted.kind !== 'coordinate') return false;
      const point = parseCoordinate(submitted.raw);
      if (!point) return false;
      const tol = spec.tolerance ?? DEFAULT_TOLERANCE;
      return numbersMatch(spec.x, point.x, tol) && numbersMatch(spec.y, point.y, tol);
    }
    case 'ordering': {
      if (submitted.kind !== 'ordering') return false;
      if (submitted.order.length !== spec.order.length) return false;
      return spec.order.every((v, i) => submitted.order[i] === v);
    }
    case 'multi': {
      if (submitted.kind !== 'multi') return false;
      if (submitted.parts.length !== spec.parts.length) return false;
      return spec.parts.every((part, i) => validateAnswer(part, submitted.parts[i]));
    }
  }
}
