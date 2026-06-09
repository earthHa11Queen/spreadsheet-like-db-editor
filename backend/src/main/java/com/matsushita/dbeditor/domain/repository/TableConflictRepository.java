package com.matsushita.dbeditor.domain.repository;

import java.util.List;
import java.util.Map;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;

public interface TableConflictRepository {
    /** 実テーブルをバックアップテーブルに退避 (A04) */
    void createBackup(ConnectionSetting setting, String schemaName, String tableName);

    /** バックアップと実テーブルを比較し衝突有無を返す (A14) */
    boolean hasConflict(ConnectionSetting setting, String schemaName, String tableName);

    /** バックアップと実テーブルの行単位Diffを返す (A15) */
    List<Map<String, Object>> calcDiff(ConnectionSetting setting, String schemaName, String tableName);

    /** コピーテーブルの内容を実テーブルに反映 */
    void applyToReal(ConnectionSetting setting, String schemaName, String tableName);
}
