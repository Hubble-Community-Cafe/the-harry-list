package com.pimvanleeuwen.the_harry_list_backend.controller.open;

import com.pimvanleeuwen.the_harry_list_backend.model.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller for providing enum values to the frontend.
 * This helps populate dropdown menus in the reservation form.
 */
@RestController
@RequestMapping("/api/options")
@Tag(name = "Form Options", description = "Get available options for reservation forms")
public class FormOptionsController {

    @GetMapping("/event-types")
    @Operation(summary = "Get event types", description = "Get all available event types for the reservation form")
    public ResponseEntity<List<Map<String, String>>> getEventTypes() {
        List<Map<String, String>> options = Arrays.stream(EventType.values())
                .map(e -> Map.of("value", e.name(), "label", e.getDisplayName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(options);
    }

    @GetMapping("/organizer-types")
    @Operation(summary = "Get organizer types", description = "Get all available organizer types")
    public ResponseEntity<List<Map<String, String>>> getOrganizerTypes() {
        List<Map<String, String>> options = Arrays.stream(OrganizerType.values())
                .map(e -> Map.of("value", e.name(), "label", e.getDisplayName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(options);
    }

    @GetMapping("/payment-options")
    @Operation(summary = "Get payment options", description = "Get all available payment options")
    public ResponseEntity<List<Map<String, String>>> getPaymentOptions() {
        List<Map<String, String>> options = Arrays.stream(PaymentOption.values())
                .map(e -> Map.of("value", e.name(), "label", e.getDisplayName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(options);
    }

    @GetMapping("/locations")
    @Operation(summary = "Get bar locations", description = "Get all available bar locations")
    public ResponseEntity<List<Map<String, String>>> getLocations() {
        List<Map<String, String>> options = Arrays.stream(BarLocation.values())
                .map(e -> Map.of("value", e.name(), "label", e.getDisplayName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(options);
    }

    @GetMapping("/dietary-preferences")
    @Operation(summary = "Get dietary preferences", description = "Get all available dietary preference options")
    public ResponseEntity<List<Map<String, String>>> getDietaryPreferences() {
        List<Map<String, String>> options = Arrays.stream(DietaryPreference.values())
                .map(e -> Map.of("value", e.name(), "label", e.getDisplayName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(options);
    }

    @GetMapping("/all")
    @Operation(summary = "Get all form options", description = "Get all form options in a single request")
    public ResponseEntity<Map<String, List<Map<String, String>>>> getAllOptions() {
        Map<String, List<Map<String, String>>> allOptions = Map.of(
                "eventTypes", Arrays.stream(EventType.values())
                        .map(e -> Map.of("value", e.name(), "label", e.getDisplayName()))
                        .collect(Collectors.toList()),
                "organizerTypes", Arrays.stream(OrganizerType.values())
                        .map(e -> Map.of("value", e.name(), "label", e.getDisplayName()))
                        .collect(Collectors.toList()),
                "paymentOptions", Arrays.stream(PaymentOption.values())
                        .map(e -> Map.of("value", e.name(), "label", e.getDisplayName()))
                        .collect(Collectors.toList()),
                "locations", Arrays.stream(BarLocation.values())
                        .map(e -> Map.of("value", e.name(), "label", e.getDisplayName()))
                        .collect(Collectors.toList()),
                "dietaryPreferences", Arrays.stream(DietaryPreference.values())
                        .map(e -> Map.of("value", e.name(), "label", e.getDisplayName()))
                        .collect(Collectors.toList())
        );
        return ResponseEntity.ok(allOptions);
    }
}

