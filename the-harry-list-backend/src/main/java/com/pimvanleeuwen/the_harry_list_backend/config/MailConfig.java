package com.pimvanleeuwen.the_harry_list_backend.config;

import com.azure.identity.ClientSecretCredentialBuilder;
import com.microsoft.graph.serviceclient.GraphServiceClient;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailMessages;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailNotificationService;
import com.pimvanleeuwen.the_harry_list_backend.service.GraphMailTransport;
import com.pimvanleeuwen.the_harry_list_backend.service.ReservationEmailService;
import com.pimvanleeuwen.the_harry_list_backend.service.SmtpMailTransport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * Chooses how email is delivered. The messages and the failure policy are the same everywhere
 * ({@link ReservationEmailService}); only the transport differs:
 * <ul>
 *   <li>{@code app.mail.enabled=true}: Microsoft Graph (production).</li>
 *   <li>profile {@code e2e}: SMTP to the local Mailpit catcher.</li>
 *   <li>otherwise: no email service; callers treat email as disabled.</li>
 * </ul>
 */
@Configuration
public class MailConfig {

    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    @Bean
    @ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true")
    EmailNotificationService graphEmailNotificationService(
            @Value("${app.mail.graph.tenant-id}") String tenantId,
            @Value("${app.mail.graph.client-id}") String clientId,
            @Value("${app.mail.graph.client-secret}") String clientSecret,
            @Value("${app.mail.from}") String fromEmail,
            EmailMessages messages) {
        GraphServiceClient client = new GraphServiceClient(new ClientSecretCredentialBuilder()
                .clientId(clientId)
                .clientSecret(clientSecret)
                .tenantId(tenantId)
                .build());
        log.info("Email via Microsoft Graph. Sending from: {}, staff notifications to: {}",
                fromEmail, messages.staffEmail());
        return new ReservationEmailService(new GraphMailTransport(client, fromEmail), messages);
    }

    @Bean
    @Profile("e2e")
    EmailNotificationService smtpEmailNotificationService(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String fromEmail,
            EmailMessages messages) {
        log.info("Email via SMTP (e2e). Sending from: {}, staff notifications to: {}",
                fromEmail, messages.staffEmail());
        return new ReservationEmailService(new SmtpMailTransport(mailSender, fromEmail), messages);
    }
}
