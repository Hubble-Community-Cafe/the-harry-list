package com.pimvanleeuwen.the_harry_list_backend.model;

import java.util.function.Predicate;

/**
 * The templated, staff-triggered mails that can be sent to a reservation's contact.
 *
 * <p>Deliberately narrower than {@link EmailTemplateType}: that enum also covers automatic
 * mails (submission, status change) and the staff notification, none of which may be fired at a
 * customer from the admin's "Send Mail" menu. Keeping this a separate, small enum means the
 * mail endpoints cannot be driven into sending an arbitrary template.
 *
 * <p>Each entry also owns the rule for <em>when</em> it applies, so the availability shown in
 * the admin UI and the availability enforced by the API cannot drift apart.
 */
public enum ReservationMailType {

    CATERING(EmailTemplateType.CATERING_OPTIONS, "Catering options",
            Reservation::hasCateringActivity),

    COBO(EmailTemplateType.COBO_OPTIONS, "CoBo information",
            Reservation::hasCoboActivity);

    private final EmailTemplateType templateType;
    private final String displayName;
    private final Predicate<Reservation> applicability;

    ReservationMailType(EmailTemplateType templateType, String displayName,
                        Predicate<Reservation> applicability) {
        this.templateType = templateType;
        this.displayName = displayName;
        this.applicability = applicability;
    }

    public EmailTemplateType getTemplateType() {
        return templateType;
    }

    public String getDisplayName() {
        return displayName;
    }

    /**
     * Whether this mail makes sense for the given reservation, i.e. it has the matching special
     * activity. A rejected reservation is excluded regardless, as there is nothing to follow up on.
     */
    public boolean isAvailableFor(Reservation reservation) {
        if (reservation == null || reservation.getStatus() == ReservationStatus.REJECTED) {
            return false;
        }
        return applicability.test(reservation);
    }
}
