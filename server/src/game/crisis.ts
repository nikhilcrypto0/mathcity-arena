import type { CrisisId, CrisisReport, StructureId } from '@mathcity/shared';
import {
  CRISES,
  EMERGENCY_RESERVE_COINS,
  EMERGENCY_RESERVE_REDUCTION,
  STRUCTURES,
} from '@mathcity/shared';

export interface CrisisCalcInput {
  crisisId: CrisisId;
  structures: Partial<Record<StructureId, number>>;
  /** Sum of reward values of correctly answered crisis questions. */
  answerReduction: number;
  correctAnswers: number;
  coinsHeld: number;
}

/**
 * Compute final crisis damage for one team. The base damage is IDENTICAL for
 * every team — final damage differs only through preparation: structures,
 * correct crisis answers and saved reserves. Fully transparent breakdown.
 */
export function computeCrisisDamage(input: CrisisCalcInput): CrisisReport {
  const crisis = CRISES[input.crisisId];
  let structureReduction = 0;
  const breakdownLines: string[] = [`Base ${crisis.name} damage: ${crisis.baseDamage}`];

  for (const [structureId, count] of Object.entries(input.structures)) {
    if (!count) continue;
    const def = STRUCTURES[structureId as StructureId];
    const per = def.crisisReduction[input.crisisId] ?? 0;
    if (per > 0) {
      const reduction = per * count;
      structureReduction += reduction;
      breakdownLines.push(`${def.name}${count > 1 ? ` ×${count}` : ''}: −${reduction}`);
    }
  }

  const answerReduction = Math.max(0, Math.round(input.answerReduction));
  if (answerReduction > 0) {
    breakdownLines.push(
      `${input.correctAnswers} correct crisis answer${input.correctAnswers === 1 ? '' : 's'}: −${answerReduction}`,
    );
  }

  const reserveReduction =
    input.coinsHeld >= EMERGENCY_RESERVE_COINS ? EMERGENCY_RESERVE_REDUCTION : 0;
  if (reserveReduction > 0) {
    breakdownLines.push(`Emergency reserve (${input.coinsHeld} coins saved): −${reserveReduction}`);
  }

  const finalDamage = Math.max(
    0,
    crisis.baseDamage - structureReduction - answerReduction - reserveReduction,
  );
  breakdownLines.push(`Final damage: ${finalDamage}`);

  return {
    crisisId: input.crisisId,
    baseDamage: crisis.baseDamage,
    structureReduction,
    answerReduction,
    reserveReduction,
    finalDamage,
    correctAnswers: input.correctAnswers,
    breakdownLines,
  };
}
