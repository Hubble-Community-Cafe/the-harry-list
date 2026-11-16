package com.pimvanleeuwen.the_harry_list_backend.config.properties;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** The typed settings keep the old defaults, and refuse obviously broken values at startup. */
class SettingsBindingTest {

    @EnableConfigurationProperties({AppMailProperties.class, CalendarFeedProperties.class,
            AzureProperties.class, CorsProperties.class, AltchaProperties.class})
    static class Settings {
    }

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(ValidationAutoConfiguration.class))
            .withUserConfiguration(Settings.class)
            .withPropertyValues("app.mail.staff=staff@test.cafe");

    @Test
    void unsetValuesKeepTheirPreviousDefaults() {
        runner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBean(CalendarFeedProperties.class))
                    .isEqualTo(new CalendarFeedProperties("", ""));
            assertThat(context.getBean(AzureProperties.class))
                    .isEqualTo(new AzureProperties("", "", "", false));
            assertThat(context.getBean(CorsProperties.class).allowedOrigins()).isEmpty();
            assertThat(context.getBean(AltchaProperties.class))
                    .isEqualTo(new AltchaProperties(false, "", 50000, 300));
            assertThat(context.getBean(AppMailProperties.class).enabled()).isFalse();
        });
    }

    @Test
    void readsTheEnvironmentStyleValues() {
        runner.withPropertyValues(
                        "cors.allowed-origins=https://a.example, https://b.example",
                        "calendar.feed.staff-token=s3cret",
                        "azure.require-allowed-group=true",
                        "app.mail.graph.tenant-id=tenant")
                .run(context -> {
                    assertThat(context.getBean(CorsProperties.class).allowedOrigins())
                            .isEqualTo(List.of("https://a.example", "https://b.example"));
                    assertThat(context.getBean(CalendarFeedProperties.class).staffFeedEnabled()).isTrue();
                    assertThat(context.getBean(CalendarFeedProperties.class).publicFeedEnabled()).isFalse();
                    assertThat(context.getBean(AzureProperties.class).requireAllowedGroup()).isTrue();
                    assertThat(context.getBean(AppMailProperties.class).graph().tenantId()).isEqualTo("tenant");
                });
    }

    @Test
    void refusesToStartWithoutAValidStaffInbox() {
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(ValidationAutoConfiguration.class))
                .withUserConfiguration(Settings.class)
                .run(context -> assertThat(context).hasFailed());
        runner.withPropertyValues("app.mail.staff=not-an-address")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void refusesANonPositiveAltchaDifficulty() {
        runner.withPropertyValues("app.altcha.max-number=0")
                .run(context -> assertThat(context).hasFailed());
    }
}
