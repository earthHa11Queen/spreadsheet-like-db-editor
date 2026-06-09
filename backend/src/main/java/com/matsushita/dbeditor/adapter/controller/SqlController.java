package com.matsushita.dbeditor.adapter.controller;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.matsushita.dbeditor.domain.entity.SavedSql;
import com.matsushita.dbeditor.dto.indto.SqlExecuteRequest;
import com.matsushita.dbeditor.dto.indto.SqlSaveRequest;
import com.matsushita.dbeditor.dto.outdto.SqlExecuteResponse;
import com.matsushita.dbeditor.dto.outdto.SqlResponse;
import com.matsushita.dbeditor.usecase.sql.SqlUseCase;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/sql")
@RequiredArgsConstructor
public class SqlController {

    private final SqlUseCase sqlUseCase;

    // A22: SQL一覧取得
    @GetMapping
    public ResponseEntity<List<SqlResponse>> listSql(
            @RequestParam("connectionId") Integer connectionId) {
        return ResponseEntity.ok(sqlUseCase.listSql(connectionId));
    }

    // A23: SQL取得
    @GetMapping("/{id}")
    public ResponseEntity<SqlResponse> getSql(@PathVariable Integer id) {
        return ResponseEntity.ok(sqlUseCase.getSql(id));
    }

    // A24: SQL保存
    @PostMapping
    public ResponseEntity<SqlResponse> saveSql(
            @Validated @RequestBody SqlSaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sqlUseCase.saveSql(request.getConnectionId(), request.getTitle(), request.getContent()));
    }

    // A25: SQL実行
    @PostMapping("/execute")
    public ResponseEntity<SqlExecuteResponse> executeSql(
            @Validated @RequestBody SqlExecuteRequest request) {
        return ResponseEntity.ok(sqlUseCase.executeSql(request.getConnectionId(), request.getSql()));
    }

    // A09: SQLファイルアップロード
    @PostMapping("/upload")
    public ResponseEntity<SqlResponse> uploadSql(
            @RequestParam("connectionId") Integer connectionId,
            @RequestParam("file") MultipartFile file) throws Exception {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sqlUseCase.uploadSql(connectionId,
                        file.getOriginalFilename() != null ? file.getOriginalFilename() : "uploaded.sql",
                        file.getBytes()));
    }

    // A11: SQLファイルダウンロード
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadSql(@PathVariable Integer id) {
        SavedSql sql = sqlUseCase.getSqlForDownload(id);
        byte[] bytes = sql.getContentSql().getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename(sql.getTitleSql() + ".sql", StandardCharsets.UTF_8)
                        .build());
        return ResponseEntity.ok().headers(headers).body(bytes);
    }
}
