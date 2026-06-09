package com.matsushita.dbeditor.adapter.controller;

import java.nio.charset.StandardCharsets;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.matsushita.dbeditor.dto.indto.MemoSaveRequest;
import com.matsushita.dbeditor.dto.outdto.MemoResponse;
import com.matsushita.dbeditor.usecase.file.MemoUseCase;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/memo")
@RequiredArgsConstructor
public class MemoController {

    private final MemoUseCase memoUseCase;

    // A20: メモ取得
    @GetMapping("/{connectionId}/{tableName}")
    public ResponseEntity<MemoResponse> getMemo(
            @PathVariable Integer connectionId,
            @PathVariable String tableName) {
        return ResponseEntity.ok(memoUseCase.getMemo(connectionId, tableName));
    }

    // A21: メモ保存（上書き）
    @PutMapping("/{connectionId}/{tableName}")
    public ResponseEntity<MemoResponse> saveMemo(
            @PathVariable Integer connectionId,
            @PathVariable String tableName,
            @Validated @RequestBody MemoSaveRequest request) {
        return ResponseEntity.ok(memoUseCase.saveMemo(connectionId, tableName, request.getContent()));
    }

    // A08: メモアップロード（テキストファイル → DB保存）
    @PostMapping("/{connectionId}/{tableName}/upload")
    public ResponseEntity<MemoResponse> uploadMemo(
            @PathVariable Integer connectionId,
            @PathVariable String tableName,
            @RequestParam("file") MultipartFile file) throws Exception {
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        return ResponseEntity.ok(memoUseCase.uploadMemo(connectionId, tableName, content));
    }

    // A10: メモダウンロード（DB → テキストファイル）
    @GetMapping("/{connectionId}/{tableName}/download")
    public ResponseEntity<byte[]> downloadMemo(
            @PathVariable Integer connectionId,
            @PathVariable String tableName) {
        String content = memoUseCase.downloadMemo(connectionId, tableName);
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename("memo_" + tableName + ".txt", StandardCharsets.UTF_8)
                        .build());
        return ResponseEntity.ok().headers(headers).body(bytes);
    }
}
