package com.pimvanleeuwen.the_harry_list_backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Calendar feed tokens ({@code calendar.feed.*}). A blank token switches that feed off (503).
 *
 * @param token      the public feed (no contact details)
 * @param staffToken the staff feed (with contact details); must differ from {@code token}
 */
@ConfigurationProperties("calendar.feed")
public record CalendarFeedProperties(@DefaultValue("") String token, @DefaultValue("") String staffToken) {

    public boolean publicFeedEnabled() {
        return !token.isBlank();
    }

    public boolean staffFeedEnabled() {
        return !staffToken.isBlank();
    }
}
