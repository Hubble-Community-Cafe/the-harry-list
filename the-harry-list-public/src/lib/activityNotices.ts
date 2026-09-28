import type { FormConstraint } from '../types/reservation';

/**
 * targetValue marker that opts an ACTIVITY_NOTICE into a confirmation dialog rather than
 * a passive banner. Must match FormConstraint.ACTIVITY_NOTICE_CONFIRM in the backend and
 * the constant in the admin's FormSettingsPage.
 */
export const ACTIVITY_NOTICE_CONFIRM = 'CONFIRM';

/** The parts of the form an ACTIVITY_NOTICE can be conditional on. */
export interface NoticeContext {
  activities: string[];
  location?: string | null;
  guests?: number;
}

/**
 * Whether a notice's optional extra conditions hold: secondaryValue limits it to one
 * location, numericValue to groups of at least that many guests. Empty means "any".
 */
export function noticeConditionsMet(c: FormConstraint, ctx: NoticeContext): boolean {
  if (c.secondaryValue && c.secondaryValue !== ctx.location) return false;
  if (c.numericValue != null && !((ctx.guests ?? 0) >= c.numericValue)) return false;
  return true;
}

/** Whether a notice applies to the form as currently filled in. */
export function noticeApplies(c: FormConstraint, ctx: NoticeContext): boolean {
  return c.constraintType === 'ACTIVITY_NOTICE'
    && ctx.activities.includes(c.triggerActivity)
    && noticeConditionsMet(c, ctx);
}

/** Whether a notice asks the guest to acknowledge it in a dialog. */
export function requiresConfirmation(c: FormConstraint): boolean {
  return c.constraintType === 'ACTIVITY_NOTICE' && c.targetValue === ACTIVITY_NOTICE_CONFIRM;
}
