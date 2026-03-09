package com.pimvanleeuwen.the_harry_list_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for verifying Google reCAPTCHA v3 tokens.
 * Validates that form submissions come from real users, not bots.
 */
@Service
public class RecaptchaService {

    private static final Logger logger = LoggerFactory.getLogger(RecaptchaService.class);
    private static final String RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
    private static final double SCORE_THRESHOLD = 0.5; // Score threshold (0.0 = bot, 1.0 = human)

    @Value("${recaptcha.secret-key:}")
    private String secretKey;

    @Value("${recaptcha.enabled:false}")
    private boolean enabled;

    private final RestTemplate restTemplate;

    public RecaptchaService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Verify a reCAPTCHA token.
     *
     * @param token The reCAPTCHA token from the frontend
     * @param expectedAction The expected action name (e.g., "submit_reservation")
     * @return true if verification passes, false otherwise
     */
    public boolean verifyToken(String token, String expectedAction) {
        // If reCAPTCHA is disabled (e.g., in development), allow all requests
        if (!enabled) {
            logger.debug("reCAPTCHA is disabled, skipping verification");
            return true;
        }

        if (token == null || token.isEmpty()) {
            logger.warn("reCAPTCHA token is empty or null");
            return false;
        }

        if (secretKey == null || secretKey.isEmpty()) {
            logger.warn("reCAPTCHA secret key is not configured");
            return false;
        }

        try {
            String url = String.format("%s?secret=%s&response=%s", RECAPTCHA_VERIFY_URL, secretKey, token);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, null, Map.class);

            if (response == null) {
                logger.error("Empty response from reCAPTCHA verification");
                return false;
            }

            Boolean success = (Boolean) response.get("success");
            Double score = response.get("score") != null ? ((Number) response.get("score")).doubleValue() : null;
            String action = (String) response.get("action");

            logger.debug("reCAPTCHA verification result: success={}, score={}, action={}", success, score, action);

            if (!Boolean.TRUE.equals(success)) {
                @SuppressWarnings("unchecked")
                List<String> errorCodes = (List<String>) response.get("error-codes");
                logger.warn("reCAPTCHA verification failed. Error codes: {}", errorCodes);
                return false;
            }

            // Verify the action matches what we expect (prevents token reuse)
            if (expectedAction != null && !expectedAction.equals(action)) {
                logger.warn("reCAPTCHA action mismatch. Expected: {}, Got: {}", expectedAction, action);
                return false;
            }

            // Check if score meets threshold (for reCAPTCHA v3)
            if (score != null && score < SCORE_THRESHOLD) {
                logger.warn("reCAPTCHA score {} is below threshold {}", score, SCORE_THRESHOLD);
                return false;
            }

            logger.info("reCAPTCHA verification successful. Score: {}", score);
            return true;

        } catch (Exception e) {
            logger.error("Error verifying reCAPTCHA token: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Check if reCAPTCHA verification is enabled.
     */
    public boolean isEnabled() {
        return enabled;
    }
}

