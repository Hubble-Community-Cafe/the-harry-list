package com.pimvanleeuwen.the_harry_list_backend.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AdminRoleTest {

    @Test
    void shouldHaveCorrectDisplayNames() {
        assertEquals("Viewer", AdminRole.VIEWER.getDisplayName());
        assertEquals("Editor", AdminRole.EDITOR.getDisplayName());
        assertEquals("Admin", AdminRole.ADMIN.getDisplayName());
    }

    @Test
    void shouldHaveAllExpectedValues() {
        AdminRole[] values = AdminRole.values();
        assertEquals(3, values.length);
    }
}
