package com.pimvanleeuwen.the_harry_list_backend.model;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * The allowed moves between {@link ReservationStatus} values.
 *
 * <p>This is the single source of truth for the admin "Change Status" menu (which only offers
 * the legal targets for the current status) and for the server-side guard on
 * {@code PATCH /api/admin/reservations/{id}/status}.
 *
 * <p>The matrix is a superset of every transition the admin UI could perform before
 * {@link ReservationStatus#IN_PROGRESS} existed, so enforcing it does not invalidate any
 * workflow that already shipped.
 */
public final class ReservationStatusTransitions {

    private ReservationStatusTransitions() {
    }

    private static final Map<ReservationStatus, Set<ReservationStatus>> ALLOWED =
            new EnumMap<>(ReservationStatus.class);

    static {
        // A fresh request can be picked up, decided on directly, or withdrawn.
        ALLOWED.put(ReservationStatus.PENDING, EnumSet.of(
                ReservationStatus.IN_PROGRESS,
                ReservationStatus.CONFIRMED,
                ReservationStatus.REJECTED,
                ReservationStatus.CANCELLED));

        // Being worked on: any decision is still open, and it can be put back on the pile.
        ALLOWED.put(ReservationStatus.IN_PROGRESS, EnumSet.of(
                ReservationStatus.CONFIRMED,
                ReservationStatus.REJECTED,
                ReservationStatus.CANCELLED,
                ReservationStatus.PENDING));

        // Once confirmed the event either happens or is called off.
        ALLOWED.put(ReservationStatus.CONFIRMED, EnumSet.of(
                ReservationStatus.COMPLETED,
                ReservationStatus.CANCELLED));

        // Rejections and cancellations are often only about a date or location that can still be
        // fixed, so both can be reopened rather than asking the customer to submit again.
        ALLOWED.put(ReservationStatus.REJECTED, EnumSet.of(ReservationStatus.PENDING));
        ALLOWED.put(ReservationStatus.CANCELLED, EnumSet.of(ReservationStatus.PENDING));

        // Terminal.
        ALLOWED.put(ReservationStatus.COMPLETED, EnumSet.noneOf(ReservationStatus.class));
    }

    /** The statuses a reservation currently in {@code from} may move to. Never null. */
    public static Set<ReservationStatus> allowedFrom(ReservationStatus from) {
        if (from == null) {
            // A row with no status behaves as PENDING everywhere else (see Reservation#onCreate).
            return allowedFrom(ReservationStatus.PENDING);
        }
        return Collections.unmodifiableSet(
                ALLOWED.getOrDefault(from, EnumSet.noneOf(ReservationStatus.class)));
    }

    /**
     * Whether the move is permitted. Re-applying the current status is always allowed so that a
     * retried or duplicated request stays idempotent instead of failing.
     */
    public static boolean isAllowed(ReservationStatus from, ReservationStatus to) {
        if (to == null) {
            return false;
        }
        if (from == to) {
            return true;
        }
        return allowedFrom(from).contains(to);
    }
}
