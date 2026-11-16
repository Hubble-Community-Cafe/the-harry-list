package com.pimvanleeuwen.the_harry_list_backend.config.properties;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Email settings ({@code app.mail.*}). Startup fails when the staff inbox is missing or not an
 * address, rather than the first alert quietly going nowhere.
 *
 * @param enabled send through Microsoft Graph (production); see MailConfig
 * @param from    the no-reply sender; only needed when email is on
 * @param staff   the staff inbox: new-reservation alerts, guest Reply-To and {{staffEmail}}
 * @param graph   Microsoft Graph app credentials; only needed when {@code enabled}
 */
@Validated
@ConfigurationProperties("app.mail")
public record AppMailProperties(
        @DefaultValue("false") boolean enabled,
        @Email String from,
        @NotBlank @Email String staff,
        @Valid @DefaultValue Graph graph) {

    public record Graph(String tenantId, String clientId, String clientSecret) {
    }
}
