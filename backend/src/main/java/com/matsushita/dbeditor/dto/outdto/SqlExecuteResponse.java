package com.matsushita.dbeditor.dto.outdto;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SqlExecuteResponse {
    /** SELECT結果行（SELECT以外はnull） */
    private List<Map<String, Object>> rows;
    /** DML影響行数（SELECT時はnull） */
    private Integer affectedRows;
    /** エラーメッセージ（正常時はnull） */
    private String errorMessage;

    public static SqlExecuteResponse ofSelect(List<Map<String, Object>> rows) {
        return new SqlExecuteResponse(rows, null, null);
    }

    public static SqlExecuteResponse ofDml(int affectedRows) {
        return new SqlExecuteResponse(null, affectedRows, null);
    }

    public static SqlExecuteResponse ofError(String message) {
        return new SqlExecuteResponse(null, null, message);
    }
}
