package com.pimvanleeuwen.the_harry_list_backend.filter;

import com.pimvanleeuwen.the_harry_list_backend.model.AdminRole;
import com.pimvanleeuwen.the_harry_list_backend.model.AdminUser;
import com.pimvanleeuwen.the_harry_list_backend.service.AdminUserService;
import com.pimvanleeuwen.the_harry_list_backend.util.AuditActorResolver;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Enriches the SecurityContext with role-based authorities for admin and staff reservation endpoints.
 * Runs after JWT authentication, looks up the user in the database (auto-creating
 * on first login), and adds hierarchical ROLE_ authorities.
 *
 * <p>When {@code azure.allowed-group-id} is set, the token must also carry that Entra security
 * group in its {@code groups} claim. Tokens without it get a 403 before any user row is created,
 * so tenant members outside the staff group cannot reach the API even if they obtain a token.
 * Requires the app registration to emit the groups claim in access tokens.
 */
@Component
public class RoleAuthorizationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RoleAuthorizationFilter.class);

    private final AdminUserService adminUserService;
    private final String allowedGroupId;

    public RoleAuthorizationFilter(AdminUserService adminUserService,
                                   @Value("${azure.allowed-group-id:}") String allowedGroupId) {
        this.adminUserService = adminUserService;
        this.allowedGroupId = allowedGroupId == null ? "" : allowedGroupId.trim();
        if (this.allowedGroupId.isEmpty()) {
            log.warn("ALLOWED_GROUP_ID is not set: the backend accepts every user of the tenant. "
                    + "Staff group membership is then only checked by the admin UI.");
        }
    }

    /**
     * Every path whose endpoints are guarded by {@code @PreAuthorize} role checks. A protected
     * path missing here gets no {@code ROLE_} authorities, so its role checks would reject everyone.
     */
    private static final List<String> ROLE_PROTECTED_PREFIXES = List.of("/api/admin", "/api/reservations");

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return ROLE_PROTECTED_PREFIXES.stream()
                .noneMatch(prefix -> uri.equals(prefix) || uri.startsWith(prefix + "/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();

            String oid = AuditActorResolver.extractOid(jwt);
            String email = AuditActorResolver.extractEmail(jwt);
            if (email == null) email = "unknown";
            String name = AuditActorResolver.extractName(jwt);

            if (!isInAllowedGroup(jwt)) {
                rejectNotInGroup(response, oid);
                return;
            }

            if (oid != null) {
                AdminUser user = adminUserService.getOrCreateUser(oid, email, name);
                List<GrantedAuthority> authorities = buildAuthorities(user.getRole());

                // Wrap existing authentication with role-based authorities
                AbstractAuthenticationToken enriched = new JwtAuthenticationToken(jwt, authorities, jwtAuth.getName());
                enriched.setDetails(jwtAuth.getDetails());
                SecurityContextHolder.getContext().setAuthentication(enriched);
            }
        }

        filterChain.doFilter(request, response);
    }

    /** True when no group restriction is configured or the token lists the allowed group. */
    boolean isInAllowedGroup(Jwt jwt) {
        if (allowedGroupId.isEmpty()) {
            return true;
        }
        List<String> groups = jwt.getClaimAsStringList("groups");
        return groups != null && groups.contains(allowedGroupId);
    }

    private void rejectNotInGroup(HttpServletResponse response, String oid) throws IOException {
        // Entra drops the groups claim when a user is in too many groups (overage) and adds a
        // _claim_names pointer instead. Emitting only "groups assigned to the application" avoids it.
        log.warn("Rejected token for oid={}: not a member of the allowed staff group", oid);
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"NOT_IN_STAFF_GROUP\","
                + "\"message\":\"You are not a member of the staff group for this application.\"}");
    }

    /**
     * Build hierarchical authorities: ADMIN gets all three, EDITOR gets EDITOR + VIEWER, etc.
     */
    List<GrantedAuthority> buildAuthorities(AdminRole role) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_VIEWER"));
        if (role == AdminRole.EDITOR || role == AdminRole.ADMIN) {
            authorities.add(new SimpleGrantedAuthority("ROLE_EDITOR"));
        }
        if (role == AdminRole.ADMIN) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }
        return authorities;
    }

}
