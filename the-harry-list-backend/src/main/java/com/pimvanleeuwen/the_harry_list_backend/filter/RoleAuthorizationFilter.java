package com.pimvanleeuwen.the_harry_list_backend.filter;

import com.pimvanleeuwen.the_harry_list_backend.model.AdminRole;
import com.pimvanleeuwen.the_harry_list_backend.model.AdminUser;
import com.pimvanleeuwen.the_harry_list_backend.service.AdminUserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
 * Enriches the SecurityContext with role-based authorities for admin endpoints.
 * Runs after JWT authentication, looks up the user in the database (auto-creating
 * on first login), and adds hierarchical ROLE_ authorities.
 */
@Component
public class RoleAuthorizationFilter extends OncePerRequestFilter {

    private final AdminUserService adminUserService;

    public RoleAuthorizationFilter(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/admin");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();

            String oid = extractOid(jwt);
            String email = extractEmail(jwt);
            String name = extractName(jwt);

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

    private String extractOid(Jwt jwt) {
        // Azure AD v2.0 tokens use "oid" claim, v1.0 uses "sub"
        String oid = jwt.getClaimAsString("oid");
        return oid != null ? oid : jwt.getSubject();
    }

    private String extractEmail(Jwt jwt) {
        // Azure AD tokens may use "preferred_username", "email", or "upn"
        String email = jwt.getClaimAsString("preferred_username");
        if (email == null) email = jwt.getClaimAsString("email");
        if (email == null) email = jwt.getClaimAsString("upn");
        return email != null ? email : "unknown";
    }

    private String extractName(Jwt jwt) {
        return jwt.getClaimAsString("name");
    }
}
