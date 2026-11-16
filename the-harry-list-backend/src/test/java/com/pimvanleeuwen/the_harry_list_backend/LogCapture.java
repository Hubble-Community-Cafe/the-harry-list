package com.pimvanleeuwen.the_harry_list_backend;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.slf4j.LoggerFactory;

import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Captures every log line written while it is open, so a test can check that guest personal
 * data never reaches the logs (they are centralized in Loki). Use with try-with-resources.
 */
public final class LogCapture implements AutoCloseable {

    private final Logger root = (Logger) LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    private LogCapture() {
        appender.start();
        root.addAppender(appender);
    }

    public static LogCapture start() {
        return new LogCapture();
    }

    /** Fails when any captured log line contains one of the given values. */
    public void assertNeverLogged(String... values) {
        for (ILoggingEvent event : appender.list) {
            String line = event.getFormattedMessage();
            for (String value : values) {
                assertFalse(line.contains(value), "personal data leaked into log: " + line);
            }
        }
    }

    /** Whether anything was captured, to guard against a test that silently logs nothing. */
    public boolean isEmpty() {
        return appender.list.isEmpty();
    }

    @Override
    public void close() {
        root.detachAppender(appender);
        appender.stop();
    }
}
