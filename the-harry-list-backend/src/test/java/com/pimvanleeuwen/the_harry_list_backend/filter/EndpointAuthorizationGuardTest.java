package com.pimvanleeuwen.the_harry_list_backend.filter;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guards the RBAC boundary for every controller, so a new endpoint cannot silently skip it:
 * <ul>
 *   <li>every create/update/delete handler under {@code /api/admin} or {@code /api/reservations}
 *       declares {@code @PreAuthorize} (on the method or its class);</li>
 *   <li>every controller that uses {@code @PreAuthorize} lives on a path that
 *       {@link RoleAuthorizationFilter} enriches with roles, otherwise its checks reject everyone.</li>
 * </ul>
 * Reads are not required to declare a role: every enriched user is at least a VIEWER.
 */
class EndpointAuthorizationGuardTest {

    private static final String BASE_PACKAGE = "com.pimvanleeuwen.the_harry_list_backend";
    private static final List<String> STAFF_PREFIXES = List.of("/api/admin", "/api/reservations");

    private final RoleAuthorizationFilter filter = new RoleAuthorizationFilter(null, "");

    @Test
    void everyStaffWriteEndpointDeclaresARole() throws Exception {
        List<String> unguarded = new ArrayList<>();
        for (Class<?> controller : controllers()) {
            String basePath = basePath(controller);
            if (STAFF_PREFIXES.stream().noneMatch(basePath::startsWith)) continue;
            boolean classGuarded = controller.isAnnotationPresent(PreAuthorize.class);
            for (Method method : controller.getDeclaredMethods()) {
                RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
                if (mapping == null || !isWrite(mapping)) continue;
                if (!classGuarded && !method.isAnnotationPresent(PreAuthorize.class)) {
                    unguarded.add(controller.getSimpleName() + "." + method.getName()
                            + " " + Arrays.toString(mapping.method()) + " " + basePath);
                }
            }
        }
        assertTrue(unguarded.isEmpty(), "Write endpoints without @PreAuthorize: " + unguarded);
    }

    @Test
    void everyRoleCheckedControllerIsEnrichedByTheRoleFilter() throws Exception {
        List<String> notEnriched = new ArrayList<>();
        for (Class<?> controller : controllers()) {
            boolean usesRoles = controller.isAnnotationPresent(PreAuthorize.class)
                    || Arrays.stream(controller.getDeclaredMethods())
                            .anyMatch(m -> m.isAnnotationPresent(PreAuthorize.class));
            if (!usesRoles) continue;
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setRequestURI(basePath(controller));
            if (filter.shouldNotFilter(request)) {
                notEnriched.add(controller.getSimpleName() + " " + basePath(controller));
            }
        }
        assertTrue(notEnriched.isEmpty(),
                "Controllers with @PreAuthorize on paths RoleAuthorizationFilter skips: " + notEnriched);
    }

    private static boolean isWrite(RequestMapping mapping) {
        return Arrays.stream(mapping.method()).anyMatch(m ->
                m == RequestMethod.POST || m == RequestMethod.PUT
                        || m == RequestMethod.PATCH || m == RequestMethod.DELETE);
    }

    private static String basePath(Class<?> controller) {
        RequestMapping mapping = controller.getAnnotation(RequestMapping.class);
        if (mapping == null) return "";
        String[] paths = mapping.value().length > 0 ? mapping.value() : mapping.path();
        return paths.length > 0 ? paths[0] : "";
    }

    private static List<Class<?>> controllers() throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        List<Class<?>> result = new ArrayList<>();
        for (BeanDefinition definition : scanner.findCandidateComponents(BASE_PACKAGE)) {
            result.add(Class.forName(definition.getBeanClassName()));
        }
        assertTrue(result.size() > 5, "Controller scan found too few classes: " + result);
        return result;
    }
}
