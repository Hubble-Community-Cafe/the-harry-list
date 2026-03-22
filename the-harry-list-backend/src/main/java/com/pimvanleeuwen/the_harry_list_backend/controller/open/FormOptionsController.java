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

    @GetMapping("/special-activities")
    @Operation(summary = "Get special activities", description = "Get all available special activities for the reservation form")
    public ResponseEntity<List<Map<String, String>>> getSpecialActivities() {
        List<Map<String, String>> options = Arrays.stream(SpecialActivity.values())
                .map(e -> Map.of("value", e.name(), "displayName", e.getDisplayName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(options);
    }

    @GetMapping("/payment-options")
    @Operation(summary = "Get payment options", description = "Get all available payment options")
    public ResponseEntity<List<Map<String, String>>> getPaymentOptions() {
        List<Map<String, String>> options = Arrays.stream(PaymentOption.values())
                .map(e -> Map.of("value", e.name(), "displayName", e.getDisplayName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(options);
    }

    @GetMapping("/invoice-types")
    @Operation(summary = "Get invoice types", description = "Get all available invoice types")
    public ResponseEntity<List<Map<String, String>>> getInvoiceTypes() {
        List<Map<String, String>> options = Arrays.stream(InvoiceType.values())
                .map(e -> Map.of("value", e.name(), "displayName", e.getDisplayName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(options);
    }

    @GetMapping("/locations")
    @Operation(summary = "Get bar locations", description = "Get all available bar locations")
    public ResponseEntity<List<Map<String, String>>> getLocations() {
        List<Map<String, String>> options = Arrays.stream(BarLocation.values())
                .map(e -> Map.of("value", e.name(), "displayName", e.getDisplayName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(options);
    }

    @GetMapping("/seating-areas")
    @Operation(summary = "Get seating areas", description = "Get all available seating area options (inside/outside)")
    public ResponseEntity<List<Map<String, String>>> getSeatingAreas() {
        List<Map<String, String>> options = Arrays.stream(SeatingArea.values())
                .map(e -> Map.of("value", e.name(), "displayName", e.getDisplayName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(options);
    }

    @GetMapping("/all")
    @Operation(summary = "Get all form options", description = "Get all form options in a single request")
    public ResponseEntity<Map<String, List<Map<String, String>>>> getAllOptions() {
        Map<String, List<Map<String, String>>> allOptions = Map.of(
                "specialActivities", Arrays.stream(SpecialActivity.values())
                        .map(e -> Map.of("value", e.name(), "displayName", e.getDisplayName()))
                        .collect(Collectors.toList()),
                "paymentOptions", Arrays.stream(PaymentOption.values())
                        .map(e -> Map.of("value", e.name(), "displayName", e.getDisplayName()))
                        .collect(Collectors.toList()),
                "invoiceTypes", Arrays.stream(InvoiceType.values())
                        .map(e -> Map.of("value", e.name(), "displayName", e.getDisplayName()))
                        .collect(Collectors.toList()),
                "locations", Arrays.stream(BarLocation.values())
                        .map(e -> Map.of("value", e.name(), "displayName", e.getDisplayName()))
                        .collect(Collectors.toList()),
                "seatingAreas", Arrays.stream(SeatingArea.values())
                        .map(e -> Map.of("value", e.name(), "displayName", e.getDisplayName()))
                        .collect(Collectors.toList())
        );
        return ResponseEntity.ok(allOptions);
    }
}
