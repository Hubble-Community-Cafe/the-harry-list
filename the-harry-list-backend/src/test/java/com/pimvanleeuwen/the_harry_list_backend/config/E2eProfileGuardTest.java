package com.pimvanleeuwen.the_harry_list_backend.config;

import com.pimvanleeuwen.the_harry_list_backend.controller.TestSupportController;
import com.pimvanleeuwen.the_harry_list_backend.service.SmtpEmailService;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Guards that test-support infrastructure (header auth, seed/reset endpoints, SMTP email)
 * is gated to the {@code e2e} profile and can never load in dev or production, and that
 * the production security config is correspondingly excluded from {@code e2e}.
 *
 * <p>If someone removes a {@code @Profile} gate, this fails loudly.</p>
 */
class E2eProfileGuardTest {

    private String[] profilesOf(Class<?> type) {
        Profile profile = type.getAnnotation(Profile.class);
        assertNotNull(profile, type.getSimpleName() + " must be annotated with @Profile");
        return profile.value();
    }

    @Test
    void e2eOnlyBeansAreGatedToTheE2eProfile() {
        assertArrayEquals(new String[]{"e2e"}, profilesOf(E2eSecurityConfig.class));
        assertArrayEquals(new String[]{"e2e"}, profilesOf(TestSupportController.class));
        assertArrayEquals(new String[]{"e2e"}, profilesOf(SmtpEmailService.class));
    }

    @Test
    void productionSecurityIsExcludedFromTheE2eProfile() {
        assertArrayEquals(new String[]{"!e2e"}, profilesOf(SecurityConfig.class));
    }
}
