package com.pimvanleeuwen.the_harry_list_backend.config;

import com.pimvanleeuwen.the_harry_list_backend.filter.RoleAuthorizationFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

/**
 * Security configuration used <strong>only under the {@code e2e} Spring profile</strong>.
 *
 * <p>Production security ({@link SecurityConfig}, gated to {@code !e2e}) validates real
 * Azure AD JWTs, which cannot be minted in a headless test environment. This configuration
 * instead derives the principal from simple request headers and then lets the real
 * {@link RoleAuthorizationFilter} resolve the role from the database — so authorization,
 * RBAC and audit-actor attribution all behave exactly as in production.</p>
 *
 * <p>To authenticate, an e2e request sends:</p>
 * <ul>
 *   <li>{@code X-Test-Oid} — the Azure object id of a (seeded) admin user (required)</li>
 *   <li>{@code X-Test-Email}, {@code X-Test-Name} — optional display fields</li>
 * </ul>
 *
 * <p>This config never loads outside {@code e2e}, so it has no effect on production.</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Profile("e2e")
public class E2eSecurityConfig {

    private final RoleAuthorizationFilter roleAuthorizationFilter;

    public E2eSecurityConfig(RoleAuthorizationFilter roleAuthorizationFilter) {
        this.roleAuthorizationFilter = roleAuthorizationFilter;
    }

    @Bean
    public SecurityFilterChain e2eSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(e2eCorsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/test/**").permitAll()            // e2e seed/reset helpers
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/public/reservations").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/public/reservations/recaptcha-status").permitAll()
                .requestMatchers("/api/options/**").permitAll()
                .requestMatchers("/api/calendar/**").permitAll()
                .anyRequest().authenticated()
            );

        // Header-based test authentication, then the real role enrichment filter.
        TestHeaderAuthFilter testAuthFilter = new TestHeaderAuthFilter();
        http.addFilterBefore(testAuthFilter, AuthorizationFilter.class);
        http.addFilterAfter(roleAuthorizationFilter, TestHeaderAuthFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource e2eCorsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("http://localhost:*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Authenticates a request from the {@code X-Test-Oid} header by constructing a
     * {@link JwtAuthenticationToken} whose claims mirror an Azure AD token. The real
     * {@link RoleAuthorizationFilter} then assigns authorities from the database.
     */
    static class TestHeaderAuthFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            String oid = request.getHeader("X-Test-Oid");
            // Set our token whenever the header is present and we haven't already authenticated
            // via JWT. We must overwrite any AnonymousAuthenticationToken (Spring's anonymous
            // filter runs before this one), otherwise admin requests stay anonymous -> 403.
            boolean alreadyJwt = SecurityContextHolder.getContext().getAuthentication()
                    instanceof JwtAuthenticationToken;
            if (oid != null && !oid.isBlank() && !alreadyJwt) {
                String email = request.getHeader("X-Test-Email");
                if (email == null || email.isBlank()) email = oid + "@e2e.test";
                String name = request.getHeader("X-Test-Name");
                if (name == null || name.isBlank()) name = oid;

                Instant now = Instant.now();
                Jwt jwt = Jwt.withTokenValue("e2e-test-token")
                        .header("alg", "none")
                        .subject(oid)
                        .claim("oid", oid)
                        .claim("preferred_username", email)
                        .claim("name", name)
                        .issuedAt(now)
                        .expiresAt(now.plusSeconds(3600))
                        .build();

                // No authorities yet — RoleAuthorizationFilter enriches from the DB role.
                SecurityContextHolder.getContext().setAuthentication(
                        new JwtAuthenticationToken(jwt, List.of()));
            }
            chain.doFilter(request, response);
        }
    }
}
