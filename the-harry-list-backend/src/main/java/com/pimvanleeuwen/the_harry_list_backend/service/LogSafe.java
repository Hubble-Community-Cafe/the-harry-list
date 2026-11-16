package com.pimvanleeuwen.the_harry_list_backend.service;

/**
 * Makes user-written text (event titles, email subjects) safe to put inside a log line.
 * Logs are shipped to Loki and parsed line by line, so a guest who types a line break could
 * otherwise plant a fake {@code AUDIT} or {@code APP_ANALYTICS} line, and a single quote could
 * fake a {@code key='value'} field inside a real one.
 */
public final class LogSafe {

    static final int MAX_LENGTH = 200;

    private LogSafe() {
    }

    /**
     * Replaces control characters (including line breaks and Unicode line separators) with a
     * space, turns single quotes into a typographic apostrophe, and caps the length.
     */
    public static String text(String value) {
        if (value == null) {
            return null;
        }
        StringBuilder out = new StringBuilder(Math.min(value.length(), MAX_LENGTH + 1));
        for (int i = 0; i < value.length() && out.length() < MAX_LENGTH; i++) {
            char c = value.charAt(i);
            if (Character.isISOControl(c) || c == '\u2028' || c == '\u2029') {
                out.append(' ');
            } else if (c == '\'') {
                out.append('\u2019');
            } else {
                out.append(c);
            }
        }
        if (value.length() > MAX_LENGTH) {
            out.append('\u2026');
        }
        return out.toString();
    }
}
