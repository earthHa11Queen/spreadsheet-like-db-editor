package com.matsushita.dbeditor.usecase.connection;

import java.util.List;

import org.springframework.stereotype.Service;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.repository.ConnectionSettingRepository;
import com.matsushita.dbeditor.dto.indto.ConnectionSettingRequest;
import com.matsushita.dbeditor.dto.indto.ConnectionTestRequest;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ConnectionUseCase {

    private final ConnectionSettingRepository connectionSettingRepository;

    public List<ConnectionSetting> getAll() {
        return connectionSettingRepository.findAll();
    }

    public ConnectionSetting getById(Integer n) {
        return connectionSettingRepository.findById(n)
                .orElseThrow(() -> new IllegalArgumentException("接続設定が見つかりません: n=" + n));
    }

    public ConnectionSetting create(ConnectionSettingRequest request) {
        ConnectionSetting setting = ConnectionSetting.builder()
                .dbName(request.getDbName())
                .dbHost(request.getDbHost())
                .dbPort(request.getDbPort())
                .databaseName(request.getDatabaseName())
                .dbUsername(request.getDbUsername())
                .dbPassword(request.getDbPassword())
                .build();
        return connectionSettingRepository.save(setting);
    }

    public ConnectionSetting update(Integer n, ConnectionSettingRequest request) {
        connectionSettingRepository.findById(n)
                .orElseThrow(() -> new IllegalArgumentException("接続設定が見つかりません: n=" + n));

        ConnectionSetting setting = ConnectionSetting.builder()
                .n(n)
                .dbName(request.getDbName())
                .dbHost(request.getDbHost())
                .dbPort(request.getDbPort())
                .databaseName(request.getDatabaseName())
                .dbUsername(request.getDbUsername())
                .dbPassword(request.getDbPassword())
                .build();
        return connectionSettingRepository.update(setting);
    }

    public void delete(Integer n) {
        connectionSettingRepository.findById(n)
                .orElseThrow(() -> new IllegalArgumentException("接続設定が見つかりません: n=" + n));
        connectionSettingRepository.deleteById(n);
    }

    public boolean testConnection(ConnectionTestRequest request) {
        // connectionId が指定されている場合は保存済みパスワードを使用
        String password = request.getDbPassword();
        if (request.getConnectionId() != null) {
            ConnectionSetting saved = connectionSettingRepository.findById(request.getConnectionId())
                    .orElseThrow(() -> new IllegalArgumentException("接続設定が見つかりません"));
            password = saved.getDbPassword();
        }
        return connectionSettingRepository.testConnection(
                request.getDbHost(),
                request.getDbPort(),
                request.getDatabaseName(),
                request.getDbUsername(),
                password);
    }
}
