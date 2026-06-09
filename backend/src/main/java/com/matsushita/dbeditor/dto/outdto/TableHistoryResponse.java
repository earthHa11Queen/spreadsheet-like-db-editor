package com.matsushita.dbeditor.dto.outdto;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TableHistoryResponse {
    private int seq;
    private String savedAt;
    private List<Map<String, Object>> records;
}
