package com.matsushita.dbeditor.dto.outdto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ConnectionTestResponse {
    private boolean success;
    private String message;
}
