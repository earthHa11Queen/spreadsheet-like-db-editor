package com.matsushita.dbeditor.domain.repository;

import java.util.List;
import java.util.Map;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;

public interface TableHistoryRepository {
    int saveHistory(ConnectionSetting setting, String schemaName, String tableName, List<Map<String, Object>> records);
    List<Map<String, Object>> findHistoryList(ConnectionSetting setting, String schemaName, String tableName);
    List<Map<String, Object>> findHistoryRecords(ConnectionSetting setting, String schemaName, String tableName, int seq);
    void restoreHistory(ConnectionSetting setting, String schemaName, String tableName, int seq);
}
