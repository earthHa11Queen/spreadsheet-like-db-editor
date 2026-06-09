package com.matsushita.dbeditor.usecase.file;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.write.metadata.WriteSheet;
import com.matsushita.dbeditor.usecase.table.TableRecordUseCase;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExportUseCase {

    private final TableRecordUseCase tableRecordUseCase;

    /** A12: CSV形式エクスポート（BOM付きUTF-8） */
    public byte[] exportCsv(Integer connectionId, String schemaName, String tableName) throws IOException {
        List<Map<String, Object>> records = tableRecordUseCase.getAllRecords(connectionId, schemaName, tableName);
        if (records.isEmpty()) {
            return "\uFEFF".getBytes(StandardCharsets.UTF_8);
        }

        List<String> columns = new ArrayList<>(records.get(0).keySet());
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        // BOM
        baos.write(0xEF);
        baos.write(0xBB);
        baos.write(0xBF);

        try (OutputStreamWriter writer = new OutputStreamWriter(baos, StandardCharsets.UTF_8)) {
            writer.write(toCsvLine(columns));
            writer.write("\r\n");
            for (Map<String, Object> row : records) {
                List<String> values = new ArrayList<>();
                for (String col : columns) {
                    Object v = row.get(col);
                    values.add(v == null ? "" : String.valueOf(v));
                }
                writer.write(toCsvLine(values));
                writer.write("\r\n");
            }
        }
        return baos.toByteArray();
    }

    /** A12: Excel形式エクスポート（EasyExcel） */
    public byte[] exportExcel(Integer connectionId, String schemaName, String tableName) throws IOException {
        List<Map<String, Object>> records = tableRecordUseCase.getAllRecords(connectionId, schemaName, tableName);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (var excelWriter = EasyExcel.write(baos).build()) {
            WriteSheet sheet = EasyExcel.writerSheet(tableName).build();

            List<List<String>> data = new ArrayList<>();
            if (!records.isEmpty()) {
                List<String> columns = new ArrayList<>(records.get(0).keySet());
                // ヘッダー行
                data.add(columns);
                // データ行
                for (Map<String, Object> row : records) {
                    List<String> rowData = new ArrayList<>();
                    for (String col : columns) {
                        Object v = row.get(col);
                        rowData.add(v == null ? "" : String.valueOf(v));
                    }
                    data.add(rowData);
                }
            }
            excelWriter.write(data, sheet);
        }
        return baos.toByteArray();
    }

    /** A12/A13: Markdown形式エクスポート */
    public byte[] exportMarkdown(Integer connectionId, String schemaName, String tableName) {
        List<Map<String, Object>> records = tableRecordUseCase.getAllRecords(connectionId, schemaName, tableName);

        StringBuilder sb = new StringBuilder();
        sb.append("# ").append(tableName).append("\n\n");

        if (records.isEmpty()) {
            sb.append("*データなし*\n");
            return sb.toString().getBytes(StandardCharsets.UTF_8);
        }

        List<String> columns = new ArrayList<>(records.get(0).keySet());

        // ヘッダー行
        sb.append("| ").append(String.join(" | ", columns)).append(" |\n");
        // 区切り行
        sb.append("| ").append("--- | ".repeat(columns.size()).stripTrailing()).append("\n");
        // データ行
        for (Map<String, Object> row : records) {
            sb.append("| ");
            for (String col : columns) {
                Object v = row.get(col);
                String cell = v == null ? "" : String.valueOf(v).replace("|", "\\|");
                sb.append(cell).append(" | ");
            }
            sb.append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    // --- private helpers ---

    private String toCsvLine(List<String> fields) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < fields.size(); i++) {
            if (i > 0) sb.append(',');
            String v = fields.get(i) == null ? "" : fields.get(i);
            if (v.contains(",") || v.contains("\"") || v.contains("\n") || v.contains("\r")) {
                sb.append('"').append(v.replace("\"", "\"\"")).append('"');
            } else {
                sb.append(v);
            }
        }
        return sb.toString();
    }
}
