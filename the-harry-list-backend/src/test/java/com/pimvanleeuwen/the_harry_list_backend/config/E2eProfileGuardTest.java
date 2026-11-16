package com.pimvanleeuwen.the_harry_list_backend.config;

import com.pimvanleeuwen.the_harry_list_backend.controller.TestSupportController;
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

    private String[] profilesOf(java.lang.reflect.AnnotatedElement element) {
        Profile profile = element.getAnnotation(Profile.class);
        assertNotNull(profile, element + " must be annotated with @Profile");
        return profile.value();
    }

    /** The SMTP email service is a @Bean method in MailConfig, so its gate sits on that method. */
    private java.lang.reflect.Method smtpBean() {
        try {
            return MailConfig.class.getDeclaredMethod("smtpEmailNotificationService",
                    org.springframework.mail.javamail.JavaMailSender.class, String.class,
                    com.pimvanleeuwen.the_harry_list_backend.service.EmailMessages.class);
        } catch (NoSuchMethodException e) {
            throw new AssertionError("MailConfig.smtpEmailNotificationService is missing", e);
        }
    }

    @Test
    void e2eOnlyBeansAreGatedToTheE2eProfile() {
        assertArrayEquals(new String[]{"e2e"}, profilesOf(E2eSecurityConfig.class));
        assertArrayEquals(new String[]{"e2e"}, profilesOf(TestSupportController.class));
        assertArrayEquals(new String[]{"e2e"}, profilesOf(smtpBean()));
    }

    @Test
    void productionSecurityIsExcludedFromTheE2eProfile() {
        assertArrayEquals(new String[]{"!e2e"}, profilesOf(SecurityConfig.class));
    }
}
