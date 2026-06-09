package com.matsushita.dbeditor.dto.indto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConnectionSettingRequest {
    @NotBlank
    private String dbName;

    @NotBlank
    private String dbHost;

    @NotNull
    @Min(1)
    @Max(65535)
    private Integer dbPort = 5432;

    @NotBlank
    private String databaseName;

    @NotBlank
    private String dbUsername;

    @NotBlank
    private String dbPassword;
}
