package com.pimvanleeuwen.the_harry_list_backend.config;

import org.apache.catalina.connector.ClientAbortException;
import org.junit.jupiter.api.Test;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class SentryEventFilterTest {

    @Test
    void detectsBrokenPipeNestedInCauseChain() {
        Throwable ex = new RuntimeException("outer",
                new IllegalStateException("middle", new IOException("Broken pipe")));

        assertThat(SentryEventFilter.isClientDisconnect(ex)).isTrue();
    }

    @Test
    void detectsClientAbortException() {
        assertThat(SentryEventFilter.isClientDisconnect(
                new ClientAbortException("connection reset"))).isTrue();
    }

    @Test
    void detectsAsyncRequestNotUsableException() {
        assertThat(SentryEventFilter.isClientDisconnect(
                new AsyncRequestNotUsableException("ServletOutputStream failed to write"))).isTrue();
    }

    @Test
    void allowsGenuineServerErrors() {
        assertThat(SentryEventFilter.isClientDisconnect(
                new IllegalStateException("real bug"))).isFalse();
    }

    @Test
    void handlesNull() {
        assertThat(SentryEventFilter.isClientDisconnect(null)).isFalse();
    }

    @Test
    void doesNotLoopOnCyclicCauseChain() {
        RuntimeException a = new RuntimeException("a");
        RuntimeException b = new RuntimeException("b", a);
        a.initCause(b); // cycle: a -> b -> a

        // Neither is a disconnect; the guard must terminate rather than hang.
        assertThat(SentryEventFilter.isClientDisconnect(a)).isFalse();
    }
}
