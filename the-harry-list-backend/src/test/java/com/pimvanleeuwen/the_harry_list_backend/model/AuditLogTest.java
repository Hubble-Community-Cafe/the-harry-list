package com.pimvanleeuwen.the_harry_list_backend.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class AuditLogTest {

    @Test
    void onCreate_shouldSetCreatedAtWhenNull() {
        AuditLog entry = new AuditLog();
        assertNull(entry.getCreatedAt());

        entry.onCreate();

        assertNotNull(entry.getCreatedAt());
    }

    @Test
    void onCreate_shouldPreserveExistingCreatedAt() {
        AuditLog entry = new AuditLog();
        LocalDateTime fixed = LocalDateTime.of(2026, 1, 1, 12, 0);
        entry.setCreatedAt(fixed);

        entry.onCreate();

        assertEquals(fixed, entry.getCreatedAt());
    }

    @Test
    void gettersAndSetters_shouldRoundTrip() {
        AuditLog entry = new AuditLog();
        entry.setEntityType(AuditEntityType.RESERVATION);
        entry.setEntityId(42L);
        entry.setEntityLabel("ABC123 - Test Event");
        entry.setAction(AuditAction.STATUS_CHANGE);
        entry.setActorOid("oid-1");
        entry.setActorEmail("staff@example.com");
        entry.setActorName("Staff Member");
        entry.setChanges("[]");
        entry.setSummary("status PENDING -> CONFIRMED");

        assertEquals(AuditEntityType.RESERVATION, entry.getEntityType());
        assertEquals(42L, entry.getEntityId());
        assertEquals("ABC123 - Test Event", entry.getEntityLabel());
        assertEquals(AuditAction.STATUS_CHANGE, entry.getAction());
        assertEquals("oid-1", entry.getActorOid());
        assertEquals("staff@example.com", entry.getActorEmail());
        assertEquals("Staff Member", entry.getActorName());
        assertEquals("[]", entry.getChanges());
        assertEquals("status PENDING -> CONFIRMED", entry.getSummary());
    }
}
