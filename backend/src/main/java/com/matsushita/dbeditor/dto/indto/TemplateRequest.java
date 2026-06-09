package com.matsushita.dbeditor.dto.indto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TemplateRequest {
    @NotBlank
    private String title;
    @NotBlank
    private String content;
}
