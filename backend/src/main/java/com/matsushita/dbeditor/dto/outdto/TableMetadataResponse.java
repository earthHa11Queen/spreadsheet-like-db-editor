package com.matsushita.dbeditor.dto.outdto;

import com.matsushita.dbeditor.domain.entity.TableMetadata;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TableMetadataResponse {
    private String schemaName;
    private String tableName;
    private String tableType;

    public static TableMetadataResponse fromEntity(TableMetadata entity) {
        return TableMetadataResponse.builder()
                .schemaName(entity.getSchemaName())
                .tableName(entity.getTableName())
                .tableType(entity.getTableType())
                .build();
    }
}
