package com.matsushita.dbeditor.adapter.controller;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.matsushita.dbeditor.usecase.file.ExportUseCase;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
public class ExportController {

    private final ExportUseCase exportUseCase;

    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    /**
     * A12: テーブルデータエクスポート
     * GET /api/tables/{name}/export?connectionId=&format=csv|excel|markdown&schema=
     */
    @GetMapping("/{name}/export")
    public ResponseEntity<byte[]> export(
            @PathVariable("name") String name,
            @RequestParam("connectionId") Integer connectionId,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            @RequestParam(value = "schema", defaultValue = "public") String schema) throws IOException {

        String timestamp = LocalDateTime.now().format(TS);

        return switch (format.toLowerCase()) {
            case "excel" -> {
                byte[] data = exportUseCase.exportExcel(connectionId, schema, name);
                String filename = name + "_" + timestamp + ".xlsx";
                yield ResponseEntity.ok()
                        .headers(downloadHeaders(filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                        .body(data);
            }
            case "markdown", "md" -> {
                byte[] data = exportUseCase.exportMarkdown(connectionId, schema, name);
                String filename = name + "_" + timestamp + ".md";
                yield ResponseEntity.ok()
                        .headers(downloadHeaders(filename, "text/markdown; charset=UTF-8"))
                        .body(data);
            }
            default -> {
                // csv
                byte[] data = exportUseCase.exportCsv(connectionId, schema, name);
                String filename = name + "_" + timestamp + ".csv";
                yield ResponseEntity.ok()
                        .headers(downloadHeaders(filename, "text/csv; charset=UTF-8"))
                        .body(data);
            }
        };
    }

    /**
     * A13: テーブル情報Markdown変換
     * GET /api/tables/{name}/markdown?connectionId=&schema=
     */
    @GetMapping("/{name}/markdown")
    public ResponseEntity<byte[]> markdown(
            @PathVariable("name") String name,
            @RequestParam("connectionId") Integer connectionId,
            @RequestParam(value = "schema", defaultValue = "public") String schema) {

        byte[] data = exportUseCase.exportMarkdown(connectionId, schema, name);
        String filename = name + "_" + LocalDateTime.now().format(TS) + ".md";
        return ResponseEntity.ok()
                .headers(downloadHeaders(filename, "text/markdown; charset=UTF-8"))
                .body(data);
    }

    private HttpHeaders downloadHeaders(String filename, String contentType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.setContentDisposition(
                ContentDisposition.attachment().filename(filename, java.nio.charset.StandardCharsets.UTF_8).build());
        return headers;
    }
}
