package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.config.properties.AppMailProperties;
import com.pimvanleeuwen.the_harry_list_backend.LogCapture;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
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
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

/**
 * The notification logic shared by production (Graph) and e2e (SMTP): which emails go out,
 * the failure policy, and that guest data never reaches the logs.
 */
@ExtendWith(MockitoExtension.class)
class ReservationEmailServiceTest {

    @Mock
    private MailTransport transport;

    @Mock
    private EmailTemplateService templates;

    private ReservationEmailService service;

    @BeforeEach
    void setUp() {
        service = new ReservationEmailService(transport, new EmailMessages(templates, new AppMailProperties(false, null, "staff@test.cafe", null), "Test Bar"));
        lenient().when(templates.getRenderedSubject(any(), anyMap())).thenReturn("Subject");
        lenient().when(templates.getRenderedBody(any(), anyMap())).thenReturn("<p>body</p>");
        lenient().when(templates.getRenderedBody(any(), anyMap(), anyMap())).thenReturn("<p>body</p>");
    }

    private Reservation sampleReservation() {
        Reservation r = new Reservation();
        r.setContactName("Jane Smith");
        r.setEmail("jane@example.com");
        r.setPhoneNumber("+31600000000");
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
    void aNewReservationEmailsTheGuestAndAlertsStaff() {
        service.sendReservationSubmittedEmail(sampleReservation());

        ArgumentCaptor<OutgoingEmail> sent = ArgumentCaptor.forClass(OutgoingEmail.class);
        verify(transport, times(2)).send(sent.capture());
        assertEquals(List.of("jane@example.com", "staff@test.cafe"),
                sent.getAllValues().stream().map(OutgoingEmail::to).toList());
    }

    @Test
    void staffAreStillAlertedWhenTheGuestEmailFails() {
        doThrow(new IllegalStateException("bounced")).when(transport)
                .send(argThat(email -> email.to().equals("jane@example.com")));

        assertDoesNotThrow(() -> service.sendReservationSubmittedEmail(sampleReservation()));

        verify(transport).send(argThat(email -> email.to().equals("staff@test.cafe")));
    }

    @Test
    void notificationsAfterAChangeNeverThrow() {
        doThrow(new IllegalStateException("Graph unavailable")).when(transport).send(any());
        Reservation reservation = sampleReservation();

        assertDoesNotThrow(() -> service.sendStatusChangeEmail(reservation, null));
        assertDoesNotThrow(() -> service.sendReservationUpdatedEmail(reservation, null));
        assertDoesNotThrow(() -> service.sendReservationCancelledEmail(reservation));
    }

    @Test
    void emailsStaffSendOnPurposeReportFailure() {
        doThrow(new IllegalStateException("Graph unavailable")).when(transport).send(any());

        assertThrows(IllegalStateException.class,
                () -> service.sendCustomEmail(sampleReservation(), "Hi", "Message"));
        assertThrows(IllegalStateException.class,
                () -> service.sendRawEmail("jane@example.com", "Test", "<p>x</p>"));
        assertThrows(IllegalStateException.class,
                () -> service.sendEmailWithAttachments("jane@example.com", "Catering", "<p>menu</p>", List.of(), null));
    }

    @Test
    void cateringEmailKeepsTheChosenReplyTo() {
        service.sendEmailWithAttachments("jane@example.com", "Catering", "<p>menu</p>", List.of(), "chef@test.cafe");

        verify(transport).send(argThat(email -> "chef@test.cafe".equals(email.replyTo())));
    }

    @Test
    void neverLogsGuestDataWhetherSendingWorksOrNot() {
        Reservation reservation = sampleReservation();

        try (LogCapture logs = LogCapture.start()) {
            service.sendReservationSubmittedEmail(reservation);
            service.sendStatusChangeEmail(reservation, null);
            service.sendCustomEmail(reservation, "Hi", "Message");

            doThrow(new IllegalStateException("Graph unavailable")).when(transport).send(any());
            service.sendReservationUpdatedEmail(reservation, null);
            service.sendReservationCancelledEmail(reservation);
            assertThrows(IllegalStateException.class,
                    () -> service.sendRawEmail("jane@example.com", "Hi", "<p>x</p>"));

            assertFalse(logs.isEmpty());
            logs.assertNeverLogged("jane@example.com", "Jane Smith", "+31600000000");
        }
    }
}
