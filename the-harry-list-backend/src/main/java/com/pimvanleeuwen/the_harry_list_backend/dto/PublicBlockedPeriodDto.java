package com.pimvanleeuwen.the_harry_list_backend.dto;

import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.BlockedPeriod;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Blocked period as shown to the anonymous public form. Deliberately leaves out the
 * staff-only {@code reason} (and bookkeeping such as {@code updatedAt}), so internal notes
 * like "private party for ..." never reach the internet.
 */
@Data
@Builder
public class PublicBlockedPeriodDto {
    private Long id;
    private BarLocation location;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String publicMessage;
    private Boolean softBlock;
    private String acknowledgementText;
    private Boolean enabled;

    public static PublicBlockedPeriodDto fromEntity(BlockedPeriod entity) {
        return PublicBlockedPeriodDto.builder()
                .id(entity.getId())
                .location(entity.getLocation())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .publicMessage(entity.getPublicMessage())
                .softBlock(entity.getSoftBlock())
                .acknowledgementText(entity.getAcknowledgementText())
                .enabled(entity.getEnabled())
                .build();
    }
}
