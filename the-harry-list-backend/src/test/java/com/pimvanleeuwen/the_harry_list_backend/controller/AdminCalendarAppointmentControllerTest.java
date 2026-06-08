package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.service.AdminUserService;
import com.pimvanleeuwen.the_harry_list_backend.model.CalendarAppointment;
import com.pimvanleeuwen.the_harry_list_backend.model.RecurrenceType;
import com.pimvanleeuwen.the_harry_list_backend.repository.CalendarAppointmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminCalendarAppointmentController.class)
@Import(SecurityConfig.class)
class AdminCalendarAppointmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminUserService adminUserService;

    @MockitoBean
    private CalendarAppointmentRepository repository;

    @MockitoBean
    private com.pimvanleeuwen.the_harry_list_backend.service.AuditService auditService;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    private CalendarAppointment sampleAppointment() {
        return CalendarAppointment.builder()
                .id(1L)
                .title("Staff Meeting")
                .description("Weekly team sync")
                .date(LocalDate.of(2026, 6, 1))
                .allDay(false)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.WEEKLY)
                .recurrenceEndDate(LocalDate.of(2026, 12, 31))
                .enabled(true)
                .build();
    }

    private CalendarAppointment sampleAllDayAppointment() {
        return CalendarAppointment.builder()
                .id(2L)
                .title("Holiday Closure")
                .date(LocalDate.of(2026, 12, 25))
                .allDay(true)
                .location(BarLocation.METEOR)
                .recurrenceType(RecurrenceType.NONE)
                .enabled(true)
                .build();
    }

    @Test
    @WithMockUser
    void listAll_shouldReturnAllAppointments() throws Exception {
        when(repository.findAll()).thenReturn(List.of(sampleAppointment(), sampleAllDayAppointment()));

        mockMvc.perform(get("/api/admin/calendar-appointments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Staff Meeting"))
                .andExpect(jsonPath("$[1].title").value("Holiday Closure"));
    }

    @Test
    void listAll_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/calendar-appointments"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void getById_shouldReturnAppointment() throws Exception {
        when(repository.findById(1L)).thenReturn(Optional.of(sampleAppointment()));

        mockMvc.perform(get("/api/admin/calendar-appointments/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Staff Meeting"))
                .andExpect(jsonPath("$.location").value("HUBBLE"))
                .andExpect(jsonPath("$.recurrenceType").value("WEEKLY"));
    }

    @Test
    @WithMockUser
    void getById_shouldReturn404ForMissing() throws Exception {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/admin/calendar-appointments/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void create_shouldReturn201() throws Exception {
        CalendarAppointment appointment = sampleAppointment();
        when(repository.save(any())).thenReturn(appointment);

        mockMvc.perform(post("/api/admin/calendar-appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(appointment)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Staff Meeting"));

        verify(auditService).recordCreate(
                eq(com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType.CALENDAR_APPOINTMENT),
                any(), any(), any(), any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void create_allDay_shouldReturn201() throws Exception {
        CalendarAppointment appointment = sampleAllDayAppointment();
        when(repository.save(any())).thenReturn(appointment);

        mockMvc.perform(post("/api/admin/calendar-appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(appointment)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.allDay").value(true))
                .andExpect(jsonPath("$.startTime").isEmpty());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void create_nthWeekday_shouldPersistStructuredFields() throws Exception {
        CalendarAppointment appointment = CalendarAppointment.builder()
                .id(3L)
                .title("Second Friday Meetup")
                .date(LocalDate.of(2026, 6, 12))
                .allDay(true)
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.MONTHLY_NTH_WEEKDAY)
                .recurrenceInterval(1)
                .recurrenceWeekOfMonth(2)
                .recurrenceDayOfWeek(java.time.DayOfWeek.FRIDAY)
                .enabled(true)
                .build();
        when(repository.save(any())).thenReturn(appointment);

        mockMvc.perform(post("/api/admin/calendar-appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(appointment)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recurrenceType").value("MONTHLY_NTH_WEEKDAY"))
                .andExpect(jsonPath("$.recurrenceWeekOfMonth").value(2))
                .andExpect(jsonPath("$.recurrenceDayOfWeek").value("FRIDAY"));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void update_shouldCopyStructuredRecurrenceFields() throws Exception {
        CalendarAppointment existing = sampleAppointment();
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CalendarAppointment payload = CalendarAppointment.builder()
                .id(1L)
                .title("Updated Meetup")
                .date(LocalDate.of(2026, 6, 12))
                .allDay(true)
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.MONTHLY_NTH_WEEKDAY)
                .recurrenceInterval(2)
                .recurrenceWeekOfMonth(-1)
                .recurrenceDayOfWeek(java.time.DayOfWeek.MONDAY)
                .enabled(true)
                .build();

        mockMvc.perform(put("/api/admin/calendar-appointments/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recurrenceType").value("MONTHLY_NTH_WEEKDAY"))
                .andExpect(jsonPath("$.recurrenceInterval").value(2))
                .andExpect(jsonPath("$.recurrenceWeekOfMonth").value(-1))
                .andExpect(jsonPath("$.recurrenceDayOfWeek").value("MONDAY"));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void toggle_shouldFlipEnabledState() throws Exception {
        CalendarAppointment appointment = sampleAppointment();
        appointment.setEnabled(true);

        CalendarAppointment toggled = sampleAppointment();
        toggled.setEnabled(false);

        when(repository.findById(1L)).thenReturn(Optional.of(appointment));
        when(repository.save(any())).thenReturn(toggled);

        mockMvc.perform(patch("/api/admin/calendar-appointments/1/toggle").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void delete_shouldReturn200() throws Exception {
        when(repository.findById(1L)).thenReturn(Optional.of(sampleAppointment()));

        mockMvc.perform(delete("/api/admin/calendar-appointments/1").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("deleted"));

        verify(repository).delete(any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void delete_shouldReturn404ForMissing() throws Exception {
        when(repository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/api/admin/calendar-appointments/99").with(csrf()))
                .andExpect(status().isNotFound());
    }
}
