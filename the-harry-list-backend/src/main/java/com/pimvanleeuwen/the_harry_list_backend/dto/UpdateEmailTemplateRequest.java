package com.pimvanleeuwen.the_harry_list_backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateEmailTemplateRequest {

    @NotBlank
    private String subject;

    @NotBlank
    private String bodyTemplate;
}
