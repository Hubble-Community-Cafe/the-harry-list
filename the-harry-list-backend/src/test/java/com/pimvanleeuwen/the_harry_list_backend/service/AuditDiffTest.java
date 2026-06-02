package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class AuditDiffTest {

    @Test
    void compare_shouldDetectChangedFields() {
        Reservation before = base();
        Reservation after = base();
        after.setContactName("New Name");
        after.setExpectedGuests(50);

        List<FieldChange> changes = AuditDiff.compare(before, after);

        assertEquals(2, changes.size());
        assertTrue(changes.stream().anyMatch(c ->
                c.field().equals("contactName") && "Old Name".equals(c.oldValue()) && "New Name".equals(c.newValue())));
        assertTrue(changes.stream().anyMatch(c ->
                c.field().equals("expectedGuests") && "20".equals(c.oldValue()) && "50".equals(c.newValue())));
    }

    @Test
    void compare_shouldIgnoreMetadataFields() {
        Reservation before = base();
        Reservation after = base();
        after.setId(999L);
        after.setCreatedAt(LocalDateTime.of(2030, 1, 1, 0, 0));
        after.setUpdatedAt(LocalDateTime.of(2030, 1, 1, 0, 0));

        List<FieldChange> changes = AuditDiff.compare(before, after);

        assertTrue(changes.isEmpty(), "id/createdAt/updatedAt must be ignored");
    }

    @Test
    void compare_shouldReturnEmptyWhenUnchanged() {
        assertTrue(AuditDiff.compare(base(), base()).isEmpty());
    }

    @Test
    void compare_shouldTreatNullAndBlankStringAsEqual() {
        // Common case: an edit form sends "" for a field that was null in the DB.
        Reservation before = base();
        before.setComments(null);
        before.setCostCenter(null);
        Reservation after = base();
        after.setComments("");
        after.setCostCenter("   ");

        assertTrue(AuditDiff.compare(before, after).isEmpty(),
                "null vs empty/blank string must not be reported as a change");
    }

    @Test
    void compare_shouldStillDetectBlankToRealValue() {
        Reservation before = base();
        before.setComments("");
        Reservation after = base();
        after.setComments("Details");

        List<FieldChange> changes = AuditDiff.compare(before, after);

        assertEquals(1, changes.size());
        assertEquals("comments", changes.get(0).field());
        assertNull(changes.get(0).oldValue(), "blank old value should normalize to null");
        assertEquals("Details", changes.get(0).newValue());
    }

    @Test
    void compare_shouldReturnEmptyWhenEitherSideNull() {
        assertTrue(AuditDiff.compare(null, base()).isEmpty());
        assertTrue(AuditDiff.compare(base(), null).isEmpty());
    }

    @Test
    void compare_shouldHandleNullToValueTransitions() {
        Reservation before = base();
        before.setLocation(null);
        Reservation after = base();
        after.setLocation(BarLocation.HUBBLE);

        List<FieldChange> changes = AuditDiff.compare(before, after);

        assertEquals(1, changes.size());
        assertEquals("location", changes.get(0).field());
        assertNull(changes.get(0).oldValue());
        assertEquals("HUBBLE", changes.get(0).newValue());
    }

    @Test
    void compare_shouldApplyDisplayNamesAndCustomIgnore() {
        Reservation before = base();
        Reservation after = base();
        after.setContactName("New Name");
        after.setExpectedGuests(50);

        List<FieldChange> changes = AuditDiff.compare(before, after,
                Set.of("id", "createdAt", "updatedAt", "expectedGuests"),
                Map.of("contactName", "Contact name"));

        assertEquals(1, changes.size());
        assertEquals("Contact name", changes.get(0).field());
    }

    private Reservation base() {
        Reservation r = new Reservation();
        r.setId(1L);
        r.setContactName("Old Name");
        r.setExpectedGuests(20);
        r.setLocation(BarLocation.HUBBLE);
        r.setStatus(ReservationStatus.PENDING);
        r.setCreatedAt(LocalDateTime.of(2026, 1, 1, 10, 0));
        return r;
    }
}
