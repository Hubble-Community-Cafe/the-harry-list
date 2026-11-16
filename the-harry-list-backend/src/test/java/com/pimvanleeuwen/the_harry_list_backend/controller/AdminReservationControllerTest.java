package com.pimvanleeuwen.the_harry_list_backend.controller;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pimvanleeuwen.the_harry_list_backend.LogCapture;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pimvanleeuwen.the_harry_list_backend.dto.CateringEmailRequest;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.service.AdminUserService;
import com.pimvanleeuwen.the_harry_list_backend.repository.EmailAttachmentRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import com.pimvanleeuwen.the_harry_list_backend.service.AuditService;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailNotificationService;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailTemplateService;
import com.pimvanleeuwen.the_harry_list_backend.service.ReservationLifecycleService;
import com.pimvanleeuwen.the_harry_list_backend.service.ReservationMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for AdminReservationController. The lifecycle endpoints run through the real
 * {@link ReservationLifecycleService}, so these tests cover the HTTP contract end to end.
 */
@WebMvcTest(AdminReservationController.class)
@Import(ReservationLifecycleService.class)
class AdminReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminUserService adminUserService;

    @MockitoBean
    private ReservationRepository reservationRepository;

    @MockitoBean
    private ReservationMapper reservationMapper;

    @MockitoBean
    private EmailNotificationService emailNotificationService;

    @MockitoBean
    private EmailTemplateService emailTemplateService;

    @MockitoBean
    private EmailAttachmentRepository emailAttachmentRepository;

    @MockitoBean
    private AuditService auditService;

    private ObjectMapper objectMapper;
    private Reservation sampleReservation;
    private com.pimvanleeuwen.the_harry_list_backend.dto.Reservation sampleDto;

    private Logger analyticsLogger;
    private ListAppender<ILoggingEvent> analyticsAppender;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        sampleReservation = createSampleReservation();
        sampleDto = createSampleDto();

        analyticsLogger = (Logger) LoggerFactory.getLogger("analytics");
        analyticsAppender = new ListAppender<>();
        analyticsAppender.start();
        analyticsLogger.addAppender(analyticsAppender);
    }

    @AfterEach
    void tearDown() {
        analyticsLogger.detachAppender(analyticsAppender);
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldConfirmReservation() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CONFIRMED")
                .param("confirmedBy", "Admin User")
                .param("sendEmail", "true"))
            .andExpect(status().isOk());

        verify(reservationRepository).save(argThat(res ->
            res.getStatus() == ReservationStatus.CONFIRMED &&
            "Admin User".equals(res.getConfirmedBy())
        ));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldRecordAuditEntry() throws Exception {
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CONFIRMED"))
            .andExpect(status().isOk());

        verify(auditService).recordAction(
            eq(com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType.RESERVATION),
            eq(1L), any(),
            eq(com.pimvanleeuwen.the_harry_list_backend.model.AuditAction.STATUS_CHANGE),
            any(), any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateInternalNotes_shouldRecordAuditEntry() throws Exception {
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        mockMvc.perform(patch("/api/admin/reservations/1/notes")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("\"secret notes\""))
            .andExpect(status().isOk());

        verify(auditService).recordAction(
            eq(com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType.RESERVATION),
            eq(1L), any(),
            eq(com.pimvanleeuwen.the_harry_list_backend.model.AuditAction.NOTES_UPDATED),
            any(), any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldRejectReservation() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "REJECTED"))
            .andExpect(status().isOk());

        verify(reservationRepository).save(argThat(res ->
            res.getStatus() == ReservationStatus.REJECTED
        ));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldReopenRejectedReservationToPending() throws Exception {
        // Given a previously rejected reservation
        sampleReservation.setStatus(ReservationStatus.REJECTED);
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When it is moved back to pending (e.g. to change date/location without re-submission)
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "PENDING")
                .param("sendEmail", "false"))
            .andExpect(status().isOk());

        // Then the reservation is persisted as PENDING again...
        verify(reservationRepository).save(argThat(res ->
            res.getStatus() == ReservationStatus.PENDING
        ));
        // ...and no customer email is sent for this internal correction.
        verify(emailNotificationService, never()).sendStatusChangeEmail(any(), any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldCancelReservation() throws Exception {
        // Given a confirmed reservation (only those can be cancelled)
        sampleReservation.setStatus(ReservationStatus.CONFIRMED);
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CANCELLED"))
            .andExpect(status().isOk());

        verify(reservationRepository).save(argThat(res ->
            res.getStatus() == ReservationStatus.CANCELLED
        ));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldReopenCancelledReservationToPending() throws Exception {
        sampleReservation.setStatus(ReservationStatus.CANCELLED);
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "PENDING")
                .param("sendEmail", "false"))
            .andExpect(status().isOk());

        verify(reservationRepository).save(argThat(res -> res.getStatus() == ReservationStatus.PENDING));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldRefuseTransitionTheUiDoesNotOffer() throws Exception {
        // A pending request is confirmed or rejected; it cannot be cancelled directly.
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));

        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CANCELLED"))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.detail").value("A pending reservation cannot be moved to cancelled"));

        verify(reservationRepository, never()).save(any());
        verifyNoInteractions(auditService, emailNotificationService);
        assertTrue(analyticsAppender.list.isEmpty());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldRejectRemovedCompletedStatus() throws Exception {
        // COMPLETED was dropped from ReservationStatus in 1.12.0. An old client (or a
        // bookmarked request) sending it must fail cleanly rather than change anything.
        sampleReservation.setStatus(ReservationStatus.CONFIRMED);

        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "COMPLETED"))
            .andExpect(status().isBadRequest());

        verify(reservationRepository, never()).save(any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldEmitPrivacySafeAnalyticsLineOnConfirm() throws Exception {
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CONFIRMED"))
            .andExpect(status().isOk());

        assertEquals(1, analyticsAppender.list.size(), "One analytics line per terminal status change");
        assertEquals("APP_ANALYTICS event=reservation_status_changed status=CONFIRMED bar=HUBBLE",
                analyticsAppender.list.get(0).getFormattedMessage());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldNotEmitAnalyticsWhenReopenedToPending() throws Exception {
        // A rejected reservation moved back to PENDING is internal churn — no analytics line.
        sampleReservation.setStatus(ReservationStatus.REJECTED);
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "PENDING")
                .param("sendEmail", "false"))
            .andExpect(status().isOk());

        assertTrue(analyticsAppender.list.isEmpty(), "PENDING transitions must not emit an analytics line");
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldReturnNotFoundWhenReservationDoesNotExist() throws Exception {
        // Given
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/999/status")
                .with(csrf())
                .param("status", "CONFIRMED"))
            .andExpect(status().isNotFound())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.status").value(404))
            .andExpect(jsonPath("$.detail").value("Reservation 999 not found"));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldRefuseToConfirmWithoutLocation() throws Exception {
        sampleReservation.setLocation(BarLocation.NO_PREFERENCE);
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));

        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CONFIRMED"))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.detail").value("Location must be set before confirming"));

        verify(reservationRepository, never()).save(any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void sendCustomEmail_shouldNotLeakMailProviderErrorText() throws Exception {
        // Provider errors can contain internal details; staff get a generic message instead.
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        doThrow(new RuntimeException("Graph 401: token for tenant abc expired"))
                .when(emailNotificationService).sendCustomEmail(any(), any(), any());

        mockMvc.perform(post("/api/admin/reservations/1/email")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"subject\":\"Hi\",\"message\":\"Hello\"}"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.detail").value("The email could not be sent. Please try again later."))
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("tenant abc"))));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldSendEmailWhenEnabled() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CONFIRMED")
                .param("sendEmail", "true"))
            .andExpect(status().isOk());

        // Then
        verify(emailNotificationService).sendStatusChangeEmail(any(), any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldNotSendEmailWhenDisabled() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CONFIRMED")
                .param("sendEmail", "false"))
            .andExpect(status().isOk());

        // Then
        verify(emailNotificationService, never()).sendStatusChangeEmail(any(), any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldForwardCustomMessageToEmail() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "REJECTED")
                .param("customMessage", "Sorry, we are fully booked that day."))
            .andExpect(status().isOk());

        // Then
        verify(emailNotificationService).sendStatusChangeEmail(any(),
                eq("Sorry, we are fully booked that day."));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldNoteCustomMessageInAuditWhenProvided() throws Exception {
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "REJECTED")
                .param("customMessage", "No space available."))
            .andExpect(status().isOk());

        verify(auditService).recordAction(
            eq(com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType.RESERVATION),
            eq(1L), any(),
            eq(com.pimvanleeuwen.the_harry_list_backend.model.AuditAction.STATUS_CHANGE),
            any(), contains("(with message)"));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateInternalNotes_shouldUpdateNotes() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/1/notes")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("\"These are internal notes\""))
            .andExpect(status().isOk());

        verify(reservationRepository).save(any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateInternalNotes_shouldRejectTooLongNotesWithA400() throws Exception {
        mockMvc.perform(patch("/api/admin/reservations/1/notes")
                .with(csrf())
                .contentType(MediaType.TEXT_PLAIN)
                .content("x".repeat(5001)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.detail").value("Internal notes must not exceed 5000 characters"));

        verify(reservationRepository, never()).save(any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateStatus_shouldNotLetConfirmedByForgeALogLine() throws Exception {
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);
        sampleReservation.setEventTitle("Party\nAUDIT reservation.deleted id=7");

        try (LogCapture logs = LogCapture.start()) {
            mockMvc.perform(patch("/api/admin/reservations/1/status")
                    .with(csrf())
                    .param("status", "CONFIRMED")
                    .param("confirmedBy", "Ann' user='someone-else")
                    .param("sendEmail", "false"))
                .andExpect(status().isOk());

            logs.assertNeverLogged("\nAUDIT", "user='someone-else");
        }
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateInternalNotes_shouldReturnNotFoundWhenReservationDoesNotExist() throws Exception {
        // Given
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/999/notes")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("\"These are internal notes\""))
            .andExpect(status().isNotFound());
    }

    @Test
    void updateStatus_shouldRequireAuthentication() throws Exception {
        // When/Then - no @WithMockUser
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CONFIRMED"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void previewCateringEmail_shouldReturnRenderedTemplate() throws Exception {
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(emailTemplateService.getRenderedSubject(eq(EmailTemplateType.CATERING_OPTIONS), any()))
                .thenReturn("Catering Options for Test Event");
        when(emailTemplateService.getRenderedBody(eq(EmailTemplateType.CATERING_OPTIONS), any()))
                .thenReturn("<p>Hello John</p>");

        mockMvc.perform(get("/api/admin/reservations/1/catering-email/preview"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.subject").value("Catering Options for Test Event"))
            .andExpect(jsonPath("$.body").value("<p>Hello John</p>"))
            .andExpect(jsonPath("$.defaultReplyTo").value("reservations@test.hubble.cafe"));
    }

    @Test
    @WithMockUser
    void previewCateringEmail_shouldReturn404WhenNotFound() throws Exception {
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/admin/reservations/999/catering-email/preview"))
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void sendCateringEmail_shouldSendWithAttachments() throws Exception {
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(emailTemplateService.getRenderedSubject(eq(EmailTemplateType.CATERING_OPTIONS), any()))
                .thenReturn("Catering Subject");
        when(emailTemplateService.getRenderedBody(eq(EmailTemplateType.CATERING_OPTIONS), any()))
                .thenReturn("<p>Body</p>");

        EmailAttachment attachment = EmailAttachment.builder()
                .id(1L).name("Menu").filename("menu.pdf")
                .contentType("application/pdf").data(new byte[]{1, 2, 3}).active(true).build();
        when(emailAttachmentRepository.findAllById(List.of(1L))).thenReturn(List.of(attachment));

        String requestBody = objectMapper.writeValueAsString(
                new CateringEmailRequest() {{ setAttachmentIds(List.of(1L)); }});

        try (LogCapture logs = LogCapture.start()) {
            mockMvc.perform(post("/api/admin/reservations/1/catering-email")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("sent"));

            // The delivery is logged by confirmation number, never by the guest's address.
            assertFalse(logs.isEmpty());
            logs.assertNeverLogged("john@example.com", "John Doe");
        }

        verify(emailNotificationService).sendEmailWithAttachments(
                eq("john@example.com"), anyString(), anyString(), eq(List.of(attachment)), any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void sendCateringEmail_shouldUseCustomSubjectAndBody() throws Exception {
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(emailAttachmentRepository.findAllById(any())).thenReturn(List.of());

        CateringEmailRequest request = new CateringEmailRequest();
        request.setAttachmentIds(List.of());
        request.setSubject("Custom Subject");
        request.setBody("<p>Custom body</p>");
        request.setReplyTo("custom@example.com");

        mockMvc.perform(post("/api/admin/reservations/1/catering-email")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("sent"));

        verify(emailNotificationService).sendEmailWithAttachments(
                eq("john@example.com"), eq("Custom Subject"), eq("<p>Custom body</p>"),
                eq(List.of()), eq("custom@example.com"));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void sendCateringEmail_shouldReturn404WhenNotFound() throws Exception {
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        CateringEmailRequest request = new CateringEmailRequest();
        request.setAttachmentIds(List.of());

        mockMvc.perform(post("/api/admin/reservations/999/catering-email")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isNotFound());
    }

    private Reservation createSampleReservation() {
        Reservation reservation = new Reservation();
        reservation.setId(1L);
        reservation.setEventTitle("Test Event");
        reservation.setContactName("John Doe");
        reservation.setEmail("john@example.com");
        reservation.setPhoneNumber("+31612345678");
        reservation.setEventDate(LocalDate.now().plusDays(7));
        reservation.setStartTime(LocalTime.of(14, 0));
        reservation.setEndTime(LocalTime.of(17, 0));
        reservation.setLocation(BarLocation.HUBBLE);
        reservation.setExpectedGuests(20);
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setConfirmationNumber("ABC123");
        return reservation;
    }

    private com.pimvanleeuwen.the_harry_list_backend.dto.Reservation createSampleDto() {
        com.pimvanleeuwen.the_harry_list_backend.dto.Reservation dto =
            new com.pimvanleeuwen.the_harry_list_backend.dto.Reservation();
        dto.setId(1L);
        dto.setEventTitle("Test Event");
        dto.setContactName("John Doe");
        dto.setEmail("john@example.com");
        dto.setStatus(ReservationStatus.PENDING);
        return dto;
    }
}

