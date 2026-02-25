package com.pimvanleeuwen.the_harry_list_backend.controller;

import org.openpdf.text.DocumentException;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.service.PdfExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/admin/export")
@Tag(name = "Admin Export", description = "Admin endpoints for exporting reservation data")
public class AdminExportController {

    private final PdfExportService pdfExportService;

    public AdminExportController(PdfExportService pdfExportService) {
        this.pdfExportService = pdfExportService;
    }

    @GetMapping(value = "/daily-report", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(
            summary = "Generate daily reservation report PDF",
            description = "Generates a PDF report of all reservations for a specific date and location"
    )
    public ResponseEntity<byte[]> generateDailyReport(
            @RequestParam String date,
            @RequestParam String location,
            @RequestParam(required = false, defaultValue = "true") boolean confirmedOnly) {

        // Parse date
        LocalDate reportDate;
        try {
            reportDate = LocalDate.parse(date);
        } catch (DateTimeParseException e) {
            return ResponseEntity.badRequest().build();
        }

        // Parse location
        BarLocation reportLocation;
        try {
            reportLocation = BarLocation.valueOf(location.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }

        try {
            byte[] pdfBytes = pdfExportService.generateDailyReport(reportDate, reportLocation, confirmedOnly);

            String filename = String.format("reservations-%s-%s.pdf",
                    reportLocation.name().toLowerCase(),
                    reportDate.format(DateTimeFormatter.ISO_LOCAL_DATE));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", filename);
            headers.setCacheControl("no-cache, no-store, must-revalidate");

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (DocumentException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

