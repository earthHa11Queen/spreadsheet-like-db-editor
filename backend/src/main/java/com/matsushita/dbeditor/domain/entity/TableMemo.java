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
public class TableMemo {
    private Integer n;
    private Integer dbConnectionId;
    private String dbTableName;
    private String contentMemo;
    private LocalDateTime createdTimestamp;
    private LocalDateTime updatedTimestamp;
}
