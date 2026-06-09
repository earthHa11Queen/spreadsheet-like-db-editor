package com.matsushita.dbeditor.dto.indto;

import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TableHistorySaveRequest {
    @NotNull
    private Integer connectionId;

    private String schemaName = "public";

    @NotNull
    private List<Map<String, Object>> records;
}
