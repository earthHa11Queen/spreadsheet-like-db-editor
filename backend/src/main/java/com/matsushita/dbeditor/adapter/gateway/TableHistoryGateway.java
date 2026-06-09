package com.matsushita.dbeditor.adapter.gateway;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.repository.TableHistoryRepository;
import com.matsushita.dbeditor.infrastructure.database.TableNameValidator;
import com.matsushita.dbeditor.infrastructure.database.TargetDatabaseConnector;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class TableHistoryGateway implements TableHistoryRepository {

    private final TargetDatabaseConnector targetDatabaseConnector;

    /**
     * 履歴管理テーブル（history_index）を必要に応じて作成する。
     * 各テーブルの履歴連番と保存日時を管理する。
     */
    private void ensureHistoryIndex(JdbcTemplate jdbc, String schemaName) {
        String indexTable = "\"" + schemaName + "\".\"history_index\"";
        jdbc.execute(
            "CREATE TABLE IF NOT EXISTS " + indexTable + " (" +
            "  table_name VARCHAR(255) NOT NULL," +
            "  seq INTEGER NOT NULL," +
            "  saved_at TIMESTAMP NOT NULL DEFAULT NOW()," +
            "  PRIMARY KEY (table_name, seq)" +
            ")"
        );
    }

    /**
     * 次の連番を採番して登録し、その連番を返す。
     */
    private int nextSeq(JdbcTemplate jdbc, String schemaName, String tableName) {
        String indexTable = "\"" + schemaName + "\".\"history_index\"";
        Integer maxSeq = jdbc.queryForObject(
            "SELECT COALESCE(MAX(seq), 0) FROM " + indexTable + " WHERE table_name = ?",
            Integer.class, tableName
        );
        int seq = (maxSeq == null ? 0 : maxSeq) + 1;
        jdbc.update(
            "INSERT INTO " + indexTable + " (table_name, seq, saved_at) VALUES (?, ?, NOW())",
            tableName, seq
        );
        return seq;
    }

    @Override
    public int saveHistory(ConnectionSetting setting, String schemaName, String tableName, List<Map<String, Object>> records) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        ensureHistoryIndex(jdbc, schemaName);
        int seq = nextSeq(jdbc, schemaName, tableName);

        String historyTable = TableNameValidator.quotedHistory(schemaName, tableName, seq);
        jdbc.execute("DROP TABLE IF EXISTS " + historyTable);
        jdbc.execute("CREATE TABLE " + historyTable + " AS SELECT * FROM "
                + TableNameValidator.quotedCopy(schemaName, tableName) + " WHERE 1=0");

        if (records != null && !records.isEmpty()) {
            Map<String, Object> first = records.get(0);
            List<String> columns = new ArrayList<>(first.keySet());
            String columnList = columns.stream()
                    .map(c -> "\"" + TableNameValidator.validate(c) + "\"")
                    .collect(Collectors.joining(", "));
            String placeholders = columns.stream().map(c -> "?").collect(Collectors.joining(", "));
            String insertSql = "INSERT INTO " + historyTable + " (" + columnList + ") VALUES (" + placeholders + ")";
            List<Object[]> batchArgs = records.stream()
                    .map(row -> columns.stream().map(row::get).toArray())
                    .collect(Collectors.toList());
            jdbc.batchUpdate(insertSql, batchArgs);
        }
        return seq;
    }

    @Override
    public List<Map<String, Object>> findHistoryList(ConnectionSetting setting, String schemaName, String tableName) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        ensureHistoryIndex(jdbc, schemaName);
        String indexTable = "\"" + schemaName + "\".\"history_index\"";
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT seq, saved_at FROM " + indexTable +
            " WHERE table_name = ? ORDER BY seq DESC",
            tableName
        );
        return rows.stream().map(row -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("seq", row.get("seq"));
            item.put("savedAt", row.get("saved_at"));
            return item;
        }).collect(Collectors.toList());
    }

    @Override
    public List<Map<String, Object>> findHistoryRecords(ConnectionSetting setting, String schemaName, String tableName, int seq) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        String historyTable = TableNameValidator.quotedHistory(schemaName, tableName, seq);
        return jdbc.queryForList("SELECT * FROM " + historyTable);
    }

    @Override
    public void restoreHistory(ConnectionSetting setting, String schemaName, String tableName, int seq) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        String copyTable = TableNameValidator.quotedCopy(schemaName, tableName);
        String historyTable = TableNameValidator.quotedHistory(schemaName, tableName, seq);

        // コピーテーブルを履歴の内容で再構築
        jdbc.execute("DELETE FROM " + copyTable);
        jdbc.execute("INSERT INTO " + copyTable + " SELECT * FROM " + historyTable);
    }
}
