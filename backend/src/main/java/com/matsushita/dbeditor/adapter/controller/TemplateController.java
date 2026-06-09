package com.matsushita.dbeditor.adapter.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.matsushita.dbeditor.dto.indto.TemplateRequest;
import com.matsushita.dbeditor.dto.outdto.TemplateResponse;
import com.matsushita.dbeditor.usecase.file.TemplateUseCase;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateUseCase templateUseCase;

    // メモテンプレート一覧
    @GetMapping("/memo")
    public ResponseEntity<List<TemplateResponse>> listMemoTemplates() {
        return ResponseEntity.ok(templateUseCase.listMemoTemplates());
    }

    // メモテンプレート保存
    @PostMapping("/memo")
    public ResponseEntity<TemplateResponse> saveMemoTemplate(
            @Validated @RequestBody TemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(templateUseCase.saveMemoTemplate(request.getTitle(), request.getContent()));
    }

    // メモテンプレート削除
    @DeleteMapping("/memo/{n}")
    public ResponseEntity<Void> deleteMemoTemplate(@PathVariable Integer n) {
        templateUseCase.deleteMemoTemplate(n);
        return ResponseEntity.noContent().build();
    }

    // SQLテンプレート一覧
    @GetMapping("/sql")
    public ResponseEntity<List<TemplateResponse>> listSqlTemplates() {
        return ResponseEntity.ok(templateUseCase.listSqlTemplates());
    }

    // SQLテンプレート保存
    @PostMapping("/sql")
    public ResponseEntity<TemplateResponse> saveSqlTemplate(
            @Validated @RequestBody TemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(templateUseCase.saveSqlTemplate(request.getTitle(), request.getContent()));
    }

    // SQLテンプレート削除
    @DeleteMapping("/sql/{n}")
    public ResponseEntity<Void> deleteSqlTemplate(@PathVariable Integer n) {
        templateUseCase.deleteSqlTemplate(n);
        return ResponseEntity.noContent().build();
    }
}
