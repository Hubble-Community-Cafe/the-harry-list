package com.pimvanleeuwen.the_harry_list_backend.dto;

import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class EmailTemplateDto {
    private EmailTemplateType templateType;
    private String displayName;
    private String description;
    private String subject;
    private String bodyTemplate;
    private boolean customized;
    private LocalDateTime updatedAt;
    private List<String> availableVariables;
}
