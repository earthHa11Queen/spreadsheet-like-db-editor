package com.matsushita.dbeditor.usecase.table;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.repository.ConnectionSettingRepository;
import com.matsushita.dbeditor.domain.repository.TableRecordRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TableRecordUseCase {

    private final ConnectionSettingRepository connectionSettingRepository;
    private final TableRecordRepository tableRecordRepository;

    public List<Map<String, Object>> getAllRecords(Integer connectionId, String schemaName, String tableName) {
        ConnectionSetting setting = getConnection(connectionId);
        return tableRecordRepository.findAllRecords(setting, schemaName, tableName);
    }

    public void createCopy(Integer connectionId, String schemaName, String tableName) {
        ConnectionSetting setting = getConnection(connectionId);
        tableRecordRepository.createCopyTable(setting, schemaName, tableName);
    }

    public List<Map<String, Object>> getCopyRecords(Integer connectionId, String schemaName, String tableName) {
        ConnectionSetting setting = getConnection(connectionId);
        return tableRecordRepository.findAllCopyRecords(setting, schemaName, tableName);
    }

    public void updateCopyRecords(Integer connectionId, String schemaName, String tableName, List<Map<String, Object>> records) {
        ConnectionSetting setting = getConnection(connectionId);
        tableRecordRepository.updateCopyRecords(setting, schemaName, tableName, records);
    }

    public List<String> getStaleTables(Integer connectionId, String schemaName) {
        ConnectionSetting setting = getConnection(connectionId);
        return tableRecordRepository.findStaleTables(setting, schemaName);
    }

    public void dropStaleTable(Integer connectionId, String schemaName, String tableName) {
        // 安全ガード: copy_ / backup_ / history_ 以外は削除不可
        if (!tableName.startsWith("copy_") && !tableName.startsWith("backup_") && !tableName.startsWith("history_")) {
            throw new IllegalArgumentException("削除対象は copy_ / backup_ / history_ プレフィックスのテーブルのみです: " + tableName);
        }
        ConnectionSetting setting = getConnection(connectionId);
        tableRecordRepository.dropTable(setting, schemaName, tableName);
    }

    private ConnectionSetting getConnection(Integer connectionId) {
        return connectionSettingRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("接続設定が見つかりません: n=" + connectionId));
    }
}
