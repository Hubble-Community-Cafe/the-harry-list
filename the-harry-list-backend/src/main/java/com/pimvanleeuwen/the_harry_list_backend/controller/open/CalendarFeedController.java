package com.pimvanleeuwen.the_harry_list_backend.controller.open;

import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.service.ICalendarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.List;

/**
 * Controller for iCal calendar feed.
 * Provides ICS feeds that can be subscribed to from any calendar app.
 *
 * Two feeds available:
 * - /feed.ics - Public feed WITHOUT contact details
 * - /staff-feed.ics - Staff feed WITH all contact details (different token)
 */
@RestController
@RequestMapping("/api/calendar")
@Tag(name = "Calendar Feed", description = "ICS calendar feed for subscribing to reservations")
public class CalendarFeedController {

    private final ICalendarService iCalendarService;

    @Value("${calendar.feed.token:}")
    private String feedToken;

    @Value("${calendar.feed.staff-token:}")
    private String staffFeedToken;

    public CalendarFeedController(ICalendarService iCalendarService) {
        this.iCalendarService = iCalendarService;
    }

    @GetMapping(value = "/feed.ics", produces = "text/calendar")
    @Operation(
            summary = "Get public reservation calendar feed",
            description = "Returns an ICS calendar feed for external use. " +
                    "Contact details (email/phone) are NOT included for privacy."
    )
    public ResponseEntity<String> getPublicCalendarFeed(
            @RequestParam(required = false) String token,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String location,
            @RequestParam(required = false, defaultValue = "false") boolean upcomingOnly) {

        // Validate token if configured (constant-time comparison to prevent timing attacks)
        if (feedToken != null && !feedToken.isEmpty()) {
            if (token == null || !constantTimeEquals(token, feedToken)) {
                return ResponseEntity.status(401).body("Invalid or missing token");
            }
        }

        return generateFeed(status, location, upcomingOnly, false, "reservations.ics");
    }

    @GetMapping(value = "/staff-feed.ics", produces = "text/calendar")
    @Operation(
            summary = "Get staff reservation calendar feed",
            description = "Returns an ICS calendar feed for staff use. " +
                    "Includes ALL details including contact info (email/phone). " +
                    "Use a different token than the public feed."
    )
    public ResponseEntity<String> getStaffCalendarFeed(
            @RequestParam(required = false) String token,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String location,
            @RequestParam(required = false, defaultValue = "false") boolean upcomingOnly) {

        // Validate staff token (required, must be different from public token)
        if (staffFeedToken == null || staffFeedToken.isEmpty()) {
            return ResponseEntity.status(503).body("Staff feed not configured");
        }
        if (token == null || !constantTimeEquals(token, staffFeedToken)) {
            return ResponseEntity.status(401).body("Invalid or missing staff token");
        }

        return generateFeed(status, location, upcomingOnly, true, "staff-reservations.ics");
    }

    private ResponseEntity<String> generateFeed(String status, String location, boolean upcomingOnly,
                                                  boolean includeConfidential, String filename) {
        // Parse status filter
        List<ReservationStatus> statusFilter = null;
        if (status != null && !status.isEmpty()) {
            try {
                statusFilter = Arrays.stream(status.split(","))
                        .map(String::trim)
                        .map(String::toUpperCase)
                        .map(ReservationStatus::valueOf)
                        .toList();
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body("Invalid status value. Use: PENDING, CONFIRMED, REJECTED, CANCELLED");
            }
        }

        // Generate calendar
        String icsContent;
        if (upcomingOnly) {
            icsContent = iCalendarService.generateUpcomingCalendarFeed(statusFilter, location, includeConfidential);
        } else {
            icsContent = iCalendarService.generateCalendarFeed(statusFilter, location, includeConfidential);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/calendar; charset=utf-8"));
        headers.set("Content-Disposition", "inline; filename=\"" + filename + "\"");
        // Short cache time to encourage frequent refreshes
        // Note: Google Calendar may still cache longer, but this helps other clients
        headers.setCacheControl("no-cache, no-store, must-revalidate");
        headers.set("Pragma", "no-cache");
        headers.set("Expires", "0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(icsContent);
    }

    @GetMapping("/info")
    @Operation(
            summary = "Get calendar subscription info",
            description = "Returns information about how to subscribe to the calendar feeds"
    )
    public ResponseEntity<CalendarInfo> getCalendarInfo() {
        CalendarInfo info = new CalendarInfo();
        info.description = "Two calendar feeds available: public (no contact details) and staff (full details)";

        info.publicFeed = new CalendarInfo.FeedInfo();
        info.publicFeed.url = "/api/calendar/feed.ics";
        info.publicFeed.description = "Public feed - does NOT include email/phone for privacy";
        info.publicFeed.example = "/api/calendar/feed.ics?token=PUBLIC_TOKEN";

        info.staffFeed = new CalendarInfo.FeedInfo();
        info.staffFeed.url = "/api/calendar/staff-feed.ics";
        info.staffFeed.description = "Staff feed - includes ALL details including email/phone";
        info.staffFeed.example = "/api/calendar/staff-feed.ics?token=STAFF_TOKEN";

        info.parameters = new CalendarInfo.Parameters();
        info.parameters.token = "Required authentication token";
        info.parameters.status = "Optional: Filter by status (comma-separated: PENDING,CONFIRMED,REJECTED,CANCELLED)";
        info.parameters.location = "Optional: Filter by location (HUBBLE or METEOR)";
        info.parameters.upcomingOnly = "Optional: Set to true to only show upcoming events";

        info.instructions = new CalendarInfo.Instructions();
        info.instructions.googleCalendar = "Settings > Add calendar > From URL > Paste the feed URL";
        info.instructions.outlook = "Add calendar > Subscribe from web > Paste the feed URL";
        info.instructions.appleCalendar = "File > New Calendar Subscription > Paste the feed URL";

        return ResponseEntity.ok(info);
    }

    public static class CalendarInfo {
        public String description;
        public FeedInfo publicFeed;
        public FeedInfo staffFeed;
        public Parameters parameters;
        public Instructions instructions;

        public static class FeedInfo {
            public String url;
            public String description;
            public String example;
        }

        public static class Parameters {
            public String token;
            public String status;
            public String location;
            public String upcomingOnly;
        }


        public static class Instructions {
            public String googleCalendar;
            public String outlook;
            public String appleCalendar;
        }
    }

    /**
     * Constant-time string comparison to prevent timing attacks on token validation.
     */
    private static boolean constantTimeEquals(String a, String b) {
        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(aBytes, bBytes);
    }
}

