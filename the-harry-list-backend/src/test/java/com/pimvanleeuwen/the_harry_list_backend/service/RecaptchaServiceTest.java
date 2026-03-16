package com.pimvanleeuwen.the_harry_list_backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for RecaptchaService.
 */
class RecaptchaServiceTest {

    private RecaptchaService recaptchaService;

    @BeforeEach
    void setUp() {
        recaptchaService = new RecaptchaService();
    }

    @Test
    void verifyToken_shouldReturnTrueWhenDisabled() {
        // Given - reCAPTCHA disabled
        ReflectionTestUtils.setField(recaptchaService, "enabled", false);

        // When
        boolean result = recaptchaService.verifyToken("any-token", "any-action");

        // Then
        assertTrue(result, "Should return true when reCAPTCHA is disabled");
    }

    @Test
    void verifyToken_shouldReturnFalseWhenEnabledButTokenIsNull() {
        // Given - reCAPTCHA enabled but no token
        ReflectionTestUtils.setField(recaptchaService, "enabled", true);
        ReflectionTestUtils.setField(recaptchaService, "secretKey", "test-secret");

        // When
        boolean result = recaptchaService.verifyToken(null, "submit_reservation");

        // Then
        assertFalse(result, "Should return false when token is null");
    }

    @Test
    void verifyToken_shouldReturnFalseWhenEnabledButTokenIsEmpty() {
        // Given - reCAPTCHA enabled but empty token
        ReflectionTestUtils.setField(recaptchaService, "enabled", true);
        ReflectionTestUtils.setField(recaptchaService, "secretKey", "test-secret");

        // When
        boolean result = recaptchaService.verifyToken("", "submit_reservation");

        // Then
        assertFalse(result, "Should return false when token is empty");
    }

    @Test
    void verifyToken_shouldReturnFalseWhenSecretKeyNotConfigured() {
        // Given - reCAPTCHA enabled but no secret key
        ReflectionTestUtils.setField(recaptchaService, "enabled", true);
        ReflectionTestUtils.setField(recaptchaService, "secretKey", "");

        // When
        boolean result = recaptchaService.verifyToken("test-token", "submit_reservation");

        // Then
        assertFalse(result, "Should return false when secret key is not configured");
    }

    @Test
    void isEnabled_shouldReturnFalseByDefault() {
        // Given - default state
        ReflectionTestUtils.setField(recaptchaService, "enabled", false);

        // When & Then
        assertFalse(recaptchaService.isEnabled());
    }

    @Test
    void isEnabled_shouldReturnTrueWhenEnabled() {
        // Given
        ReflectionTestUtils.setField(recaptchaService, "enabled", true);

        // When & Then
        assertTrue(recaptchaService.isEnabled());
    }

    @Test
    void isEnabled_shouldReturnTrueWhenSecretKeyConfiguredEvenIfNotExplicitlyEnabled() {
        // Given - enabled flag is false but secret key is present (e.g. env var set but RECAPTCHA_ENABLED forgotten)
        ReflectionTestUtils.setField(recaptchaService, "enabled", false);
        ReflectionTestUtils.setField(recaptchaService, "secretKey", "configured-secret-key");

        // When & Then
        assertTrue(recaptchaService.isEnabled(), "Should auto-enable when secret key is configured");
    }
}

