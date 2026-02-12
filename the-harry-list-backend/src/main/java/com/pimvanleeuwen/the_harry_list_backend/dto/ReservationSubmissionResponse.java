package com.pimvanleeuwen.the_harry_list_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for public reservation submissions.
 * Contains only the information the user needs to know,
 * without exposing internal details.
 */
@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReservationSubmissionResponse {

    /** Confirmation number (e.g., "A3X7K9") */
    private String confirmationNumber;

    /** Event title for reference */
    private String eventTitle;

    /** Contact name for confirmation */
    private String contactName;

    /** Email where confirmation will be sent */
    private String email;

    /** Confirmation message */
    private String message;
}

