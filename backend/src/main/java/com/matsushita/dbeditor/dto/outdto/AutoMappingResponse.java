package com.matsushita.dbeditor.dto.outdto;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AutoMappingResponse {
    /** CSVのヘッダー行 */
    private List<String> csvHeaders;
    /** テーブルのカラム名一覧 */
    private List<String> tableColumns;
    /** 自動マッピング結果: csvHeader -> tableColumn (null=マッピング不可) */
    private Map<String, String> mapping;
    /** CSVの全データ行（ヘッダー除く） */
    private List<Map<String, String>> rows;
}
