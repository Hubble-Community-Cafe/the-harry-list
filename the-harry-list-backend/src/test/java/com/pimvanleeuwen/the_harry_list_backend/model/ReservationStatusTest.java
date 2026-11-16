package com.pimvanleeuwen.the_harry_list_backend.model;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The full status transition table: every pair of statuses, so a new or changed transition
 * shows up here as a deliberate edit.
 */
class ReservationStatusTest {

    @ParameterizedTest(name = "{0} -> {1} allowed: {2}")
    @CsvSource({
            "PENDING,   PENDING,   false",
            "PENDING,   CONFIRMED, true",
            "PENDING,   REJECTED,  true",
            "PENDING,   CANCELLED, false",
            "CONFIRMED, PENDING,   false",
            "CONFIRMED, CONFIRMED, false",
            "CONFIRMED, REJECTED,  false",
            "CONFIRMED, CANCELLED, true",
            "REJECTED,  PENDING,   true",
            "REJECTED,  CONFIRMED, false",
            "REJECTED,  REJECTED,  false",
            "REJECTED,  CANCELLED, false",
            "CANCELLED, PENDING,   true",
            "CANCELLED, CONFIRMED, false",
            "CANCELLED, REJECTED,  false",
            "CANCELLED, CANCELLED, false",
    })
    void canMoveTo(ReservationStatus from, ReservationStatus to, boolean allowed) {
        assertEquals(allowed, from.canMoveTo(to));
    }
}
