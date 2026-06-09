package com.matsushita.dbeditor.dto.indto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SqlSaveRequest {
    @NotNull
    private Integer connectionId;
    @NotBlank
    private String title;
    @NotBlank
    private String content;
}
