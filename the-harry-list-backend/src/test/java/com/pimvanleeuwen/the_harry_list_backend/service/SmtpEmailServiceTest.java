package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SmtpEmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private EmailTemplateService emailTemplateService;

    private SmtpEmailService service;

    @BeforeEach
    void setUp() {
        service = new SmtpEmailService(mailSender, emailTemplateService,
                "noreply@test.cafe", "staff@test.cafe", "Test Bar");
        // Return a real (empty session) MimeMessage so MimeMessageHelper can populate it.
        lenient().when(mailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage((Session) null));
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
        r.setExpectedGuests(20);
        r.setStatus(ReservationStatus.CONFIRMED);
        return r;
    }

    @Test
    void sendStatusChangeEmail_rendersTemplateAndSendsToCustomer() throws Exception {
        when(emailTemplateService.getRenderedSubject(eq(EmailTemplateType.STATUS_CHANGED), anyMap()))
                .thenReturn("Reservation Confirmed");
        when(emailTemplateService.getRenderedBody(eq(EmailTemplateType.STATUS_CHANGED), anyMap(), anyMap()))
                .thenReturn("<p>Your reservation is confirmed.</p>");

        service.sendStatusChangeEmail(sampleReservation(), "See you then!");

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        MimeMessage sent = captor.getValue();

        assertEquals("Reservation Confirmed", sent.getSubject());
        assertEquals("jane@example.com", sent.getAllRecipients()[0].toString());
        assertTrue(sent.getContent().toString().contains("Your reservation is confirmed."),
                "The rendered template body must be sent as the email content");
    }

    @Test
    void sendStatusChangeEmail_passesCustomMessageBlockToRenderer() {
        when(emailTemplateService.getRenderedSubject(eq(EmailTemplateType.STATUS_CHANGED), anyMap()))
                .thenReturn("Reservation Confirmed");
        when(emailTemplateService.getRenderedBody(eq(EmailTemplateType.STATUS_CHANGED), anyMap(), anyMap()))
                .thenReturn("<p>body</p>");

        service.sendStatusChangeEmail(sampleReservation(), "A custom note");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Map<String, String>> rawVars = ArgumentCaptor.forClass(java.util.Map.class);
        verify(emailTemplateService).getRenderedBody(eq(EmailTemplateType.STATUS_CHANGED), anyMap(), rawVars.capture());
        assertTrue(rawVars.getValue().get("customMessage").contains("A custom note"),
                "The custom message must be embedded in the rendered email");
    }

    @Test
    void sendReservationSubmittedEmail_sendsToCustomerAndStaff() {
        when(emailTemplateService.getRenderedSubject(any(), anyMap())).thenReturn("Subject");
        when(emailTemplateService.getRenderedBody(any(), anyMap())).thenReturn("<p>body</p>");

        service.sendReservationSubmittedEmail(sampleReservation());

        // One to the customer (SUBMITTED) + one to staff (STAFF_NOTIFICATION)
        verify(mailSender, org.mockito.Mockito.times(2)).send(any(MimeMessage.class));
    }
}
