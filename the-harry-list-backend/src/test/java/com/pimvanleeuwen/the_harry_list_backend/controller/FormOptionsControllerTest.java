package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.repository.BlockedPeriodRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.FormConstraintRepository;
import com.pimvanleeuwen.the_harry_list_backend.service.AdminUserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for FormOptionsController.
 * These endpoints are the single source of the options the public form and the admin
 * panel render, so a retired activity must not appear in either of them.
 */
@WebMvcTest(com.pimvanleeuwen.the_harry_list_backend.controller.open.FormOptionsController.class)
@Import(SecurityConfig.class)
class FormOptionsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminUserService adminUserService;

    @MockitoBean
    private FormConstraintRepository formConstraintRepository;

    @MockitoBean
    private BlockedPeriodRepository blockedPeriodRepository;

    @Test
    void getSpecialActivities_shouldOfferOnlySelectableActivities() throws Exception {
        mockMvc.perform(get("/api/options/special-activities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[?(@.value == 'GRADUATION')]").exists())
                .andExpect(jsonPath("$[?(@.value == 'EAT_A_LA_CARTE')]").exists())
                .andExpect(jsonPath("$[?(@.value == 'EAT_CATERING')]").exists())
                .andExpect(jsonPath("$[?(@.value == 'CATERING_CORONA_ROOM')]").exists());
    }

    @Test
    void getSpecialActivities_shouldNotOfferTheRetiredPrivateEvent() throws Exception {
        mockMvc.perform(get("/api/options/special-activities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.value == 'PRIVATE_EVENT')]").doesNotExist());
    }

    @Test
    void getAllOptions_shouldNotOfferTheRetiredPrivateEvent() throws Exception {
        // The form loads everything through /all, so filtering only the dedicated endpoint
        // would leave the retired activity on screen.
        mockMvc.perform(get("/api/options/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.specialActivities.length()").value(4))
                .andExpect(jsonPath("$.specialActivities[?(@.value == 'PRIVATE_EVENT')]").doesNotExist());
    }

    @Test
    void getAllOptions_shouldStillReturnTheOtherOptionGroups() throws Exception {
        mockMvc.perform(get("/api/options/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentOptions").isNotEmpty())
                .andExpect(jsonPath("$.invoiceTypes").isNotEmpty())
                .andExpect(jsonPath("$.locations").isNotEmpty())
                .andExpect(jsonPath("$.seatingAreas").isNotEmpty());
    }
}
