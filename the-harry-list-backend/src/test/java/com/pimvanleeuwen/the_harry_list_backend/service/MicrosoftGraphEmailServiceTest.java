package com.pimvanleeuwen.the_harry_list_backend.service;

import com.microsoft.graph.serviceclient.GraphServiceClient;
import com.pimvanleeuwen.the_harry_list_backend.LogCapture;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;

/**
 * The production mail sender logs by confirmation number only: guest addresses and names
 * must never reach the (centralized) logs, whether a send succeeds or fails.
 */
@ExtendWith(MockitoExtension.class)
class MicrosoftGraphEmailServiceTest {

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private GraphServiceClient graphClient;

    @Mock
    private EmailTemplateService emailTemplateService;

    private MicrosoftGraphEmailService service;

    @BeforeEach
    void setUp() {
        service = new MicrosoftGraphEmailService(graphClient, "noreply@test.cafe", "staff@test.cafe",
                "Test Bar", emailTemplateService);
        lenient().when(emailTemplateService.getRenderedSubject(any(), anyMap())).thenReturn("Subject");
        lenient().when(emailTemplateService.getRenderedBody(any(), anyMap())).thenReturn("<p>body</p>");
        lenient().when(emailTemplateService.getRenderedBody(any(), anyMap(), anyMap())).thenReturn("<p>body</p>");
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
        r.setExpectedGuests(20);
        r.setStatus(ReservationStatus.CONFIRMED);
        return r;
    }

    @Test
    void successfulSendsNeverLogGuestData() {
        Reservation reservation = sampleReservation();

        try (LogCapture logs = LogCapture.start()) {
            service.sendReservationSubmittedEmail(reservation);
            service.sendStatusChangeEmail(reservation, null);
            service.sendReservationUpdatedEmail(reservation, null);
            service.sendReservationCancelledEmail(reservation);
            service.sendCustomEmail(reservation, "Hello", "Message");
            service.sendEmailWithAttachments("jane@example.com", "Catering", "<p>menu</p>", List.of(), null);

            assertFalse(logs.isEmpty());
            logs.assertNeverLogged("jane@example.com", "Jane Smith", "+31600000000");
        }
    }

    @Test
    void failedSendsNeverLogGuestData() {
        var sendMail = graphClient.users().byUserId("noreply@test.cafe").sendMail();
        doThrow(new RuntimeException("Graph unavailable")).when(sendMail).post(any());
        Reservation reservation = sampleReservation();

        try (LogCapture logs = LogCapture.start()) {
            service.sendReservationSubmittedEmail(reservation);
            service.sendStatusChangeEmail(reservation, null);
            service.sendReservationUpdatedEmail(reservation, null);
            service.sendReservationCancelledEmail(reservation);
            assertThrows(RuntimeException.class, () -> service.sendCustomEmail(reservation, "Hello", "Message"));
            assertThrows(RuntimeException.class, () -> service.sendRawEmail("jane@example.com", "Hi", "<p>x</p>"));
            assertThrows(RuntimeException.class, () ->
                    service.sendEmailWithAttachments("jane@example.com", "Catering", "<p>menu</p>", List.of(), null));

            assertFalse(logs.isEmpty());
            logs.assertNeverLogged("jane@example.com", "Jane Smith", "+31600000000");
        }
    }
}
