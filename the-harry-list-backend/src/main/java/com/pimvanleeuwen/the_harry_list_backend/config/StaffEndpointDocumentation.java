package com.pimvanleeuwen.the_harry_list_backend.config;

import com.pimvanleeuwen.the_harry_list_backend.filter.RoleAuthorizationFilter;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.method.HandlerMethod;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Documents who may call each staff endpoint, derived from the code instead of written by hand:
 * every operation under a role-protected path ({@link RoleAuthorizationFilter#ROLE_PROTECTED_PREFIXES})
 * gets the {@value #SECURITY_SCHEME} requirement (so Swagger UI sends the token) and a "Required role"
 * line built from its {@code @PreAuthorize}. Public endpoints are left untouched. A new endpoint is
 * therefore documented correctly without anyone having to remember an annotation.
 */
@Component
public class StaffEndpointDocumentation implements OperationCustomizer {

    /** Name of the bearer-token security scheme declared in {@link OpenApiConfig}. */
    public static final String SECURITY_SCHEME = "bearerAuth";

    private static final Pattern HAS_ROLE = Pattern.compile("hasRole\\('([A-Z_]+)'\\)");

    @Override
    public Operation customize(Operation operation, HandlerMethod handlerMethod) {
        if (!isStaffEndpoint(handlerMethod)) {
            return operation;
        }
        operation.addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME));
        String note = "**Required role:** " + requiredRole(handlerMethod);
        String description = operation.getDescription();
        operation.setDescription(description == null || description.isBlank() ? note : description + "\n\n" + note);
        return operation;
    }

    private static boolean isStaffEndpoint(HandlerMethod handlerMethod) {
        RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(handlerMethod.getBeanType(), RequestMapping.class);
        if (mapping == null || mapping.path().length == 0) {
            return false;
        }
        String basePath = mapping.path()[0];
        return RoleAuthorizationFilter.ROLE_PROTECTED_PREFIXES.stream()
                .anyMatch(prefix -> basePath.equals(prefix) || basePath.startsWith(prefix + "/"));
    }

    /** Roles are hierarchical (VIEWER, then EDITOR, then ADMIN), so a role also admits the ones above it. */
    static String requiredRole(HandlerMethod handlerMethod) {
        PreAuthorize preAuthorize = handlerMethod.getMethodAnnotation(PreAuthorize.class);
        if (preAuthorize == null) {
            preAuthorize = AnnotatedElementUtils.findMergedAnnotation(handlerMethod.getBeanType(), PreAuthorize.class);
        }
        if (preAuthorize == null) {
            return "any signed-in staff member (VIEWER or higher)";
        }
        Matcher matcher = HAS_ROLE.matcher(preAuthorize.value());
        if (!matcher.matches()) {
            return "`" + preAuthorize.value() + "`";
        }
        String role = matcher.group(1);
        return "ADMIN".equals(role) ? "ADMIN" : role + " or higher";
    }
}
