package com.matsushita.dbeditor.usecase.table;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.repository.ConnectionSettingRepository;
import com.matsushita.dbeditor.domain.repository.TableHistoryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TableHistoryUseCase {

    private final ConnectionSettingRepository connectionSettingRepository;
    private final TableHistoryRepository tableHistoryRepository;

    public int saveHistory(Integer connectionId, String schemaName, String tableName, List<Map<String, Object>> records) {
        ConnectionSetting setting = getConnection(connectionId);
        return tableHistoryRepository.saveHistory(setting, schemaName, tableName, records);
    }

    public List<Map<String, Object>> getHistoryList(Integer connectionId, String schemaName, String tableName) {
        ConnectionSetting setting = getConnection(connectionId);
        return tableHistoryRepository.findHistoryList(setting, schemaName, tableName);
    }

    public List<Map<String, Object>> getHistoryRecords(Integer connectionId, String schemaName, String tableName, int seq) {
        ConnectionSetting setting = getConnection(connectionId);
        return tableHistoryRepository.findHistoryRecords(setting, schemaName, tableName, seq);
    }

    public void restoreHistory(Integer connectionId, String schemaName, String tableName, int seq) {
        ConnectionSetting setting = getConnection(connectionId);
        tableHistoryRepository.restoreHistory(setting, schemaName, tableName, seq);
    }

    private ConnectionSetting getConnection(Integer connectionId) {
        return connectionSettingRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("接続設定が見つかりません: n=" + connectionId));
    }
}
