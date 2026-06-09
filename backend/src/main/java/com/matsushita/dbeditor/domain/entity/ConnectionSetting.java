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
public class ConnectionSetting {
    private Integer n;
    private String dbName;
    private String dbHost;
    private Integer dbPort;
    private String databaseName;
    private String dbUsername;
    private String dbPassword;
    private LocalDateTime createdTimestamp;
    private LocalDateTime updatedTimestamp;
}
