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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

        // Public feed
        if (publicFeedToken != null && !publicFeedToken.isEmpty()) {
            CalendarFeedInfo publicFeed = new CalendarFeedInfo();
            publicFeed.id = "public";
            publicFeed.name = "Public Feed";
            publicFeed.description = "Event details without contact information (email/phone). Safe to share with external partners.";
            publicFeed.url = baseUrl + "/api/calendar/feed.ics?token=" + publicFeedToken;
            publicFeed.hasToken = true;
            feeds.add(publicFeed);
        } else {
            CalendarFeedInfo publicFeed = new CalendarFeedInfo();
            publicFeed.id = "public";
            publicFeed.name = "Public Feed";
            publicFeed.description = "Event details without contact information. Token not configured.";
            publicFeed.url = null;
            publicFeed.hasToken = false;
            feeds.add(publicFeed);
        }

        // Staff feed
        if (staffFeedToken != null && !staffFeedToken.isEmpty()) {
            CalendarFeedInfo staffFeed = new CalendarFeedInfo();
            staffFeed.id = "staff";
            staffFeed.name = "Staff Feed";
            staffFeed.description = "Full event details including contact information (email/phone). Only share with staff members.";
            staffFeed.url = baseUrl + "/api/calendar/staff-feed.ics?token=" + staffFeedToken;
            staffFeed.hasToken = true;
            feeds.add(staffFeed);
        } else {
            CalendarFeedInfo staffFeed = new CalendarFeedInfo();
            staffFeed.id = "staff";
            staffFeed.name = "Staff Feed";
            staffFeed.description = "Full event details including contact information. Token not configured.";
            staffFeed.url = null;
            staffFeed.hasToken = false;
            feeds.add(staffFeed);
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
        status.example = "?token=xxx&status=CONFIRMED";
        params.add(status);

        ParameterInfo location = new ParameterInfo();
        location.name = "location";
        location.description = "Filter by location: HUBBLE or METEOR";
        location.example = "?token=xxx&location=HUBBLE";
        params.add(location);

        ParameterInfo upcomingOnly = new ParameterInfo();
        upcomingOnly.name = "upcomingOnly";
        upcomingOnly.description = "Only show future events";
        upcomingOnly.example = "?token=xxx&upcomingOnly=true";
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
    }

    public static class ParameterInfo {
        public String name;
        public String description;
        public String example;
    }
}

