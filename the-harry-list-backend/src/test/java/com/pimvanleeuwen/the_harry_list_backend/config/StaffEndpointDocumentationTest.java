package com.pimvanleeuwen.the_harry_list_backend.config;

import com.pimvanleeuwen.the_harry_list_backend.controller.AdminReservationController;
import com.pimvanleeuwen.the_harry_list_backend.controller.AdminUserController;
import com.pimvanleeuwen.the_harry_list_backend.controller.open.PublicReservationController;
import com.pimvanleeuwen.the_harry_list_backend.controller.open.ReservationController;
import io.swagger.v3.oas.models.Operation;
import org.junit.jupiter.api.Test;
import org.springframework.web.method.HandlerMethod;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class StaffEndpointDocumentationTest {

    private final StaffEndpointDocumentation documentation = new StaffEndpointDocumentation();

    private static HandlerMethod handler(Class<?> controller, String methodName) {
        Method method = Arrays.stream(controller.getDeclaredMethods())
                .filter(m -> m.getName().equals(methodName))
                .findFirst()
                .orElseThrow();
        return new HandlerMethod(mock(controller), method);
    }

    private Operation documented(Class<?> controller, String methodName, String description) {
        return documentation.customize(new Operation().description(description), handler(controller, methodName));
    }

    @Test
    void staffEndpointsGetTheBearerRequirementAndTheirRole() {
        Operation op = documented(AdminUserController.class, "getAllUsers", "List all admin users");

        assertEquals(List.of(StaffEndpointDocumentation.SECURITY_SCHEME),
                List.copyOf(op.getSecurity().get(0).keySet()));
        assertEquals("List all admin users\n\n**Required role:** ADMIN", op.getDescription());
    }

    @Test
    void lowerRolesAdmitTheRolesAboveThem() {
        assertTrue(documented(ReservationController.class, "getReservations", null)
                .getDescription().endsWith("**Required role:** VIEWER or higher"));
        assertTrue(documented(AdminReservationController.class, "updateStatus", null)
                .getDescription().endsWith("**Required role:** EDITOR or higher"));
    }

    @Test
    void staffEndpointsWithoutARoleCheckNeedAnySignedInStaffMember() {
        Operation op = documented(AdminUserController.class, "getCurrentUser", null);
        assertEquals("**Required role:** any signed-in staff member (VIEWER or higher)", op.getDescription());
    }

    @Test
    void publicEndpointsAreLeftUntouched() {
        Operation op = documented(PublicReservationController.class, "submitReservation", "Submit a reservation");
        assertNull(op.getSecurity());
        assertEquals("Submit a reservation", op.getDescription());
    }
}
