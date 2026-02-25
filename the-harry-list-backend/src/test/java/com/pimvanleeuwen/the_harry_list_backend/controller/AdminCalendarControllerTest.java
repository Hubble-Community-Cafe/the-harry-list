package com.pimvanleeuwen.the_harry_list_backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for AdminCalendarController.
 */
@WebMvcTest(AdminCalendarController.class)
@TestPropertySource(properties = {
    "calendar.feed.token=test-public-token",
    "calendar.feed.staff-token=test-staff-token"
})
class AdminCalendarControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser
    void getCalendarFeeds_shouldReturnFourFeeds() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/admin/calendar/feeds"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.feeds", hasSize(4)))
            .andExpect(jsonPath("$.feeds[0].id", is("staff-hubble")))
            .andExpect(jsonPath("$.feeds[1].id", is("staff-meteor")))
            .andExpect(jsonPath("$.feeds[2].id", is("public-hubble")))
            .andExpect(jsonPath("$.feeds[3].id", is("public-meteor")));
    }

    @Test
    @WithMockUser
    void getCalendarFeeds_shouldIncludeTokensInUrls() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/admin/calendar/feeds"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.feeds[0].url", containsString("token=test-staff-token")))
            .andExpect(jsonPath("$.feeds[1].url", containsString("token=test-staff-token")))
            .andExpect(jsonPath("$.feeds[2].url", containsString("token=test-public-token")))
            .andExpect(jsonPath("$.feeds[3].url", containsString("token=test-public-token")));
    }

    @Test
    @WithMockUser
    void getCalendarFeeds_shouldIncludeLocationFilters() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/admin/calendar/feeds"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.feeds[0].url", containsString("location=HUBBLE")))
            .andExpect(jsonPath("$.feeds[1].url", containsString("location=METEOR")))
            .andExpect(jsonPath("$.feeds[2].url", containsString("location=HUBBLE")))
            .andExpect(jsonPath("$.feeds[3].url", containsString("location=METEOR")));
    }

    @Test
    @WithMockUser
    void getCalendarFeeds_shouldMarkFeedsAsHavingToken() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/admin/calendar/feeds"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.feeds[0].hasToken", is(true)))
            .andExpect(jsonPath("$.feeds[1].hasToken", is(true)))
            .andExpect(jsonPath("$.feeds[2].hasToken", is(true)))
            .andExpect(jsonPath("$.feeds[3].hasToken", is(true)));
    }

    @Test
    @WithMockUser
    void getCalendarFeeds_shouldIncludeParameters() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/admin/calendar/feeds"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.parameters", hasSize(greaterThan(0))))
            .andExpect(jsonPath("$.parameters[?(@.name=='status')]").exists())
            .andExpect(jsonPath("$.parameters[?(@.name=='upcomingOnly')]").exists());
    }

    @Test
    @WithMockUser
    void getCalendarFeeds_shouldIncludeCorrectLocationField() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/admin/calendar/feeds"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.feeds[0].location", is("HUBBLE")))
            .andExpect(jsonPath("$.feeds[1].location", is("METEOR")))
            .andExpect(jsonPath("$.feeds[2].location", is("HUBBLE")))
            .andExpect(jsonPath("$.feeds[3].location", is("METEOR")));
    }

    @Test
    @WithMockUser
    void getCalendarFeeds_shouldIncludeIsStaffField() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/admin/calendar/feeds"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.feeds[0].isStaff", is(true)))
            .andExpect(jsonPath("$.feeds[1].isStaff", is(true)))
            .andExpect(jsonPath("$.feeds[2].isStaff", is(false)))
            .andExpect(jsonPath("$.feeds[3].isStaff", is(false)));
    }

    @Test
    void getCalendarFeeds_shouldRequireAuthentication() throws Exception {
        // When/Then - no @WithMockUser, so should be unauthorized
        mockMvc.perform(get("/api/admin/calendar/feeds"))
            .andExpect(status().isUnauthorized());
    }
}

