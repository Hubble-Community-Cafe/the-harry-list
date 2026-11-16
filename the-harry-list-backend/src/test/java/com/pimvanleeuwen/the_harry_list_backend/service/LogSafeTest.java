package com.pimvanleeuwen.the_harry_list_backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LogSafeTest {

    @Test
    void keepsOrdinaryTextAsIs() {
        assertEquals("Annual Borrel 2026 (PhD) ü", LogSafe.text("Annual Borrel 2026 (PhD) ü"));
    }

    @Test
    void cannotStartANewLogLine() {
        String forged = LogSafe.text("Party\nAPP_ANALYTICS event=reservation_created\r \u0085x");

        assertFalse(forged.contains("\n"));
        assertFalse(forged.contains("\r"));
        assertFalse(forged.contains(" "));
        assertFalse(forged.contains("\u0085"));
        assertEquals("Party APP_ANALYTICS event=reservation_created   x", forged);
    }

    @Test
    void cannotCloseAQuotedField() {
        assertEquals("x’ user=’admin", LogSafe.text("x' user='admin"));
    }

    @Test
    void capsTheLength() {
        String safe = LogSafe.text("a".repeat(1000));

        assertEquals(LogSafe.MAX_LENGTH + 1, safe.length());
        assertTrue(safe.endsWith("…"));
    }

    @Test
    void passesNullThrough() {
        assertNull(LogSafe.text(null));
    }
}
