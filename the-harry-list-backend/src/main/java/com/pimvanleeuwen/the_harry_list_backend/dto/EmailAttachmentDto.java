package com.pimvanleeuwen.the_harry_list_backend.dto;

import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class EmailAttachmentDto {
    private Long id;
    private String name;
    private String filename;
    private String contentType;
    private boolean active;
    private LocalDateTime createdAt;

    public static EmailAttachmentDto fromEntity(EmailAttachment entity) {
        return EmailAttachmentDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .filename(entity.getFilename())
                .contentType(entity.getContentType())
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
