package com.matsushita.dbeditor.dto.indto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MemoSaveRequest {
    @NotNull
    private Integer connectionId;
    @NotNull
    private String tableName;
    private String content;
}
