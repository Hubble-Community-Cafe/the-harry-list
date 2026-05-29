package com.pimvanleeuwen.the_harry_list_backend.filter;

import com.pimvanleeuwen.the_harry_list_backend.model.AdminRole;
import com.pimvanleeuwen.the_harry_list_backend.model.AdminUser;
import com.pimvanleeuwen.the_harry_list_backend.service.AdminUserService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoleAuthorizationFilterTest {

    @Mock
    private AdminUserService adminUserService;

    @Mock
    private FilterChain filterChain;

    private RoleAuthorizationFilter filter;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    private static final String OID = "d7795f0e-32fd-4618-b5da-bf2c0079dd4a";

    @BeforeEach
    void setUp() {
        filter = new RoleAuthorizationFilter(adminUserService);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldSkipNonAdminPaths() throws Exception {
        request.setRequestURI("/api/public/reservations");

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(adminUserService, never()).getOrCreateUser(anyString(), anyString(), anyString());
    }

    @Test
    void shouldEnrichAdminRequestWithViewerAuthorities() throws Exception {
        request.setRequestURI("/api/admin/reservations");
        setupJwtAuth(AdminRole.VIEWER);

        filter.doFilter(request, response, filterChain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertTrue(hasAuthority(auth.getAuthorities(), "ROLE_VIEWER"));
        assertFalse(hasAuthority(auth.getAuthorities(), "ROLE_EDITOR"));
        assertFalse(hasAuthority(auth.getAuthorities(), "ROLE_ADMIN"));
    }

    @Test
    void shouldEnrichAdminRequestWithEditorAuthorities() throws Exception {
        request.setRequestURI("/api/admin/reservations");
        setupJwtAuth(AdminRole.EDITOR);

        filter.doFilter(request, response, filterChain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertTrue(hasAuthority(auth.getAuthorities(), "ROLE_VIEWER"));
        assertTrue(hasAuthority(auth.getAuthorities(), "ROLE_EDITOR"));
        assertFalse(hasAuthority(auth.getAuthorities(), "ROLE_ADMIN"));
    }

    @Test
    void shouldEnrichAdminRequestWithAllAuthoritiesForAdmin() throws Exception {
        request.setRequestURI("/api/admin/reservations");
        setupJwtAuth(AdminRole.ADMIN);

        filter.doFilter(request, response, filterChain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertTrue(hasAuthority(auth.getAuthorities(), "ROLE_VIEWER"));
        assertTrue(hasAuthority(auth.getAuthorities(), "ROLE_EDITOR"));
        assertTrue(hasAuthority(auth.getAuthorities(), "ROLE_ADMIN"));
    }

    @Test
    void shouldContinueFilterChainEvenWithoutJwtAuth() throws Exception {
        request.setRequestURI("/api/admin/reservations");
        // No authentication set in SecurityContext

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(adminUserService, never()).getOrCreateUser(anyString(), anyString(), anyString());
    }

    @Test
    void buildAuthorities_shouldBeHierarchical() {
        assertEquals(1, filter.buildAuthorities(AdminRole.VIEWER).size());
        assertEquals(2, filter.buildAuthorities(AdminRole.EDITOR).size());
        assertEquals(3, filter.buildAuthorities(AdminRole.ADMIN).size());
    }

    private void setupJwtAuth(AdminRole role) {
        Jwt jwt = new Jwt("token", Instant.now(), Instant.now().plusSeconds(3600),
                Map.of("alg", "RS256"),
                Map.of("oid", OID, "preferred_username", "pim@hubble.cafe", "name", "Pim", "sub", OID));

        JwtAuthenticationToken jwtAuth = new JwtAuthenticationToken(jwt);
        SecurityContextHolder.getContext().setAuthentication(jwtAuth);

        AdminUser user = new AdminUser();
        user.setAzureOid(OID);
        user.setEmail("pim@hubble.cafe");
        user.setDisplayName("Pim");
        user.setRole(role);
        when(adminUserService.getOrCreateUser(OID, "pim@hubble.cafe", "Pim")).thenReturn(user);
    }

    private boolean hasAuthority(java.util.Collection<? extends GrantedAuthority> authorities, String authority) {
        return authorities.stream().anyMatch(a -> a.getAuthority().equals(authority));
    }
}
