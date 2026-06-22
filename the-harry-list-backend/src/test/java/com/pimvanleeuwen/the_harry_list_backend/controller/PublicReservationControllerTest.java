package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pimvanleeuwen.the_harry_list_backend.altcha.AltchaService;
import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.dto.PublicReservationRequest;
import com.pimvanleeuwen.the_harry_list_backend.service.AdminUserService;
import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.service.CreateReservationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for PublicReservationController.
 * Verifies that public reservation submission works without authentication.
 */
@WebMvcTest(com.pimvanleeuwen.the_harry_list_backend.controller.open.PublicReservationController.class)
@Import(SecurityConfig.class)
class PublicReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminUserService adminUserService;

    @MockitoBean
    private CreateReservationService createReservationService;

    @MockitoBean
    private AltchaService altchaService;

    private ObjectMapper objectMapper;
    private PublicReservationRequest sampleRequest;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        sampleRequest = createSampleRequest();

        // ALTCHA disabled by default so existing submit tests need no captcha payload.
        when(altchaService.verify(any())).thenReturn(true);
        when(altchaService.isEnabled()).thenReturn(false);
    }

    @Test
    void submitReservation_shouldWorkWithoutAuthentication() throws Exception {
        Reservation responseReservation = sampleRequest.toReservation();
        responseReservation.setId(1L);
        responseReservation.setConfirmationNumber("ABC123");
        when(createReservationService.execute(any(Reservation.class)))
                .thenReturn(ResponseEntity.status(201).body(responseReservation));

        mockMvc.perform(post("/api/public/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.confirmationNumber").value("ABC123"))
                .andExpect(jsonPath("$.eventTitle").value("Annual Borrel"))
                .andExpect(jsonPath("$.contactName").value("John Doe"))
                .andExpect(jsonPath("$.email").value("john@example.com"))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void submitReservation_shouldReturnConfirmationMessage() throws Exception {
        Reservation responseReservation = sampleRequest.toReservation();
        responseReservation.setId(42L);
        responseReservation.setConfirmationNumber("XYZ789");
        when(createReservationService.execute(any(Reservation.class)))
                .thenReturn(ResponseEntity.status(201).body(responseReservation));

        mockMvc.perform(post("/api/public/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.confirmationNumber").value("XYZ789"))
                .andExpect(jsonPath("$.message").value(
                    "Your reservation request has been submitted successfully. " +
                    "We will review your request and contact you at john@example.com soon."
                ));
    }

    @Test
    void submitReservation_shouldFailWhenAltchaVerificationFails() throws Exception {
        when(altchaService.verify(any())).thenReturn(false);

        mockMvc.perform(post("/api/public/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Captcha verification failed. Please try again."));
    }

    @Test
    void submitReservation_shouldSucceedWhenAltchaVerificationPasses() throws Exception {
        when(altchaService.verify(any())).thenReturn(true);

        Reservation responseReservation = sampleRequest.toReservation();
        responseReservation.setId(1L);
        responseReservation.setConfirmationNumber("ABC123");
        when(createReservationService.execute(any(Reservation.class)))
                .thenReturn(ResponseEntity.status(201).body(responseReservation));

        sampleRequest.setAltcha("valid-altcha-payload");

        mockMvc.perform(post("/api/public/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.confirmationNumber").value("ABC123"));
    }

    private PublicReservationRequest createSampleRequest() {
        return PublicReservationRequest.builder()
                .contactName("John Doe")
                .email("john@example.com")
                .phoneNumber("+31612345678")
                .organizationName("Test Association")
                .eventTitle("Annual Borrel")
                .description("Our yearly drinks event")
                .specialActivities(Set.of(SpecialActivity.GRADUATION))
                .expectedGuests(50)
                .eventDate(LocalDate.of(2026, 3, 15))
                .startTime(LocalTime.of(16, 0))
                .endTime(LocalTime.of(22, 0))
                .location(BarLocation.HUBBLE)
                .seatingArea(SeatingArea.INSIDE)
                .paymentOption(PaymentOption.INDIVIDUAL)
                .termsAccepted(true)
                .build();
    }
}
