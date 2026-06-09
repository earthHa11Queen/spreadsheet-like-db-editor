package com.matsushita.dbeditor.dto.indto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConflictCheckRequest {
    @NotNull
    private Integer connectionId;

    private String schemaName = "public";
}
