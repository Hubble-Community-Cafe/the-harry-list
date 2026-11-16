package com.pimvanleeuwen.the_harry_list_backend.filter;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RateLimitFilterTest {

    private RateLimitFilter filter;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() throws Exception {
        filter = new RateLimitFilter();
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        filterChain = mock(FilterChain.class);
    }

    @Test
    void shouldPassThroughGetRequests() throws Exception {
        request.setMethod("GET");
        request.setRequestURI("/api/public/reservations");

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertEquals(200, response.getStatus());
    }

    @Test
    void shouldPassThroughPostRequestsToOtherPaths() throws Exception {
        request.setMethod("POST");
        request.setRequestURI("/api/reservations");

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertEquals(200, response.getStatus());
    }

    @Test
    void shouldAllowRequestsUpToLimit() throws Exception {
        request.setMethod("POST");
        request.setRequestURI("/api/public/reservations");
        request.setRemoteAddr("1.2.3.4");

        for (int i = 0; i < 10; i++) {
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilter(request, resp, filterChain);
            assertEquals(200, resp.getStatus(), "Request " + (i + 1) + " should be allowed");
        }

        verify(filterChain, times(10)).doFilter(eq(request), any());
    }

    @Test
    void shouldBlockRequestExceedingLimit() throws Exception {
        request.setMethod("POST");
        request.setRequestURI("/api/public/reservations");
        request.setRemoteAddr("1.2.3.4");

        // Exhaust the limit
        for (int i = 0; i < 10; i++) {
            filter.doFilter(request, new MockHttpServletResponse(), filterChain);
        }

        // 11th request should be blocked
        filter.doFilter(request, response, filterChain);

        assertEquals(429, response.getStatus());
        verify(filterChain, times(10)).doFilter(any(), any());
    }

    @Test
    void shouldReturn429WithJsonErrorBody() throws Exception {
        request.setMethod("POST");
        request.setRequestURI("/api/public/reservations");
        request.setRemoteAddr("1.2.3.4");

        // Exhaust the limit
        for (int i = 0; i < 10; i++) {
            filter.doFilter(request, new MockHttpServletResponse(), filterChain);
        }

        filter.doFilter(request, response, filterChain);

        assertEquals(429, response.getStatus());
        assertEquals("application/problem+json", response.getContentType());
        String body = response.getContentAsString();
        assertTrue(body.contains("RATE_LIMIT_EXCEEDED"));
        assertTrue(body.contains("\"detail\":\"Too many requests"));
    }

    @Test
    void shouldUseXRealIpHeader() throws Exception {
        request.setMethod("POST");
        request.setRequestURI("/api/public/reservations");
        request.setRemoteAddr("10.0.0.1"); // internal proxy IP
        request.addHeader("X-Real-IP", "203.0.113.5");

        // Exhaust limit for the real IP
        for (int i = 0; i < 10; i++) {
            filter.doFilter(request, new MockHttpServletResponse(), filterChain);
        }

        filter.doFilter(request, response, filterChain);
        assertEquals(429, response.getStatus());
    }

    @Test
    void shouldIgnoreSpoofedXRealIpFromDirectClient() throws Exception {
        // A client reaching the backend directly (not via the proxy on the Docker network) must
        // not dodge the limit by sending a fresh X-Real-IP with every request.
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest spoofed = new MockHttpServletRequest();
            spoofed.setMethod("POST");
            spoofed.setRequestURI("/api/public/reservations");
            spoofed.setRemoteAddr("198.51.100.7");
            spoofed.addHeader("X-Real-IP", "203.0.113." + i);
            filter.doFilter(spoofed, new MockHttpServletResponse(), filterChain);
        }

        request.setMethod("POST");
        request.setRequestURI("/api/public/reservations");
        request.setRemoteAddr("198.51.100.7");
        request.addHeader("X-Real-IP", "203.0.113.99");
        filter.doFilter(request, response, filterChain);
        assertEquals(429, response.getStatus());
    }

    @Test
    void shouldTrustXRealIpOnlyFromLoopbackOrPrivatePeers() {
        assertTrue(RateLimitFilter.isTrustedProxy("127.0.0.1"));
        assertTrue(RateLimitFilter.isTrustedProxy("::1"));
        assertTrue(RateLimitFilter.isTrustedProxy("10.0.0.1"));
        assertTrue(RateLimitFilter.isTrustedProxy("172.18.0.5"));   // Docker network
        assertTrue(RateLimitFilter.isTrustedProxy("192.168.1.10"));
        assertTrue(RateLimitFilter.isTrustedProxy("fd12:3456::1")); // IPv6 unique local

        assertFalse(RateLimitFilter.isTrustedProxy("198.51.100.7"));
        assertFalse(RateLimitFilter.isTrustedProxy("2001:db8::1"));
        assertFalse(RateLimitFilter.isTrustedProxy("172.32.0.1"));   // just outside 172.16/12
        assertFalse(RateLimitFilter.isTrustedProxy("proxy.example.com")); // never resolved
        assertFalse(RateLimitFilter.isTrustedProxy(""));
        assertFalse(RateLimitFilter.isTrustedProxy(null));
    }

    @Test
    void shouldIgnoreXForwardedForHeader() throws Exception {
        request.setMethod("POST");
        request.setRequestURI("/api/public/reservations");
        request.setRemoteAddr("10.0.0.1");
        request.addHeader("X-Forwarded-For", "203.0.113.5");

        // All requests should be tracked under remoteAddr (10.0.0.1), not the forwarded IP
        for (int i = 0; i < 10; i++) {
            filter.doFilter(request, new MockHttpServletResponse(), filterChain);
        }

        filter.doFilter(request, response, filterChain);
        assertEquals(429, response.getStatus());

        // A request from a different remoteAddr with the same X-Forwarded-For should still be allowed
        MockHttpServletRequest request2 = new MockHttpServletRequest();
        request2.setMethod("POST");
        request2.setRequestURI("/api/public/reservations");
        request2.setRemoteAddr("10.0.0.2");
        request2.addHeader("X-Forwarded-For", "203.0.113.5");

        MockHttpServletResponse response2 = new MockHttpServletResponse();
        filter.doFilter(request2, response2, filterChain);
        assertEquals(200, response2.getStatus());
    }

    @Test
    void shouldTrackRateLimitsSeparatelyPerIp() throws Exception {
        MockHttpServletRequest requestA = new MockHttpServletRequest();
        requestA.setMethod("POST");
        requestA.setRequestURI("/api/public/reservations");
        requestA.setRemoteAddr("1.1.1.1");

        MockHttpServletRequest requestB = new MockHttpServletRequest();
        requestB.setMethod("POST");
        requestB.setRequestURI("/api/public/reservations");
        requestB.setRemoteAddr("2.2.2.2");

        // Exhaust limit for IP A
        for (int i = 0; i < 10; i++) {
            filter.doFilter(requestA, new MockHttpServletResponse(), filterChain);
        }

        // IP A should be blocked
        MockHttpServletResponse responseA = new MockHttpServletResponse();
        filter.doFilter(requestA, responseA, filterChain);
        assertEquals(429, responseA.getStatus());

        // IP B should still be allowed
        MockHttpServletResponse responseB = new MockHttpServletResponse();
        filter.doFilter(requestB, responseB, filterChain);
        assertEquals(200, responseB.getStatus());
    }

    @Test
    void shouldNotCountExpiredTimestampsTowardsLimit() throws Exception {
        request.setMethod("POST");
        request.setRequestURI("/api/public/reservations");
        request.setRemoteAddr("1.2.3.4");

        // Inject 10 timestamps that are older than the 60s window
        long expired = System.currentTimeMillis() - 61_000;
        List<Long> oldTimestamps = Collections.synchronizedList(new ArrayList<>());
        for (int i = 0; i < 10; i++) {
            oldTimestamps.add(expired);
        }

        @SuppressWarnings("unchecked")
        ConcurrentHashMap<String, List<Long>> timestamps =
            (ConcurrentHashMap<String, List<Long>>) ReflectionTestUtils.getField(filter, "requestTimestamps");
        timestamps.put("1.2.3.4", oldTimestamps);

        // New request should be allowed because old timestamps are expired
        filter.doFilter(request, response, filterChain);

        assertEquals(200, response.getStatus());
        verify(filterChain).doFilter(request, response);
    }
}
