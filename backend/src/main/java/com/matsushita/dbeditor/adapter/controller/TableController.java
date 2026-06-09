package com.matsushita.dbeditor.adapter.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.matsushita.dbeditor.dto.indto.ConflictCheckRequest;
import com.matsushita.dbeditor.dto.indto.TableHistorySaveRequest;
import com.matsushita.dbeditor.dto.indto.TableRecordUpdateRequest;
import com.matsushita.dbeditor.dto.outdto.ConflictCheckResponse;
import com.matsushita.dbeditor.dto.outdto.TableMetadataResponse;
import com.matsushita.dbeditor.usecase.conflict.ConflictUseCase;
import com.matsushita.dbeditor.usecase.table.GetTableListUseCase;
import com.matsushita.dbeditor.usecase.table.TableHistoryUseCase;
import com.matsushita.dbeditor.usecase.table.TableRecordUseCase;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
public class TableController {

    private final GetTableListUseCase getTableListUseCase;
    private final TableRecordUseCase tableRecordUseCase;
    private final TableHistoryUseCase tableHistoryUseCase;
    private final ConflictUseCase conflictUseCase;

    // 残存テーブル一覧取得
    @GetMapping("/stale")
    public ResponseEntity<List<String>> getStaleTables(
            @RequestParam("connectionId") Integer connectionId,
            @RequestParam(value = "schema", defaultValue = "public") String schema) {
        return ResponseEntity.ok(tableRecordUseCase.getStaleTables(connectionId, schema));
    }

    // 残存テーブル削除
    @DeleteMapping("/stale")
    public ResponseEntity<Void> dropStaleTable(
            @RequestParam("connectionId") Integer connectionId,
            @RequestParam("tableName") String tableName,
            @RequestParam(value = "schema", defaultValue = "public") String schema) {
        tableRecordUseCase.dropStaleTable(connectionId, schema, tableName);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<TableMetadataResponse>> getTables(
            @RequestParam("connectionId") Integer connectionId) {
        List<TableMetadataResponse> responses = getTableListUseCase.execute(connectionId).stream()
                .map(TableMetadataResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{name}/records")
    public ResponseEntity<List<Map<String, Object>>> getRecords(
            @PathVariable("name") String name,
            @RequestParam("connectionId") Integer connectionId,
            @RequestParam(value = "schema", defaultValue = "public") String schema) {
        return ResponseEntity.ok(tableRecordUseCase.getAllRecords(connectionId, schema, name));
    }

    @PostMapping("/{name}/copy")
    public ResponseEntity<List<Map<String, Object>>> createCopy(
            @PathVariable("name") String name,
            @RequestParam("connectionId") Integer connectionId,
            @RequestParam(value = "schema", defaultValue = "public") String schema) {
        tableRecordUseCase.createCopy(connectionId, schema, name);
        List<Map<String, Object>> copyRecords = tableRecordUseCase.getCopyRecords(connectionId, schema, name);
        return ResponseEntity.status(HttpStatus.CREATED).body(copyRecords);
    }

    @PutMapping("/{name}/copy/records")
    public ResponseEntity<Void> updateCopyRecords(
            @PathVariable("name") String name,
            @Validated @RequestBody TableRecordUpdateRequest request) {
        String schema = request.getSchemaName() != null ? request.getSchemaName() : "public";
        tableRecordUseCase.updateCopyRecords(request.getConnectionId(), schema, name, request.getRecords());
        return ResponseEntity.ok().build();
    }

    // A26: 編集履歴保存
    @PostMapping("/{name}/history")
    public ResponseEntity<Map<String, Object>> saveHistory(
            @PathVariable("name") String name,
            @Validated @RequestBody TableHistorySaveRequest request) {
        String schema = request.getSchemaName() != null ? request.getSchemaName() : "public";
        int seq = tableHistoryUseCase.saveHistory(request.getConnectionId(), schema, name, request.getRecords());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("seq", seq));
    }

    // A27: 編集履歴一覧取得
    @GetMapping("/{name}/history")
    public ResponseEntity<List<Map<String, Object>>> getHistoryList(
            @PathVariable("name") String name,
            @RequestParam("connectionId") Integer connectionId,
            @RequestParam(value = "schema", defaultValue = "public") String schema) {
        return ResponseEntity.ok(tableHistoryUseCase.getHistoryList(connectionId, schema, name));
    }

    // A28: 編集履歴復元
    @PostMapping("/{name}/history/{seq}/restore")
    public ResponseEntity<List<Map<String, Object>>> restoreHistory(
            @PathVariable("name") String name,
            @PathVariable("seq") int seq,
            @RequestParam("connectionId") Integer connectionId,
            @RequestParam(value = "schema", defaultValue = "public") String schema) {
        tableHistoryUseCase.restoreHistory(connectionId, schema, name, seq);
        List<Map<String, Object>> restored = tableRecordUseCase.getCopyRecords(connectionId, schema, name);
        return ResponseEntity.ok(restored);
    }

    // A04: バックアップ作成
    @PostMapping("/{name}/backup")
    public ResponseEntity<Void> createBackup(
            @PathVariable("name") String name,
            @Validated @RequestBody ConflictCheckRequest request) {
        String schema = request.getSchemaName() != null ? request.getSchemaName() : "public";
        conflictUseCase.createBackup(request.getConnectionId(), schema, name);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // A14: 衝突検知
    @PostMapping("/{name}/conflict-check")
    public ResponseEntity<ConflictCheckResponse> conflictCheck(
            @PathVariable("name") String name,
            @Validated @RequestBody ConflictCheckRequest request) {
        String schema = request.getSchemaName() != null ? request.getSchemaName() : "public";
        boolean conflict = conflictUseCase.hasConflict(request.getConnectionId(), schema, name);
        return ResponseEntity.ok(new ConflictCheckResponse(conflict));
    }

    // A15: 衝突Diff算出
    @PostMapping("/{name}/conflict-diff")
    public ResponseEntity<List<Map<String, Object>>> conflictDiff(
            @PathVariable("name") String name,
            @Validated @RequestBody ConflictCheckRequest request) {
        String schema = request.getSchemaName() != null ? request.getSchemaName() : "public";
        List<Map<String, Object>> diff = conflictUseCase.calcDiff(request.getConnectionId(), schema, name);
        return ResponseEntity.ok(diff);
    }

    // コピーテーブルを実テーブルに反映
    @PostMapping("/{name}/apply")
    public ResponseEntity<Void> applyToReal(
            @PathVariable("name") String name,
            @Validated @RequestBody ConflictCheckRequest request) {
        String schema = request.getSchemaName() != null ? request.getSchemaName() : "public";
        conflictUseCase.applyToReal(request.getConnectionId(), schema, name);
        return ResponseEntity.ok().build();
    }
}
