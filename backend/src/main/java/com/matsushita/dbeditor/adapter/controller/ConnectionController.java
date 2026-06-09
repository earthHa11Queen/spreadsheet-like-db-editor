package com.matsushita.dbeditor.adapter.controller;

import java.util.List;
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
import org.springframework.web.bind.annotation.RestController;

import com.matsushita.dbeditor.dto.indto.ConnectionSettingRequest;
import com.matsushita.dbeditor.dto.indto.ConnectionTestRequest;
import com.matsushita.dbeditor.dto.outdto.ConnectionSettingResponse;
import com.matsushita.dbeditor.dto.outdto.ConnectionTestResponse;
import com.matsushita.dbeditor.usecase.connection.ConnectionUseCase;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/connections")
@RequiredArgsConstructor
public class ConnectionController {

    private final ConnectionUseCase connectionUseCase;

    @GetMapping
    public ResponseEntity<List<ConnectionSettingResponse>> getAll() {
        List<ConnectionSettingResponse> responses = connectionUseCase.getAll().stream()
                .map(ConnectionSettingResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConnectionSettingResponse> getById(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(
                ConnectionSettingResponse.fromEntity(connectionUseCase.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ConnectionSettingResponse> create(
            @Validated @RequestBody ConnectionSettingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ConnectionSettingResponse.fromEntity(connectionUseCase.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ConnectionSettingResponse> update(
            @PathVariable("id") Integer id,
            @Validated @RequestBody ConnectionSettingRequest request) {
        return ResponseEntity.ok(
                ConnectionSettingResponse.fromEntity(connectionUseCase.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Integer id) {
        connectionUseCase.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/test")
    public ResponseEntity<ConnectionTestResponse> testConnection(
            @RequestBody ConnectionTestRequest request) {
        boolean success = connectionUseCase.testConnection(request);
        String message = success ? "接続に成功しました" : "接続に失敗しました";
        return ResponseEntity.ok(new ConnectionTestResponse(success, message));
    }
}
