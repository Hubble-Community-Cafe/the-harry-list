package com.pimvanleeuwen.the_harry_list_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TestEmailRequest {

    @NotBlank
    @Email
    private String toEmail;

    /** Optional: if provided, renders this subject instead of the saved/default one. */
    private String subject;

    /** Optional: if provided, renders this body instead of the saved/default one. */
    private String bodyTemplate;
}
