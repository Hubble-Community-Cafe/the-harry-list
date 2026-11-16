package com.pimvanleeuwen.the_harry_list_backend.service;

import com.microsoft.graph.models.FileAttachment;
import com.microsoft.graph.serviceclient.GraphServiceClient;
import com.microsoft.graph.users.item.sendmail.SendMailPostRequestBody;
import com.microsoft.graph.users.item.sendmail.SendMailRequestBuilder;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.mockito.Answers;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** The two delivery adapters: they deliver exactly what they are given. */
class MailTransportTest {

    private static final OutgoingEmail EMAIL = new OutgoingEmail(
            "jane@example.com", "Catering", "<p>menu</p>", "chef@test.cafe",
            List.of(EmailAttachment.builder().filename("menu.pdf").contentType("application/pdf")
                    .data(new byte[]{1, 2, 3}).build()));

    @Test
    void graphSendsFromTheNoReplyMailboxWithReplyToAndAttachments() {
        GraphServiceClient graph = mock(GraphServiceClient.class, Answers.RETURNS_DEEP_STUBS);
        SendMailRequestBuilder sendMail = graph.users().byUserId("noreply@test.cafe").sendMail();

        new GraphMailTransport(graph, "noreply@test.cafe").send(EMAIL);

        ArgumentCaptor<SendMailPostRequestBody> request = ArgumentCaptor.forClass(SendMailPostRequestBody.class);
        verify(sendMail).post(request.capture());
        var message = request.getValue().getMessage();
        assertEquals("Catering", message.getSubject());
        assertEquals("jane@example.com", message.getToRecipients().get(0).getEmailAddress().getAddress());
        assertEquals("chef@test.cafe", message.getReplyTo().get(0).getEmailAddress().getAddress());
        assertEquals("menu.pdf", ((FileAttachment) message.getAttachments().get(0)).getName());
        assertTrue(request.getValue().getSaveToSentItems());
    }

    @Test
    void graphReportsAFailedSend() {
        GraphServiceClient graph = mock(GraphServiceClient.class, Answers.RETURNS_DEEP_STUBS);
        SendMailRequestBuilder sendMail = graph.users().byUserId("noreply@test.cafe").sendMail();
        doThrow(new RuntimeException("401")).when(sendMail).post(any());

        assertThrows(IllegalStateException.class,
                () -> new GraphMailTransport(graph, "noreply@test.cafe").send(EMAIL));
    }

    @Test
    void smtpSendsFromTheNoReplyAddressWithReplyTo() throws Exception {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        when(mailSender.createMimeMessage()).thenAnswer(inv -> new MimeMessage((Session) null));

        new SmtpMailTransport(mailSender, "noreply@test.cafe").send(EMAIL);

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(sent.capture());
        assertEquals("noreply@test.cafe", sent.getValue().getFrom()[0].toString());
        assertEquals("jane@example.com", sent.getValue().getAllRecipients()[0].toString());
        assertEquals("chef@test.cafe", sent.getValue().getReplyTo()[0].toString());
        assertEquals("Catering", sent.getValue().getSubject());
        assertTrue(sent.getValue().getContent().toString().contains("menu"));
    }
}
