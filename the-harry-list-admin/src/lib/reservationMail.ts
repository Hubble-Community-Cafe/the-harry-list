/**
 * The templated, staff-triggered mails offered by the "Send Mail" menu.
 *
 * Mirrors `ReservationMailType` in the backend, which is the authority: sending a mail that does
 * not apply is rejected with 400 regardless of what this file says. This copy exists so the menu
 * only offers mails that will actually send. Keep the two in sync —
 * `reservationMail.test.ts` pins the expected shape.
 */

export type ReservationMailTypeValue = 'CATERING' | 'COBO';

export interface MailTypeConfig {
  /** Title shown on the menu item and as the dialog heading. */
  label: string;
  /** Activities that make this mail applicable. */
  activities: string[];
  /**
   * Whether every active attachment starts ticked. Catering menus are almost always all sent
   * together; a CoBo mail attaches whatever that particular booking needs, so it starts empty
   * rather than pre-ticking the catering PDFs from the shared pool.
   */
  preselectAllAttachments: boolean;
}

export const MAIL_TYPES: Record<ReservationMailTypeValue, MailTypeConfig> = {
  CATERING: {
    label: 'Catering Options',
    activities: ['EAT_A_LA_CARTE', 'EAT_CATERING', 'CATERING_CORONA_ROOM'],
    preselectAllAttachments: true,
  },
  COBO: {
    label: 'CoBo Information',
    activities: ['COBO'],
    preselectAllAttachments: false,
  },
};

export const MAIL_TYPE_VALUES = Object.keys(MAIL_TYPES) as ReservationMailTypeValue[];

/**
 * Which mails apply to a reservation. A rejected reservation gets none — there is nothing left
 * to follow up on — matching the backend's `ReservationMailType#isAvailableFor`.
 */
export function availableMailTypes(
  reservation: { status?: string; specialActivities?: string[] } | null | undefined,
): ReservationMailTypeValue[] {
  if (!reservation || reservation.status === 'REJECTED') return [];
  return MAIL_TYPE_VALUES.filter((type) =>
    reservation.specialActivities?.some((a) => MAIL_TYPES[type].activities.includes(a)),
  );
}
