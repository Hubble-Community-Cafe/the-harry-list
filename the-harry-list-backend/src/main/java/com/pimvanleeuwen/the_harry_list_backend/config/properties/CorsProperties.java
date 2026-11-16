package com.pimvanleeuwen.the_harry_list_backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.util.List;

/**
 * Browser origins allowed to call the API ({@code cors.allowed-origins}, comma-separated).
 * Empty means only the local development servers (see SecurityConfig).
 */
@ConfigurationProperties("cors")
public record CorsProperties(@DefaultValue List<String> allowedOrigins) {
}
