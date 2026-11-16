package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class EmailMessagesTest {

    @Mock
    private EmailTemplateService templates;

    private EmailMessages messages;

    @BeforeEach
    void setUp() {
        messages = new EmailMessages(templates, "staff@test.cafe", "Test Bar");
        lenient().when(templates.getRenderedSubject(any(), anyMap())).thenReturn("Subject");
        lenient().when(templates.getRenderedBody(any(), anyMap())).thenReturn("<p>body</p>");
        lenient().when(templates.getRenderedBody(any(), anyMap(), anyMap())).thenReturn("<p>body with note</p>");
    }

    private Reservation sampleReservation() {
        Reservation r = new Reservation();
        r.setContactName("Jane Smith");
        r.setEmail("jane@example.com");
        r.setConfirmationNumber("HM-2026-001");
        r.setEventTitle("Test Event");
        r.setEventDate(LocalDate.of(2026, 7, 15));
        r.setStartTime(LocalTime.of(14, 0));
        r.setEndTime(LocalTime.of(16, 0));
        r.setLocation(BarLocation.HUBBLE);
        r.setExpectedGuests(20);
        r.setStatus(ReservationStatus.CONFIRMED);
        return r;
    }

    @Test
    void guestEmailsGoToTheGuestWithRepliesToTheStaffInbox() {
        OutgoingEmail email = messages.submitted(sampleReservation());

        assertEquals("jane@example.com", email.to());
        assertEquals("staff@test.cafe", email.replyTo());
        assertEquals("Subject", email.subject());
        assertEquals("<p>body</p>", email.htmlBody());
    }

    @Test
    @SuppressWarnings("unchecked")
    void statusChangeEmbedsTheCustomMessageAndStatusVariables() {
        OutgoingEmail email = messages.statusChanged(sampleReservation(), "A custom note");

        ArgumentCaptor<Map<String, String>> vars = ArgumentCaptor.forClass(Map.class);
        ArgumentCaptor<Map<String, String>> rawVars = ArgumentCaptor.forClass(Map.class);
        verify(templates).getRenderedBody(eq(EmailTemplateType.STATUS_CHANGED), vars.capture(), rawVars.capture());
        assertTrue(rawVars.getValue().get("customMessage").contains("A custom note"));
        assertEquals("Confirmed", vars.getValue().get("status"));
        assertEquals("Reservation Confirmed", vars.getValue().get("statusSubject"));
        assertEquals("staff@test.cafe", vars.getValue().get("staffEmail"));
        assertEquals("<p>body with note</p>", email.htmlBody());
    }

    @Test
    void updateEmailAlsoCarriesTheCustomMessageBlock() {
        messages.updated(sampleReservation(), "Moved to the terrace");

        verify(templates).getRenderedBody(eq(EmailTemplateType.UPDATED), anyMap(), anyMap());
    }

    @Test
    @SuppressWarnings("unchecked")
    void staffNotificationGoesToTheStaffInboxAndToleratesMissingOptionalFields() {
        // Payment, phone and organization can be missing on old rows; the SMTP copy handled
        // that and the Graph copy did not. One builder now handles it for both.
        OutgoingEmail email = messages.staffNotification(sampleReservation());

        assertEquals("staff@test.cafe", email.to());
        ArgumentCaptor<Map<String, String>> vars = ArgumentCaptor.forClass(Map.class);
        verify(templates).getRenderedBody(eq(EmailTemplateType.STAFF_NOTIFICATION), vars.capture());
        assertEquals("Not provided", vars.getValue().get("payment"));
        assertEquals("Not provided", vars.getValue().get("phone"));
        assertEquals("None", vars.getValue().get("specialActivities"));
    }

    @Test
    void cateringVariablesIncludeTheBarAndStaffInbox() {
        Map<String, String> vars = messages.cateringVars(sampleReservation());

        assertEquals("Test Bar", vars.get("barName"));
        assertEquals("staff@test.cafe", vars.get("staffEmail"));
        assertEquals("Wednesday, July 15, 2026", vars.get("eventDate"));
        assertEquals(BarLocation.HUBBLE.getDisplayName(), vars.get("location"));
    }
}
