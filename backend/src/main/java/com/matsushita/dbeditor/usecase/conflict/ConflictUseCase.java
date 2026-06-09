package com.matsushita.dbeditor.usecase.conflict;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.repository.ConnectionSettingRepository;
import com.matsushita.dbeditor.domain.repository.TableConflictRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ConflictUseCase {

    private final ConnectionSettingRepository connectionSettingRepository;
    private final TableConflictRepository tableConflictRepository;

    /** A04: 実テーブルをバックアップに退避 */
    public void createBackup(Integer connectionId, String schemaName, String tableName) {
        ConnectionSetting setting = getConnection(connectionId);
        tableConflictRepository.createBackup(setting, schemaName, tableName);
    }

    /** A14: 衝突検知 */
    public boolean hasConflict(Integer connectionId, String schemaName, String tableName) {
        ConnectionSetting setting = getConnection(connectionId);
        return tableConflictRepository.hasConflict(setting, schemaName, tableName);
    }

    /** A15: Diff算出 */
    public List<Map<String, Object>> calcDiff(Integer connectionId, String schemaName, String tableName) {
        ConnectionSetting setting = getConnection(connectionId);
        return tableConflictRepository.calcDiff(setting, schemaName, tableName);
    }

    /** コピーテーブルを実テーブルに反映 */
    public void applyToReal(Integer connectionId, String schemaName, String tableName) {
        ConnectionSetting setting = getConnection(connectionId);
        tableConflictRepository.applyToReal(setting, schemaName, tableName);
    }

    private ConnectionSetting getConnection(Integer connectionId) {
        return connectionSettingRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("接続設定が見つかりません: n=" + connectionId));
    }
}
