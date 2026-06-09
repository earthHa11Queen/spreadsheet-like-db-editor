package com.matsushita.dbeditor.dto.outdto;

import java.time.LocalDateTime;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConnectionSettingResponse {
    private Integer n;
    private String dbName;
    private String dbHost;
    private Integer dbPort;
    private String databaseName;
    private String dbUsername;
    private LocalDateTime createdTimestamp;
    private LocalDateTime updatedTimestamp;

    public static ConnectionSettingResponse fromEntity(ConnectionSetting entity) {
        return ConnectionSettingResponse.builder()
                .n(entity.getN())
                .dbName(entity.getDbName())
                .dbHost(entity.getDbHost())
                .dbPort(entity.getDbPort())
                .databaseName(entity.getDatabaseName())
                .dbUsername(entity.getDbUsername())
                .createdTimestamp(entity.getCreatedTimestamp())
                .updatedTimestamp(entity.getUpdatedTimestamp())
                .build();
    }
}
