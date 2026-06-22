package com.pimvanleeuwen.the_harry_list_backend.controller.open;

import com.pimvanleeuwen.the_harry_list_backend.altcha.AltchaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/altcha")
@Tag(name = "Public - ALTCHA", description = "Self-hosted proof-of-work challenge (no cookies, no third party)")
public class AltchaController {

    private final AltchaService altchaService;

    public AltchaController(AltchaService altchaService) {
        this.altchaService = altchaService;
    }

    @GetMapping("/challenge")
    @Operation(summary = "Get ALTCHA challenge", description = "Returns a fresh, HMAC-signed proof-of-work challenge for the ALTCHA widget to solve.")
    public AltchaService.Challenge challenge() {
        return altchaService.createChallenge();
    }
}
