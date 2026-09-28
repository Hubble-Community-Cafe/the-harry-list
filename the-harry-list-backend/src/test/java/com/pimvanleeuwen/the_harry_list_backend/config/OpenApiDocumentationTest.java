package com.pimvanleeuwen.the_harry_list_backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The generated OpenAPI document describes the real authentication: Entra bearer tokens and roles. */
@SpringBootTest
@AutoConfigureMockMvc
class OpenApiDocumentationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void documentsBearerTokensRolesAndPublicEndpoints() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                // The only scheme is the Entra bearer token; basic auth is gone.
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type").value("http"))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
                .andExpect(jsonPath("$.components.securitySchemes.basicAuth").doesNotExist())
                // Staff endpoints require the token and state their role, including the controllers
                // that never had a security annotation.
                .andExpect(jsonPath("$.paths['/api/reservations/{id}'].put.security[*].bearerAuth").exists())
                .andExpect(jsonPath("$.paths['/api/reservations/{id}'].put.description",
                        containsString("**Required role:** EDITOR or higher")))
                .andExpect(jsonPath("$.paths['/api/admin/blocked-periods'].get.security[*].bearerAuth").exists())
                .andExpect(jsonPath("$.paths['/api/admin/users'].get.description",
                        containsString("**Required role:** ADMIN")))
                // Public endpoints need no token.
                .andExpect(jsonPath("$.paths['/api/public/reservations'].post.security").doesNotExist())
                .andExpect(jsonPath("$.tags[*].name", hasItem("Staff - Reservations")));
    }
}
