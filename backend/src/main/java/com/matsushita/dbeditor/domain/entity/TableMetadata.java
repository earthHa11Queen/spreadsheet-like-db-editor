package com.matsushita.dbeditor.domain.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TableMetadata {
    private String schemaName;
    private String tableName;
    private String tableType;
}
