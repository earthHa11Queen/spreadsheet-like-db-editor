package com.matsushita.dbeditor.domain.repository;

import java.util.List;
import java.util.Map;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;

public interface TableRecordRepository {
    List<Map<String, Object>> findAllRecords(ConnectionSetting setting, String schemaName, String tableName);
    void createCopyTable(ConnectionSetting setting, String schemaName, String tableName);
    List<Map<String, Object>> findAllCopyRecords(ConnectionSetting setting, String schemaName, String tableName);
    void updateCopyRecords(ConnectionSetting setting, String schemaName, String tableName, List<Map<String, Object>> records);
    List<String> findStaleTables(ConnectionSetting setting, String schemaName);
    void dropTable(ConnectionSetting setting, String schemaName, String tableName);
}
