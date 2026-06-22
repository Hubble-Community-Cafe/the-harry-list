package com.pimvanleeuwen.the_harry_list_backend.altcha;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Self-hosted ALTCHA (proof-of-work) verification. No third party, no cookies: the server
 * issues an HMAC-signed challenge, the browser brute-forces a number whose SHA-256 matches,
 * and the server re-checks the hash + signature + expiry and blocks replay. Disabled by
 * default so dev/tests run without config; enable with {@code app.altcha.enabled=true} and a
 * stable {@code app.altcha.hmac-key} in production.
 */
@Service
public class AltchaService {

    private static final Logger log = LoggerFactory.getLogger(AltchaService.class);
    private static final String ALGORITHM = "SHA-256";

    private final boolean enabled;
    private final String hmacKey;
    private final int maxNumber;
    private final long expirySeconds;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SecureRandom random = new SecureRandom();
    /** Solved signatures (single-use), mapped to their expiry epoch for lazy cleanup. */
    private final Map<String, Long> usedSignatures = new ConcurrentHashMap<>();

    public AltchaService(
            @Value("${app.altcha.enabled:false}") boolean enabled,
            @Value("${app.altcha.hmac-key:}") String hmacKey,
            @Value("${app.altcha.max-number:50000}") int maxNumber,
            @Value("${app.altcha.expiry-seconds:300}") long expirySeconds) {
        this.enabled = enabled;
        this.maxNumber = maxNumber;
        this.expirySeconds = expirySeconds;
        if (hmacKey == null || hmacKey.isBlank()) {
            this.hmacKey = randomHex(32);
            if (enabled) {
                log.warn("ALTCHA is enabled but app.altcha.hmac-key is not set; using an ephemeral key. "
                        + "Challenges will not survive a restart or work across multiple instances.");
            }
        } else {
            this.hmacKey = hmacKey;
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** A fresh, single-use challenge for the widget (fields match the ALTCHA spec). */
    public Challenge createChallenge() {
        String salt = randomHex(12) + "?expires=" + (Instant.now().getEpochSecond() + expirySeconds);
        long number = random.nextInt(maxNumber + 1);
        String challenge = sha256Hex(salt + number);
        String signature = hmacSha256Hex(challenge);
        return new Challenge(ALGORITHM, challenge, maxNumber, salt, signature);
    }

    /** Verify a base64 ALTCHA payload. Returns true when verification is disabled. */
    public boolean verify(String payloadBase64) {
        if (!enabled) {
            return true;
        }
        if (payloadBase64 == null || payloadBase64.isBlank()) {
            return false;
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(payloadBase64);
            JsonNode p = objectMapper.readTree(decoded);
            if (!ALGORITHM.equals(p.path("algorithm").asText())) {
                return false;
            }
            String salt = p.path("salt").asText();
            String challenge = p.path("challenge").asText();
            String signature = p.path("signature").asText();
            long number = p.path("number").asLong();

            long expires = parseExpires(salt);
            if (expires > 0 && Instant.now().getEpochSecond() > expires) {
                return false;
            }
            if (!constantTimeEquals(sha256Hex(salt + number), challenge)) {
                return false;
            }
            if (!constantTimeEquals(hmacSha256Hex(challenge), signature)) {
                return false;
            }
            // Single-use: reject a payload we've already accepted (best-effort, in-memory).
            purgeExpired();
            return usedSignatures.putIfAbsent(signature, expires > 0 ? expires
                    : Instant.now().getEpochSecond() + expirySeconds) == null;
        } catch (Exception e) {
            return false;
        }
    }

    private long parseExpires(String salt) {
        int idx = salt.indexOf("expires=");
        if (idx < 0) {
            return 0;
        }
        try {
            String tail = salt.substring(idx + "expires=".length());
            int amp = tail.indexOf('&');
            return Long.parseLong(amp >= 0 ? tail.substring(0, amp) : tail);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private void purgeExpired() {
        long now = Instant.now().getEpochSecond();
        usedSignatures.entrySet().removeIf(e -> e.getValue() < now);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private String hmacSha256Hex(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private String randomHex(int bytes) {
        byte[] buf = new byte[bytes];
        random.nextBytes(buf);
        return HexFormat.of().formatHex(buf);
    }

    private boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    /** The challenge object returned to the widget. Field names match the ALTCHA spec. */
    public record Challenge(String algorithm, String challenge, int maxnumber, String salt, String signature) {}
}
