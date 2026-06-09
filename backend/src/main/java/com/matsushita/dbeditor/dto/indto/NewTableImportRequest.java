package com.matsushita.dbeditor.dto.indto;

import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class NewTableImportRequest {

    @NotNull
    private Integer connectionId;

    @NotBlank
    private String tableName;

    private String schemaName = "public";

    @NotNull
    private List<String> columns;

    @NotNull
    private List<String> columnTypes;

    @NotNull
    private List<Map<String, String>> rows;
}
