package com.matsushita.dbeditor.adapter.gateway;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.repository.TableConflictRepository;
import com.matsushita.dbeditor.infrastructure.database.TableNameValidator;
import com.matsushita.dbeditor.infrastructure.database.TargetDatabaseConnector;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class TableConflictGateway implements TableConflictRepository {

    private final TargetDatabaseConnector targetDatabaseConnector;

    @Override
    public void createBackup(ConnectionSetting setting, String schemaName, String tableName) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        String source = TableNameValidator.quoted(schemaName, tableName);
        String backup = TableNameValidator.quotedBackup(schemaName, tableName);
        jdbc.execute("DROP TABLE IF EXISTS " + backup);
        jdbc.execute("CREATE TABLE " + backup + " AS SELECT * FROM " + source);
    }

    @Override
    public boolean hasConflict(ConnectionSetting setting, String schemaName, String tableName) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        String real = TableNameValidator.quoted(schemaName, tableName);
        String backup = TableNameValidator.quotedBackup(schemaName, tableName);

        // バックアップに存在して実テーブルに存在しない行、またはその逆があれば衝突
        // EXCEPT で差分行数を確認する
        String sql =
            "SELECT COUNT(*) FROM (" +
            "  SELECT * FROM " + backup + " EXCEPT SELECT * FROM " + real +
            "  UNION ALL" +
            "  SELECT * FROM " + real + " EXCEPT SELECT * FROM " + backup +
            ") diff";
        Integer count = jdbc.queryForObject(sql, Integer.class);
        return count != null && count > 0;
    }

    @Override
    public List<Map<String, Object>> calcDiff(ConnectionSetting setting, String schemaName, String tableName) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        String real = TableNameValidator.quoted(schemaName, tableName);
        String backup = TableNameValidator.quotedBackup(schemaName, tableName);

        // バックアップにあって実テーブルにない行 → "deleted" or "modified" (before)
        List<Map<String, Object>> inBackupOnly = jdbc.queryForList(
            "SELECT * FROM " + backup + " EXCEPT SELECT * FROM " + real);

        // 実テーブルにあってバックアップにない行 → "added" or "modified" (after)
        List<Map<String, Object>> inRealOnly = jdbc.queryForList(
            "SELECT * FROM " + real + " EXCEPT SELECT * FROM " + backup);

        List<Map<String, Object>> result = new ArrayList<>();

        // バックアップのみに存在する行を "before" として追加
        for (Map<String, Object> row : inBackupOnly) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("side", "before");
            entry.putAll(row);
            result.add(entry);
        }

        // 実テーブルのみに存在する行を "after" として追加
        for (Map<String, Object> row : inRealOnly) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("side", "after");
            entry.putAll(row);
            result.add(entry);
        }

        return result;
    }

    @Override
    public void applyToReal(ConnectionSetting setting, String schemaName, String tableName) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        String real = TableNameValidator.quoted(schemaName, tableName);
        String copy = TableNameValidator.quotedCopy(schemaName, tableName);

        List<Map<String, Object>> records = jdbc.queryForList("SELECT * FROM " + copy);

        jdbc.execute("DELETE FROM " + real);

        if (records.isEmpty()) return;

        List<String> columns = new ArrayList<>(records.get(0).keySet());
        String columnList = String.join(", ",
            columns.stream().map(c -> "\"" + TableNameValidator.validate(c) + "\"")
                   .toArray(String[]::new));
        String placeholders = String.join(", ",
            columns.stream().map(c -> "?").toArray(String[]::new));
        String insertSql = "INSERT INTO " + real + " (" + columnList + ") VALUES (" + placeholders + ")";

        List<Object[]> batchArgs = records.stream()
            .map(row -> columns.stream().map(row::get).toArray())
            .collect(java.util.stream.Collectors.toList());

        jdbc.batchUpdate(insertSql, batchArgs);
    }
}
