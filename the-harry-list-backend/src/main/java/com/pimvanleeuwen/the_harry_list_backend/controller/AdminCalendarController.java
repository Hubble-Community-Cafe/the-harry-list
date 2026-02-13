package com.pimvanleeuwen.the_harry_list_backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;

/**
 * Admin endpoint to get calendar feed URLs with tokens.
 * Only accessible to authenticated admin users.
 */
@RestController
@RequestMapping("/api/admin/calendar")
@Tag(name = "Admin Calendar", description = "Admin endpoints for calendar feed management")
public class AdminCalendarController {

    @Value("${calendar.feed.token:}")
    private String publicFeedToken;

    @Value("${calendar.feed.staff-token:}")
    private String staffFeedToken;

    @GetMapping("/feeds")
    @Operation(
            summary = "Get calendar feed URLs",
            description = "Returns the calendar feed URLs with tokens for admin users to subscribe to"
    )
    public ResponseEntity<CalendarFeedsResponse> getCalendarFeeds(HttpServletRequest request) {
        String baseUrl = getBaseUrl(request);

        List<CalendarFeedInfo> feeds = new ArrayList<>();

        // Staff feeds (with contact details)
        if (staffFeedToken != null && !staffFeedToken.isEmpty()) {
            // Staff - Hubble
            CalendarFeedInfo staffHubble = new CalendarFeedInfo();
            staffHubble.id = "staff-hubble";
            staffHubble.name = "Staff - Hubble";
            staffHubble.description = "Hubble reservations with full contact details (email/phone)";
            staffHubble.url = baseUrl + "/api/calendar/staff-feed.ics?token=" + staffFeedToken + "&location=HUBBLE";
            staffHubble.hasToken = true;
            staffHubble.location = "HUBBLE";
            staffHubble.isStaff = true;
            feeds.add(staffHubble);

            // Staff - Meteor
            CalendarFeedInfo staffMeteor = new CalendarFeedInfo();
            staffMeteor.id = "staff-meteor";
            staffMeteor.name = "Staff - Meteor";
            staffMeteor.description = "Meteor reservations with full contact details (email/phone)";
            staffMeteor.url = baseUrl + "/api/calendar/staff-feed.ics?token=" + staffFeedToken + "&location=METEOR";
            staffMeteor.hasToken = true;
            staffMeteor.location = "METEOR";
            staffMeteor.isStaff = true;
            feeds.add(staffMeteor);
        } else {
            // Placeholder for unconfigured staff feeds
            CalendarFeedInfo staffHubble = new CalendarFeedInfo();
            staffHubble.id = "staff-hubble";
            staffHubble.name = "Staff - Hubble";
            staffHubble.description = "Staff token not configured";
            staffHubble.url = null;
            staffHubble.hasToken = false;
            staffHubble.location = "HUBBLE";
            staffHubble.isStaff = true;
            feeds.add(staffHubble);

            CalendarFeedInfo staffMeteor = new CalendarFeedInfo();
            staffMeteor.id = "staff-meteor";
            staffMeteor.name = "Staff - Meteor";
            staffMeteor.description = "Staff token not configured";
            staffMeteor.url = null;
            staffMeteor.hasToken = false;
            staffMeteor.location = "METEOR";
            staffMeteor.isStaff = true;
            feeds.add(staffMeteor);
        }

        // Public feeds (without contact details)
        if (publicFeedToken != null && !publicFeedToken.isEmpty()) {
            // Public - Hubble
            CalendarFeedInfo publicHubble = new CalendarFeedInfo();
            publicHubble.id = "public-hubble";
            publicHubble.name = "Public - Hubble";
            publicHubble.description = "Hubble reservations without contact details (safe to share)";
            publicHubble.url = baseUrl + "/api/calendar/feed.ics?token=" + publicFeedToken + "&location=HUBBLE";
            publicHubble.hasToken = true;
            publicHubble.location = "HUBBLE";
            publicHubble.isStaff = false;
            feeds.add(publicHubble);

            // Public - Meteor
            CalendarFeedInfo publicMeteor = new CalendarFeedInfo();
            publicMeteor.id = "public-meteor";
            publicMeteor.name = "Public - Meteor";
            publicMeteor.description = "Meteor reservations without contact details (safe to share)";
            publicMeteor.url = baseUrl + "/api/calendar/feed.ics?token=" + publicFeedToken + "&location=METEOR";
            publicMeteor.hasToken = true;
            publicMeteor.location = "METEOR";
            publicMeteor.isStaff = false;
            feeds.add(publicMeteor);
        } else {
            // Placeholder for unconfigured public feeds
            CalendarFeedInfo publicHubble = new CalendarFeedInfo();
            publicHubble.id = "public-hubble";
            publicHubble.name = "Public - Hubble";
            publicHubble.description = "Public token not configured";
            publicHubble.url = null;
            publicHubble.hasToken = false;
            publicHubble.location = "HUBBLE";
            publicHubble.isStaff = false;
            feeds.add(publicHubble);

            CalendarFeedInfo publicMeteor = new CalendarFeedInfo();
            publicMeteor.id = "public-meteor";
            publicMeteor.name = "Public - Meteor";
            publicMeteor.description = "Public token not configured";
            publicMeteor.url = null;
            publicMeteor.hasToken = false;
            publicMeteor.location = "METEOR";
            publicMeteor.isStaff = false;
            feeds.add(publicMeteor);
        }

        CalendarFeedsResponse response = new CalendarFeedsResponse();
        response.feeds = feeds;
        response.parameters = getParameters();

        return ResponseEntity.ok(response);
    }

    private String getBaseUrl(HttpServletRequest request) {
        String scheme = request.getHeader("X-Forwarded-Proto");
        if (scheme == null) {
            scheme = request.getScheme();
        }

        String host = request.getHeader("X-Forwarded-Host");
        if (host == null) {
            host = request.getHeader("Host");
        }
        if (host == null) {
            host = request.getServerName() + ":" + request.getServerPort();
        }

        return scheme + "://" + host;
    }

    private List<ParameterInfo> getParameters() {
        List<ParameterInfo> params = new ArrayList<>();

        ParameterInfo status = new ParameterInfo();
        status.name = "status";
        status.description = "Filter by status: PENDING, CONFIRMED, REJECTED, CANCELLED (comma-separated)";
        status.example = "&status=CONFIRMED";
        params.add(status);

        ParameterInfo upcomingOnly = new ParameterInfo();
        upcomingOnly.name = "upcomingOnly";
        upcomingOnly.description = "Only show future events";
        upcomingOnly.example = "&upcomingOnly=true";
        params.add(upcomingOnly);

        return params;
    }

    public static class CalendarFeedsResponse {
        public List<CalendarFeedInfo> feeds;
        public List<ParameterInfo> parameters;
    }

    public static class CalendarFeedInfo {
        public String id;
        public String name;
        public String description;
        public String url;
        public boolean hasToken;
        public String location;
        public boolean isStaff;
    }

    public static class ParameterInfo {
        public String name;
        public String description;
        public String example;
    }
}

