package com.pimvanleeuwen.the_harry_list_backend.config;

/**
 * Decides whether a captured throwable represents a benign client disconnect
 * (the browser navigated away or closed the connection mid-response) rather
 * than a real server fault.
 *
 * <p>These show up in Sentry as noise — typically
 * {@code AsyncRequestNotUsableException} / {@code ClientAbortException} wrapping
 * {@code java.io.IOException: Broken pipe} — and drown out genuine errors, so we
 * drop them before sending.
 */
public final class SentryEventFilter {

    private SentryEventFilter() {
    }

    /**
     * @param throwable the captured exception (may be {@code null})
     * @return {@code true} if the throwable, or any cause in its chain, is a
     *         client disconnect that should not be reported to Sentry
     */
    public static boolean isClientDisconnect(Throwable throwable) {
        Throwable current = throwable;
        int guard = 0; // defend against pathological cause cycles
        while (current != null && guard++ < 50) {
            String name = current.getClass().getName();
            if (name.endsWith("ClientAbortException")
                    || name.endsWith("AsyncRequestNotUsableException")) {
                return true;
            }
            String message = current.getMessage();
            if (message != null && message.contains("Broken pipe")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
