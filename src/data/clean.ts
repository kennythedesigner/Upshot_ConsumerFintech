/**
 * Cleans and checks onboarding text before it is saved (checklist section 3).
 *
 * On write: normalize, strip invisible control characters, trim, and enforce
 * the same length limits the database enforces. We do NOT HTML-escape on
 * write; that would show "&amp;" to the PM later. Escaping happens on render:
 * React escapes text automatically, so screens must never use
 * dangerouslySetInnerHTML for these fields.
 */

/** D59 (confirmed 2026-11-09). The migration's check constraints must match. */
export const LIMITS = {
  portfolioName: 100,
  businessGoal: 550,
  goalName: 80,
  goalCount: 10,
} as const;

// C0 controls (except tab/newline, which become spaces), DEL, C1 controls,
// and zero-width / bidi-override characters that can disguise text.
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/g;

/** Normalize, drop invisible characters, collapse whitespace, trim. */
export function cleanText(input: string): string {
  return input
    .normalize('NFC')
    .replace(/[\t\n\r]+/g, ' ')
    .replace(INVISIBLE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface OnboardingInput {
  portfolioName?: string;
  businessGoal: string;
  goals: Array<{ id: string; name: string }>;
}

export interface CleanOnboarding {
  portfolioName: string;
  businessGoal: string | null;
  goals: Array<{ id: string; name: string; sort_order: number }>;
}

export type CleanResult = { ok: true; value: CleanOnboarding } | { ok: false; problems: string[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cleanOnboarding(input: OnboardingInput): CleanResult {
  const problems: string[] = [];

  const portfolioName = cleanText(input.portfolioName ?? '') || 'My portfolio';
  if (portfolioName.length > LIMITS.portfolioName) {
    problems.push(`Keep the portfolio name to ${LIMITS.portfolioName} characters.`);
  }

  const goalText = cleanText(input.businessGoal);
  if (goalText.length > LIMITS.businessGoal) {
    problems.push(`Keep the business goal to ${LIMITS.businessGoal} characters.`);
  }

  if (input.goals.length > LIMITS.goalCount) {
    problems.push(`Use ${LIMITS.goalCount} goals or fewer.`);
  }

  const seen = new Set<string>();
  const goals = input.goals.map((g, n) => {
    const name = cleanText(g.name);
    if (!UUID.test(g.id)) problems.push(`Goal ${n + 1} is missing its id.`);
    if (!name) problems.push(`Goal ${n + 1} needs a name.`);
    if (name.length > LIMITS.goalName) problems.push(`Keep goal names to ${LIMITS.goalName} characters.`);
    const key = name.toLocaleLowerCase();
    if (name && seen.has(key)) problems.push(`"${name}" is listed twice.`);
    seen.add(key);
    return { id: g.id, name, sort_order: n };
  });

  if (problems.length) return { ok: false, problems: [...new Set(problems)] };
  return { ok: true, value: { portfolioName, businessGoal: goalText || null, goals } };
}
