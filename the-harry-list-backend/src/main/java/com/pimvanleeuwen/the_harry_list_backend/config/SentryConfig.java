package com.pimvanleeuwen.the_harry_list_backend.config;

import io.sentry.Sentry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;

@Configuration
public class SentryConfig {

    private static final Logger log = LoggerFactory.getLogger(SentryConfig.class);

    @Value("${sentry.dsn:}")
    private String dsn;

    @Value("${sentry.environment:development}")
    private String environment;

    @Value("${sentry.traces-sample-rate:0.1}")
    private double tracesSampleRate;

    @EventListener(ContextRefreshedEvent.class)
    public void init() {
        if (dsn == null || dsn.isBlank()) {
            log.info("Sentry DSN not configured - error monitoring disabled");
            return;
        }
        Sentry.init(options -> {
            options.setDsn(dsn);
            options.setEnvironment(environment);
            options.setTracesSampleRate(tracesSampleRate);
        });
        log.info("Sentry initialized for environment: {}", environment);
    }
}
