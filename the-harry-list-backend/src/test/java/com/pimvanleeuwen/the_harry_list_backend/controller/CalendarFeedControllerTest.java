package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.controller.open.CalendarFeedController;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.service.ICalendarService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Token handling of the ICS feeds. Both feeds must fail closed: a feed whose token is not
 * configured is disabled, never served to anyone who finds the URL.
 */
class CalendarFeedControllerTest {

    private static final String PUBLIC_TOKEN = "public-token";
    private static final String STAFF_TOKEN = "staff-token";
    private static final String ICS = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n";

    private ICalendarService calendarService;

    @BeforeEach
    void setUp() {
        calendarService = mock(ICalendarService.class);
        when(calendarService.generateCalendarFeed(any(), any(), any(), anyBoolean())).thenReturn(ICS);
        when(calendarService.generateUpcomingCalendarFeed(any(), any(), any(), anyBoolean())).thenReturn(ICS);
    }

    private CalendarFeedController controller(String publicToken, String staffToken) {
        return new CalendarFeedController(calendarService, publicToken, staffToken);
    }

    private ResponseEntity<String> publicFeed(CalendarFeedController c, String token) {
        return c.getPublicCalendarFeed(token, null, null, null, false);
    }

    private ResponseEntity<String> staffFeed(CalendarFeedController c, String token) {
        return c.getStaffCalendarFeed(token, null, null, null, false);
    }

    @Test
    void publicFeed_withoutConfiguredToken_isDisabledForEveryone() {
        // Used to fall through and serve the whole reservation calendar without any token.
        for (String configured : new String[]{"", "   ", null}) {
            CalendarFeedController c = controller(configured, STAFF_TOKEN);

            assertEquals(503, publicFeed(c, null).getStatusCode().value());
            assertEquals(503, publicFeed(c, "anything").getStatusCode().value());
        }
        verifyNoInteractions(calendarService);
    }

    @Test
    void publicFeed_rejectsAMissingOrWrongToken() {
        CalendarFeedController c = controller(PUBLIC_TOKEN, STAFF_TOKEN);

        assertEquals(401, publicFeed(c, null).getStatusCode().value());
        assertEquals(401, publicFeed(c, "wrong").getStatusCode().value());
        assertEquals(401, publicFeed(c, STAFF_TOKEN).getStatusCode().value());
        verifyNoInteractions(calendarService);
    }

    @Test
    void publicFeed_withTheRightToken_servesTheFeedWithoutContactDetails() {
        ResponseEntity<String> response = publicFeed(controller(PUBLIC_TOKEN, STAFF_TOKEN), PUBLIC_TOKEN);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(ICS, response.getBody());
        assertTrue(response.getHeaders().getContentType().toString().startsWith("text/calendar"));
        verify(calendarService).generateCalendarFeed(null, null, null, false);
    }

    @Test
    void staffFeed_withoutConfiguredToken_isDisabledForEveryone() {
        CalendarFeedController c = controller(PUBLIC_TOKEN, "");

        assertEquals(503, staffFeed(c, null).getStatusCode().value());
        assertEquals(503, staffFeed(c, PUBLIC_TOKEN).getStatusCode().value());
        verifyNoInteractions(calendarService);
    }

    @Test
    void staffFeed_rejectsThePublicToken_andServesContactDetailsWithItsOwn() {
        CalendarFeedController c = controller(PUBLIC_TOKEN, STAFF_TOKEN);

        assertEquals(401, staffFeed(c, PUBLIC_TOKEN).getStatusCode().value());
        verify(calendarService, never()).generateCalendarFeed(any(), any(), any(), eq(true));

        assertEquals(200, staffFeed(c, STAFF_TOKEN).getStatusCode().value());
        verify(calendarService).generateCalendarFeed(null, null, null, true);
    }

    @Test
    void filtersArePassedThrough_andAnInvalidStatusIsRejected() {
        CalendarFeedController c = controller(PUBLIC_TOKEN, STAFF_TOKEN);

        ResponseEntity<String> upcoming = c.getPublicCalendarFeed(PUBLIC_TOKEN, "confirmed, pending", "HUBBLE", true, true);
        assertEquals(200, upcoming.getStatusCode().value());
        verify(calendarService).generateUpcomingCalendarFeed(
                List.of(ReservationStatus.CONFIRMED, ReservationStatus.PENDING), "HUBBLE", true, false);

        assertEquals(400, c.getPublicCalendarFeed(PUBLIC_TOKEN, "BOGUS", null, null, false).getStatusCode().value());
    }
}
