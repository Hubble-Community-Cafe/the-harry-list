package com.pimvanleeuwen.the_harry_list_backend.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "The Harry List API",
        version = "1.0",
        description = """
            Bar Reservation System for Stichting Bar Potential (Hubble & Meteor Community Cafés)
            
            ## Authentication
            
            This API has two types of endpoints:
            
            ### Public Endpoints (No Login Required)
            - `POST /api/public/reservations` - Submit a reservation request
            - `GET /api/options/*` - Get form options (event types, locations, etc.)
            - `GET /actuator/health` - Health check
            
            ### Staff Endpoints (Login Required)
            - `GET/PUT/DELETE /api/reservations/*` - Manage reservations
            - `PATCH /api/admin/reservations/*` - Admin actions (status updates, notes)
            
            Use the **Authorize** button to login with your staff credentials.
            """,
        contact = @Contact(
            name = "Stichting Bar Potential",
            url = "https://hubble.cafe"
        )
    ),
    servers = {
        @Server(url = "http://localhost:8080", description = "Local Development"),
        @Server(url = "http://localhost:9802", description = "Portainer/Production")
    }
)
@SecurityScheme(
    name = "basicAuth",
    type = SecuritySchemeType.HTTP,
    scheme = "basic",
    description = "Staff login credentials"
)
public class OpenApiConfig {
}

