package com.pimvanleeuwen.the_harry_list_backend.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting filter for the public reservation endpoint.
 * Limits each IP address to 10 requests per minute to prevent spam and abuse.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);
    private static final int MAX_REQUESTS_PER_MINUTE = 10;
    private static final long WINDOW_MS = 60_000;
    private static final long CLEANUP_INTERVAL_MS = 5 * 60_000;
    private static final String RATE_LIMITED_PATH = "/api/public/reservations";

    private final ConcurrentHashMap<String, List<Long>> requestTimestamps = new ConcurrentHashMap<>();
    private volatile long lastCleanup = System.currentTimeMillis();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if ("POST".equalsIgnoreCase(request.getMethod()) &&
                RATE_LIMITED_PATH.equals(request.getRequestURI())) {

            String clientIp = getClientIp(request);

            if (isRateLimited(clientIp)) {
                logger.warn("Rate limit exceeded for IP: {}", clientIp);
                response.setStatus(429);
                response.setContentType("application/json");
                response.getWriter().write(
                    "{\"error\":\"RATE_LIMIT_EXCEEDED\",\"message\":\"Too many requests. Please try again later.\"}"
                );
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimited(String ip) {
        long now = System.currentTimeMillis();

        cleanupIfNeeded(now);

        List<Long> timestamps = requestTimestamps.computeIfAbsent(
            ip, k -> Collections.synchronizedList(new ArrayList<>())
        );

        synchronized (timestamps) {
            timestamps.removeIf(t -> now - t > WINDOW_MS);
            if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                return true;
            }
            timestamps.add(now);
            return false;
        }
    }

    private void cleanupIfNeeded(long now) {
        if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
            lastCleanup = now;
            requestTimestamps.entrySet().removeIf(entry -> {
                synchronized (entry.getValue()) {
                    entry.getValue().removeIf(t -> now - t > WINDOW_MS);
                    return entry.getValue().isEmpty();
                }
            });
        }
    }

    private String getClientIp(HttpServletRequest request) {
        // Prefer X-Real-IP (set by reverse proxy, not spoofable by clients)
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        // Fall back to remoteAddr (direct connection IP)
        return request.getRemoteAddr();
    }
}
