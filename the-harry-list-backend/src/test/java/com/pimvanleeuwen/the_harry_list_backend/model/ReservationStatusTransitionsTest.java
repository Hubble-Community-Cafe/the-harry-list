package com.pimvanleeuwen.the_harry_list_backend.model;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for the reservation status workflow.
 *
 * <p>The matrix is asserted exhaustively (every from/to pair) rather than by example, so that
 * adding a status without deciding where it may go fails here instead of in production.
 */
class ReservationStatusTransitionsTest {

    @Test
    void pending_canBePickedUpDecidedOrWithdrawn() {
        assertEquals(
                Set.of(ReservationStatus.IN_PROGRESS, ReservationStatus.CONFIRMED,
                        ReservationStatus.REJECTED, ReservationStatus.CANCELLED),
                ReservationStatusTransitions.allowedFrom(ReservationStatus.PENDING));
    }

    @Test
    void inProgress_keepsEveryDecisionOpenAndCanGoBackToPending() {
        assertEquals(
                Set.of(ReservationStatus.CONFIRMED, ReservationStatus.REJECTED,
                        ReservationStatus.CANCELLED, ReservationStatus.PENDING),
                ReservationStatusTransitions.allowedFrom(ReservationStatus.IN_PROGRESS));
    }

    @Test
    void confirmed_canOnlyCompleteOrCancel() {
        assertEquals(
                Set.of(ReservationStatus.COMPLETED, ReservationStatus.CANCELLED),
                ReservationStatusTransitions.allowedFrom(ReservationStatus.CONFIRMED));
    }

    @Test
    void rejectedAndCancelled_canBeReopenedToPending() {
        assertEquals(Set.of(ReservationStatus.PENDING),
                ReservationStatusTransitions.allowedFrom(ReservationStatus.REJECTED));
        assertEquals(Set.of(ReservationStatus.PENDING),
                ReservationStatusTransitions.allowedFrom(ReservationStatus.CANCELLED));
    }

    @Test
    void completed_isTerminal() {
        assertTrue(ReservationStatusTransitions.allowedFrom(ReservationStatus.COMPLETED).isEmpty());
    }

    @Test
    void confirmed_cannotGoBackToPendingOrInProgress() {
        assertFalse(ReservationStatusTransitions.isAllowed(
                ReservationStatus.CONFIRMED, ReservationStatus.PENDING));
        assertFalse(ReservationStatusTransitions.isAllowed(
                ReservationStatus.CONFIRMED, ReservationStatus.IN_PROGRESS));
    }

    @Test
    void completed_cannotBeMovedAnywhere() {
        for (ReservationStatus to : ReservationStatus.values()) {
            if (to == ReservationStatus.COMPLETED) continue;
            assertFalse(ReservationStatusTransitions.isAllowed(ReservationStatus.COMPLETED, to),
                    "COMPLETED should not be movable to " + to);
        }
    }

    @Test
    void onlyConfirmedCanBeCompleted() {
        for (ReservationStatus from : ReservationStatus.values()) {
            boolean expected = from == ReservationStatus.CONFIRMED || from == ReservationStatus.COMPLETED;
            assertEquals(expected,
                    ReservationStatusTransitions.isAllowed(from, ReservationStatus.COMPLETED),
                    "COMPLETED reachable from " + from);
        }
    }

    @Test
    void reapplyingTheSameStatusIsIdempotentNotAnError() {
        for (ReservationStatus status : ReservationStatus.values()) {
            assertTrue(ReservationStatusTransitions.isAllowed(status, status),
                    "Re-applying " + status + " should be allowed");
        }
    }

    @Test
    void nullTargetIsNeverAllowed() {
        for (ReservationStatus from : ReservationStatus.values()) {
            assertFalse(ReservationStatusTransitions.isAllowed(from, null));
        }
    }

    /** A row with no status behaves as PENDING everywhere else, so it must here too. */
    @Test
    void nullSourceIsTreatedAsPending() {
        assertEquals(ReservationStatusTransitions.allowedFrom(ReservationStatus.PENDING),
                ReservationStatusTransitions.allowedFrom(null));
        assertTrue(ReservationStatusTransitions.isAllowed(null, ReservationStatus.IN_PROGRESS));
    }

    @Test
    void everyStatusHasAnExplicitEntry() {
        for (ReservationStatus from : ReservationStatus.values()) {
            assertNotNull(ReservationStatusTransitions.allowedFrom(from),
                    "No transition set declared for " + from);
        }
    }

    @Test
    void allowedSetsAreImmutable() {
        Set<ReservationStatus> allowed =
                ReservationStatusTransitions.allowedFrom(ReservationStatus.PENDING);
        assertThrows(UnsupportedOperationException.class,
                () -> allowed.add(ReservationStatus.COMPLETED));
    }

    /**
     * Every transition the admin UI could perform before IN_PROGRESS existed must still be legal,
     * so enforcing the matrix cannot break a workflow that already shipped.
     */
    @Test
    void preExistingTransitionsRemainAllowed() {
        assertTrue(ReservationStatusTransitions.isAllowed(
                ReservationStatus.PENDING, ReservationStatus.CONFIRMED));
        assertTrue(ReservationStatusTransitions.isAllowed(
                ReservationStatus.PENDING, ReservationStatus.REJECTED));
        assertTrue(ReservationStatusTransitions.isAllowed(
                ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED));
        assertTrue(ReservationStatusTransitions.isAllowed(
                ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED));
        assertTrue(ReservationStatusTransitions.isAllowed(
                ReservationStatus.REJECTED, ReservationStatus.PENDING));
    }
}
