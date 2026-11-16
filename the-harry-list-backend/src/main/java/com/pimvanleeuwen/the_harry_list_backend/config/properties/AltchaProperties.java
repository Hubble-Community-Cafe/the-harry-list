package com.pimvanleeuwen.the_harry_list_backend.config.properties;

import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * ALTCHA proof-of-work bot protection on the public form ({@code app.altcha.*}).
 *
 * @param hmacKey       signs the challenges; blank uses a random key per start (single instance only)
 * @param maxNumber     puzzle difficulty: the highest number a browser may have to try
 * @param expirySeconds how long a challenge stays valid
 */
@Validated
@ConfigurationProperties("app.altcha")
public record AltchaProperties(
        @DefaultValue("false") boolean enabled,
        @DefaultValue("") String hmacKey,
        @Positive @DefaultValue("50000") int maxNumber,
        @Positive @DefaultValue("300") long expirySeconds) {
}
