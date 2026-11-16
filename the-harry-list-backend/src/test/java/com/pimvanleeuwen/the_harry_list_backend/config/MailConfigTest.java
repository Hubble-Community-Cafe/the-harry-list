package com.pimvanleeuwen.the_harry_list_backend.config;

import com.pimvanleeuwen.the_harry_list_backend.config.properties.AppMailProperties;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailMessages;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailNotificationService;
import com.pimvanleeuwen.the_harry_list_backend.service.GraphMailTransport;
import com.pimvanleeuwen.the_harry_list_backend.service.SmtpMailTransport;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/** Which delivery each environment gets; the messages are the same everywhere. */
class MailConfigTest {

    @EnableConfigurationProperties(AppMailProperties.class)
    static class Settings {
    }

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(Settings.class, MailConfig.class)
            .withBean(EmailMessages.class, () -> mock(EmailMessages.class))
            .withBean(JavaMailSender.class, () -> mock(JavaMailSender.class))
            .withPropertyValues(
                    "app.mail.from=noreply@test.cafe",
                    "app.mail.staff=staff@test.cafe",
                    "app.mail.graph.tenant-id=tenant",
                    "app.mail.graph.client-id=client",
                    "app.mail.graph.client-secret=secret");

    @Test
    void productionSendsThroughMicrosoftGraph() {
        runner.withPropertyValues("app.mail.enabled=true").run(context -> {
            assertThat(context).hasSingleBean(EmailNotificationService.class);
            assertThat(transportOf(context.getBean(EmailNotificationService.class)))
                    .isInstanceOf(GraphMailTransport.class);
        });
    }

    @Test
    void e2eSendsOverSmtp() {
        runner.withPropertyValues("app.mail.enabled=false", "spring.profiles.active=e2e").run(context -> {
            assertThat(context).hasSingleBean(EmailNotificationService.class);
            assertThat(transportOf(context.getBean(EmailNotificationService.class)))
                    .isInstanceOf(SmtpMailTransport.class);
        });
    }

    @Test
    void otherwiseEmailIsOff() {
        runner.withPropertyValues("app.mail.enabled=false")
                .run(context -> assertThat(context).doesNotHaveBean(EmailNotificationService.class));
    }

    private static Object transportOf(EmailNotificationService service) {
        return ReflectionTestUtils.getField(service, "transport");
    }
}
