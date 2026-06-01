package com.pimvanleeuwen.the_harry_list_backend.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Resolves the current actor (the authenticated user) for audit logging, and
 * centralizes the Azure AD claim-extraction logic that was previously duplicated
 * across the security filter and controllers.
 */
public final class AuditActorResolver {

    private AuditActorResolver() {
    }

    /** Actor identity captured on an audit entry. Any field may be null. */
    public record Actor(String oid, String email, String name) {
    }

    /** Fallback actor for changes not made by an authenticated admin user. */
    public static final Actor SYSTEM = new Actor(null, null, "system");

    /** Actor for changes originating from a public (unauthenticated) reservation submission. */
    public static final Actor PUBLIC = new Actor(null, null, "public submission");

    /**
     * Resolve the current actor from the security context. Returns {@link #SYSTEM}
     * when there is no recognizable authenticated principal.
     */
    public static Actor resolveCurrentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            return new Actor(extractOid(jwt), extractEmail(jwt), extractName(jwt));
        }

        if (auth != null && auth.isAuthenticated() && auth.getName() != null
                && !"anonymousUser".equals(auth.getName())) {
            // e.g. tests using @WithMockUser, or other non-JWT authentication
            return new Actor(null, null, auth.getName());
        }

        return SYSTEM;
    }

    /** Azure AD v2.0 tokens use the "oid" claim; v1.0 uses "sub". */
    public static String extractOid(Jwt jwt) {
        String oid = jwt.getClaimAsString("oid");
        return oid != null ? oid : jwt.getSubject();
    }

    /** Azure AD tokens may carry the email under "preferred_username", "email", or "upn". */
    public static String extractEmail(Jwt jwt) {
        String email = jwt.getClaimAsString("preferred_username");
        if (email == null) email = jwt.getClaimAsString("email");
        if (email == null) email = jwt.getClaimAsString("upn");
        return email;
    }

    public static String extractName(Jwt jwt) {
        return jwt.getClaimAsString("name");
    }
}
