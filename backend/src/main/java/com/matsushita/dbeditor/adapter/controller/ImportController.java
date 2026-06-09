package com.matsushita.dbeditor.adapter.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.matsushita.dbeditor.dto.indto.MappingApplyRequest;
import com.matsushita.dbeditor.dto.indto.NewTableImportRequest;
import com.matsushita.dbeditor.dto.outdto.AutoMappingResponse;
import com.matsushita.dbeditor.usecase.file.ImportUseCase;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
public class ImportController {

    private final ImportUseCase importUseCase;

    /**
     * A06: CSVアップロード → 自動マッピング提案
     * multipart/form-data: file, connectionId, tableName, schemaName(optional)
     */
    @PostMapping("/csv/auto-mapping")
    public ResponseEntity<AutoMappingResponse> csvAutoMapping(
            @RequestParam("file") MultipartFile file,
            @RequestParam("connectionId") Integer connectionId,
            @RequestParam("tableName") String tableName,
            @RequestParam(value = "schemaName", defaultValue = "public") String schemaName) {
        try {
            AutoMappingResponse response = importUseCase.csvAutoMapping(connectionId, tableName, schemaName, file);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new RuntimeException("CSVの解析に失敗しました: " + e.getMessage(), e);
        }
    }

    /**
     * Excelシート名一覧取得
     * multipart/form-data: file
     */
    @PostMapping("/excel/sheets")
    public ResponseEntity<List<String>> getExcelSheets(
            @RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(importUseCase.getExcelSheetNames(file));
        } catch (Exception e) {
            throw new RuntimeException("Excelシート一覧の取得に失敗しました: " + e.getMessage(), e);
        }
    }

    /**
     * Excel指定シート → 自動マッピング提案
     * multipart/form-data: file, connectionId, tableName, sheetIndex, schemaName(optional)
     */
    @PostMapping("/excel/auto-mapping")
    public ResponseEntity<AutoMappingResponse> excelAutoMapping(
            @RequestParam("file") MultipartFile file,
            @RequestParam("connectionId") Integer connectionId,
            @RequestParam("tableName") String tableName,
            @RequestParam("sheetIndex") int sheetIndex,
            @RequestParam(value = "schemaName", defaultValue = "public") String schemaName) {
        try {
            AutoMappingResponse response = importUseCase.excelSheetAutoMapping(
                    connectionId, tableName, schemaName, file, sheetIndex);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new RuntimeException("Excelの解析に失敗しました: " + e.getMessage(), e);
        }
    }

    /**
     * 新規テーブル作成 + データ挿入
     */
    @PostMapping("/new-table")
    public ResponseEntity<Void> createTableAndImport(@Validated @RequestBody NewTableImportRequest request) {
        String schema = request.getSchemaName() != null ? request.getSchemaName() : "public";
        importUseCase.createTableAndImport(
                request.getConnectionId(),
                request.getTableName(),
                schema,
                request.getColumns(),
                request.getColumnTypes(),
                request.getRows());
        return ResponseEntity.ok().build();
    }

    /**
     * A07: 確定マッピング結果をコピーテーブルに反映
     */
    @PostMapping("/mapping/apply")
    public ResponseEntity<Void> applyMapping(@Validated @RequestBody MappingApplyRequest request) {
        String schema = request.getSchemaName() != null ? request.getSchemaName() : "public";
        importUseCase.applyMapping(
                request.getConnectionId(),
                request.getTableName(),
                schema,
                request.getMapping(),
                request.getRows());
        return ResponseEntity.ok().build();
    }
}
