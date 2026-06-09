package com.matsushita.dbeditor.domain.repository;

import java.util.List;
import java.util.Map;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;

public interface ImportRepository {
    /** 対象テーブルのカラム名一覧を取得 */
    List<String> findColumnNames(ConnectionSetting setting, String schemaName, String tableName);

    /** コピーテーブルにレコードを追加挿入（既存レコードは保持） */
    void insertIntoCopyTable(ConnectionSetting setting, String schemaName, String tableName,
            List<String> columns, List<Map<String, Object>> rows);

    /** 新規テーブルを作成してレコードを挿入 */
    void createTableAndInsert(ConnectionSetting setting, String schemaName, String tableName,
            List<String> columns, List<String> columnTypes, List<Map<String, Object>> rows);
}
