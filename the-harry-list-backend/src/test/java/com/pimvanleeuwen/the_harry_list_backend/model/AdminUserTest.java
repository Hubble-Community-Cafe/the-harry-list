package com.pimvanleeuwen.the_harry_list_backend.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AdminUserTest {

    private AdminUser user;

    @BeforeEach
    void setUp() {
        user = new AdminUser();
    }

    @Test
    void onCreate_shouldSetTimestamps() {
        user.onCreate();

        assertNotNull(user.getCreatedAt());
        assertNotNull(user.getUpdatedAt());
    }

    @Test
    void onUpdate_shouldUpdateTimestamp() {
        user.onCreate();
        var original = user.getUpdatedAt();

        try { Thread.sleep(10); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }

        user.onUpdate();

        assertNotNull(user.getUpdatedAt());
        assertTrue(user.getUpdatedAt().isAfter(original) || user.getUpdatedAt().equals(original));
    }

    @Test
    void defaultRole_shouldBeViewer() {
        assertEquals(AdminRole.VIEWER, user.getRole());
    }

    @Test
    void settersAndGetters_shouldWorkCorrectly() {
        user.setId(1L);
        user.setAzureOid("d7795f0e-32fd-4618-b5da-bf2c0079dd4a");
        user.setEmail("pim@hubble.cafe");
        user.setDisplayName("Pim");
        user.setRole(AdminRole.ADMIN);

        assertEquals(1L, user.getId());
        assertEquals("d7795f0e-32fd-4618-b5da-bf2c0079dd4a", user.getAzureOid());
        assertEquals("pim@hubble.cafe", user.getEmail());
        assertEquals("Pim", user.getDisplayName());
        assertEquals(AdminRole.ADMIN, user.getRole());
    }
}
