package com.matsushita.dbeditor.dto.indto;

import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MappingApplyRequest {
    @NotNull
    private Integer connectionId;
    @NotNull
    private String tableName;
    private String schemaName = "public";
    /** 確定マッピング: csvHeader -> tableColumn */
    @NotNull
    private Map<String, String> mapping;
    /** CSVの全データ行（ヘッダー除く） */
    @NotNull
    private List<Map<String, String>> rows;
}
