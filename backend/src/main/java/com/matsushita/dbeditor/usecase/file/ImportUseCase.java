package com.matsushita.dbeditor.usecase.file;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.context.AnalysisContext;
import com.alibaba.excel.event.AnalysisEventListener;
import com.alibaba.excel.read.metadata.ReadSheet;
import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.repository.ConnectionSettingRepository;
import com.matsushita.dbeditor.domain.repository.ImportRepository;
import com.matsushita.dbeditor.dto.outdto.AutoMappingResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ImportUseCase {

    private final ConnectionSettingRepository connectionSettingRepository;
    private final ImportRepository importRepository;

    /**
     * A06: CSVファイルを解析し、テーブルカラムとの自動マッピング提案を返す。
     * BOM付きUTF-8・カンマ区切り・ダブルクォート囲みに対応。
     */
    public AutoMappingResponse csvAutoMapping(Integer connectionId, String tableName,
            String schemaName, MultipartFile file) throws IOException {
        ConnectionSetting setting = getConnection(connectionId);
        // '__new__' は新規テーブル作成モード: テーブルカラム取得をスキップ
        List<String> tableColumns = "__new__".equals(tableName)
                ? List.of()
                : importRepository.findColumnNames(setting, schemaName, tableName);

        List<String[]> parsed = parseCsv(file.getInputStream());
        if (parsed.isEmpty()) {
            return new AutoMappingResponse(List.of(), tableColumns, Map.of(), List.of());
        }

        List<String> csvHeaders = Arrays.asList(parsed.get(0));
        List<Map<String, String>> rows = new ArrayList<>();
        for (int i = 1; i < parsed.size(); i++) {
            String[] line = parsed.get(i);
            Map<String, String> row = new LinkedHashMap<>();
            for (int j = 0; j < csvHeaders.size(); j++) {
                row.put(csvHeaders.get(j), j < line.length ? line[j] : null);
            }
            rows.add(row);
        }

        // カラム名の正規化（小文字・アンダースコア統一）で一致判定
        Map<String, String> tableColNormalized = tableColumns.stream()
                .collect(Collectors.toMap(this::normalize, c -> c, (a, b) -> a));

        Map<String, String> mapping = new LinkedHashMap<>();
        for (String csvHeader : csvHeaders) {
            String matched = tableColNormalized.get(normalize(csvHeader));
            mapping.put(csvHeader, matched); // null = マッピング不可
        }

        return new AutoMappingResponse(csvHeaders, tableColumns, mapping, rows);
    }

    /**
     * Excelファイルのシート名一覧を返す。
     */
    public List<String> getExcelSheetNames(MultipartFile file) throws IOException {
        List<ReadSheet> sheets = EasyExcel.read(file.getInputStream()).build().excelExecutor().sheetList();
        return sheets.stream().map(ReadSheet::getSheetName).collect(Collectors.toList());
    }

    /**
     * Excelの指定シートをCSV相当に変換し、自動マッピング提案を返す。
     */
    public AutoMappingResponse excelSheetAutoMapping(Integer connectionId, String tableName,
            String schemaName, MultipartFile file, int sheetIndex) throws IOException {
        ConnectionSetting setting = getConnection(connectionId);
        // '__new__' は新規テーブル作成モード: テーブルカラム取得をスキップ
        List<String> tableColumns = "__new__".equals(tableName)
                ? List.of()
                : importRepository.findColumnNames(setting, schemaName, tableName);

        // EasyExcel でシートを Map<Integer, String> 形式で読み込む
        List<Map<Integer, String>> rawRows = new ArrayList<>();
        EasyExcel.read(file.getInputStream(), new AnalysisEventListener<Map<Integer, String>>() {
            @Override
            public void invoke(Map<Integer, String> rowData, AnalysisContext ctx) {
                rawRows.add(rowData);
            }
            @Override
            public void doAfterAllAnalysed(AnalysisContext ctx) {}
        }).sheet(sheetIndex).headRowNumber(0).doRead();

        if (rawRows.isEmpty()) {
            return new AutoMappingResponse(List.of(), tableColumns, Map.of(), List.of());
        }

        // 1行目をヘッダーとして扱う
        Map<Integer, String> headerRow = rawRows.get(0);
        int colCount = headerRow.size();
        List<String> csvHeaders = new ArrayList<>();
        for (int i = 0; i < colCount; i++) {
            String h = headerRow.getOrDefault(i, "");
            csvHeaders.add(h == null ? "" : h);
        }

        List<Map<String, String>> rows = new ArrayList<>();
        for (int r = 1; r < rawRows.size(); r++) {
            Map<Integer, String> raw = rawRows.get(r);
            Map<String, String> row = new LinkedHashMap<>();
            for (int i = 0; i < colCount; i++) {
                row.put(csvHeaders.get(i), raw.getOrDefault(i, null));
            }
            rows.add(row);
        }

        Map<String, String> tableColNormalized = tableColumns.stream()
                .collect(Collectors.toMap(this::normalize, c -> c, (a, b) -> a));
        Map<String, String> mapping = new LinkedHashMap<>();
        for (String h : csvHeaders) {
            mapping.put(h, tableColNormalized.get(normalize(h)));
        }

        return new AutoMappingResponse(csvHeaders, tableColumns, mapping, rows);
    }

    /**
     * A07: 確定マッピングに基づきコピーテーブルにデータを挿入する。
     */
    public void applyMapping(Integer connectionId, String tableName, String schemaName,
            Map<String, String> mapping, List<Map<String, String>> rows) {
        ConnectionSetting setting = getConnection(connectionId);

        // マッピング済みカラムのみ抽出（value が null のものは除外）
        List<String> csvHeaders = mapping.entrySet().stream()
                .filter(e -> e.getValue() != null)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
        List<String> tableColumns = csvHeaders.stream()
                .map(mapping::get)
                .collect(Collectors.toList());

        List<Map<String, Object>> insertRows = rows.stream().map(row -> {
            Map<String, Object> insertRow = new HashMap<>();
            for (int i = 0; i < csvHeaders.size(); i++) {
                String val = row.get(csvHeaders.get(i));
                insertRow.put(tableColumns.get(i), val == null || val.isEmpty() ? null : val);
            }
            return insertRow;
        }).collect(Collectors.toList());

        importRepository.insertIntoCopyTable(setting, schemaName, tableName, tableColumns, insertRows);
    }

    /**
     * 新規テーブルを作成してCSVデータを挿入する。
     * カラム型はフロントから指定された型を使用（未指定はTEXT）。
     */
    public void createTableAndImport(Integer connectionId, String tableName, String schemaName,
            List<String> columns, List<String> columnTypes, List<Map<String, String>> rows) {
        ConnectionSetting setting = getConnection(connectionId);
        List<Map<String, Object>> insertRows = rows.stream().map(row -> {
            Map<String, Object> r = new HashMap<>();
            for (String col : columns) {
                String val = row.get(col);
                r.put(col, val == null || val.isEmpty() ? null : val);
            }
            return r;
        }).collect(Collectors.toList());
        importRepository.createTableAndInsert(setting, schemaName, tableName, columns, columnTypes, insertRows);
    }

    // --- private helpers ---

    private ConnectionSetting getConnection(Integer connectionId) {
        return connectionSettingRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("接続設定が見つかりません: n=" + connectionId));
    }

    private String normalize(String s) {
        return s == null ? "" : s.trim().toLowerCase().replace(" ", "_").replace("-", "_");
    }

    /**
     * シンプルなCSVパーサー。
     * BOM除去・ダブルクォート囲み・改行エスケープに対応。
     */
    private List<String[]> parseCsv(InputStream is) throws IOException {
        List<String[]> result = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            boolean first = true;
            while ((line = reader.readLine()) != null) {
                if (first) {
                    // BOM除去
                    if (line.startsWith("\uFEFF")) {
                        line = line.substring(1);
                    }
                    first = false;
                }
                if (line.isBlank()) continue;
                result.add(splitCsvLine(line));
            }
        }
        return result;
    }

    private String[] splitCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuote = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuote) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        sb.append('"');
                        i++;
                    } else {
                        inQuote = false;
                    }
                } else {
                    sb.append(c);
                }
            } else {
                if (c == '"') {
                    inQuote = true;
                } else if (c == ',') {
                    fields.add(sb.toString());
                    sb.setLength(0);
                } else {
                    sb.append(c);
                }
            }
        }
        fields.add(sb.toString());
        return fields.toArray(new String[0]);
    }
}
