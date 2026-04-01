package com.pimvanleeuwen.the_harry_list_backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class CateringEmailRequest {
    private List<Long> attachmentIds;
    private String subject;
    private String body;
    private String replyTo;
}
