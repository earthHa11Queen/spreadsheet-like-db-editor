package com.matsushita.dbeditor.domain.entity;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavedSql {
    private Integer n;
    private Integer dbConnectionId;
    private String titleSql;
    private String contentSql;
    private LocalDateTime createdTimestamp;
    private LocalDateTime updatedTimestamp;
}
