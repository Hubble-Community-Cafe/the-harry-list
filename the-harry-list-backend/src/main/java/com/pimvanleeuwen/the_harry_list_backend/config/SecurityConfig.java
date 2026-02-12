package com.pimvanleeuwen.the_harry_list_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${azure.tenant-id:}")
    private String azureTenantId;

    @Value("${azure.client-id:}")
    private String azureClientId;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // Public endpoints - no authentication required
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/public/reservations").permitAll()
                .requestMatchers("/api/options/**").permitAll()

                // Protected endpoints - authentication required
                .requestMatchers("/api/reservations/**").authenticated()
                .requestMatchers("/api/admin/**").authenticated()

                // All other requests require authentication
                .anyRequest().authenticated()
            );

        // Only allow OAuth2 JWT (Microsoft login)
        http.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        if (azureTenantId == null || azureTenantId.isEmpty()) {
            // Return a dummy decoder if no tenant ID (will not be used)
            return token -> {
                throw new RuntimeException("JWT authentication not configured - azure.tenant-id is not set");
            };
        }

        // Azure AD issues access tokens that should be validated using the v2.0 JWK Set URI
        // The JWK Set URI is used to fetch the public keys for signature verification
        String jwkSetUri = "https://login.microsoftonline.com/" + azureTenantId + "/discovery/v2.0/keys";

        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();

        // Azure AD can issue tokens with either v1.0 or v2.0 issuer format depending on the accessTokenAcceptedVersion
        // v1.0: https://sts.windows.net/{tenantId}/
        // v2.0: https://login.microsoftonline.com/{tenantId}/v2.0
        String issuerV1 = "https://sts.windows.net/" + azureTenantId + "/";
        String issuerV2 = "https://login.microsoftonline.com/" + azureTenantId + "/v2.0";

        // Create issuer validator that accepts both v1.0 and v2.0 issuers
        OAuth2TokenValidator<Jwt> issuerValidator = new JwtClaimValidator<String>(
            JwtClaimNames.ISS,
            iss -> issuerV1.equals(iss) || issuerV2.equals(iss)
        );

        // Create audience validator - Azure AD access tokens have the audience set to "api://{clientId}"
        OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<>(
            JwtClaimNames.AUD,
            aud -> {
                if (azureClientId == null || azureClientId.isEmpty()) {
                    // If no client ID configured, skip audience validation
                    return true;
                }
                // Accept both "api://{clientId}" and just "{clientId}" as valid audiences
                String expectedAudience = "api://" + azureClientId;
                if (aud instanceof String) {
                    return expectedAudience.equals(aud) || azureClientId.equals(aud);
                } else if (aud instanceof java.util.Collection) {
                    @SuppressWarnings("unchecked")
                    java.util.Collection<String> audiences = (java.util.Collection<String>) aud;
                    return audiences.contains(expectedAudience) || audiences.contains(azureClientId);
                }
                return false;
            }
        );

        // Combine validators: timestamp validation + custom issuer + audience
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefault(), // Includes timestamp validation
            issuerValidator,
            audienceValidator
        );

        jwtDecoder.setJwtValidator(validator);

        return jwtDecoder;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
