package com.pimvanleeuwen.the_harry_list_backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Microsoft Entra sign-in ({@code azure.*}): which tenant and app the access tokens must come
 * from, and which staff group may use the backend.
 *
 * @param requireAllowedGroup production sets this, so the backend refuses to start without a
 *                            staff group (otherwise every tenant user could read reservations)
 */
@ConfigurationProperties("azure")
public record AzureProperties(
        @DefaultValue("") String tenantId,
        @DefaultValue("") String clientId,
        @DefaultValue("") String allowedGroupId,
        @DefaultValue("false") boolean requireAllowedGroup) {
}
