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

            ### Public endpoints (no login)
            - `POST /api/public/reservations`: submit a reservation request
            - `GET /api/public/altcha/challenge`: proof-of-work challenge for the form
            - `GET /api/options/*`: form options (activities, locations and so on)
            - `GET /api/calendar/*.ics`: calendar feeds, protected by their own `token` parameter
            - `GET /actuator/health`: health check

            ### Staff endpoints (Microsoft Entra ID login)
            Everything under `/api/admin/*` and `/api/reservations/*` needs an Entra ID access token
            for this app, sent as `Authorization: Bearer <token>`. Each operation states its required
            role: VIEWER, EDITOR or ADMIN, where a higher role includes the lower ones.

            To try staff endpoints here, sign in to the admin portal, copy the bearer token from any
            request to this API in the browser's developer tools (Network tab, `Authorization`
            header), and paste it via **Authorize** (without the word "Bearer").
            """,
        contact = @Contact(
            name = "Stichting Bar Potential",
            url = "https://hubble.cafe"
        )
    ),
    servers = {
        @Server(url = "http://localhost:8080", description = "Local Development")
    }
)
@SecurityScheme(
    name = StaffEndpointDocumentation.SECURITY_SCHEME,
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT",
    description = "Microsoft Entra ID access token of a staff member (paste the token without \"Bearer\")"
)
public class OpenApiConfig {
}

