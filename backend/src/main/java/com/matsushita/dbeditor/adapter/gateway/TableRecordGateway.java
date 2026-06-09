package com.matsushita.dbeditor.adapter.gateway;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.repository.TableRecordRepository;
import com.matsushita.dbeditor.infrastructure.database.TableNameValidator;
import com.matsushita.dbeditor.infrastructure.database.TargetDatabaseConnector;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class TableRecordGateway implements TableRecordRepository {

    private final TargetDatabaseConnector targetDatabaseConnector;

    @Override
    public List<Map<String, Object>> findAllRecords(ConnectionSetting setting, String schemaName, String tableName) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        String qualifiedName = TableNameValidator.quoted(schemaName, tableName);
        return jdbc.queryForList("SELECT * FROM " + qualifiedName);
    }

    @Override
    public void createCopyTable(ConnectionSetting setting, String schemaName, String tableName) {
        // copy_ プレフィックス付きテーブルを誤ってコピーしようとした場合は元テーブル名に戻す
        String baseTableName = tableName.startsWith("copy_") ? tableName.substring(5) : tableName;
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        String source = TableNameValidator.quoted(schemaName, baseTableName);
        String copyName = TableNameValidator.quotedCopy(schemaName, baseTableName);

        // DROP→CREATEを同一コネクション・同一トランザクション内で実行しpg_type重複エラーを防止
        jdbc.execute((java.sql.Connection con) -> {
            boolean prevAutoCommit = con.getAutoCommit();
            con.setAutoCommit(false);
            try (java.sql.Statement stmt = con.createStatement()) {
                stmt.execute("DROP TABLE IF EXISTS " + copyName);
                stmt.execute("CREATE TABLE " + copyName + " AS SELECT * FROM " + source);
                con.commit();
            } catch (java.sql.SQLException e) {
                con.rollback();
                throw e;
            } finally {
                con.setAutoCommit(prevAutoCommit);
            }
            return null;
        });
    }

    @Override
    public List<Map<String, Object>> findAllCopyRecords(ConnectionSetting setting, String schemaName, String tableName) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        String copyName = TableNameValidator.quotedCopy(schemaName, tableName);
        return jdbc.queryForList("SELECT * FROM " + copyName);
    }

    @Override
    public void updateCopyRecords(ConnectionSetting setting, String schemaName, String tableName, List<Map<String, Object>> records) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        String copyName = TableNameValidator.quotedCopy(schemaName, tableName);

        // コピーテーブルを全削除し、送られてきたレコードで再構築
        jdbc.execute("DELETE FROM " + copyName);

        if (records == null || records.isEmpty()) {
            return;
        }

        // 最初のレコードからカラム一覧を取得
        Map<String, Object> first = records.get(0);
        List<String> columns = first.keySet().stream().collect(Collectors.toList());

        String columnList = columns.stream()
                .map(c -> "\"" + TableNameValidator.validate(c) + "\"")
                .collect(Collectors.joining(", "));
        String placeholders = columns.stream()
                .map(c -> "?")
                .collect(Collectors.joining(", "));
        String insertSql = "INSERT INTO " + copyName + " (" + columnList + ") VALUES (" + placeholders + ")";

        List<Object[]> batchArgs = records.stream()
                .map(row -> columns.stream().map(row::get).toArray())
                .collect(Collectors.toList());

        jdbc.batchUpdate(insertSql, batchArgs);
    }

    @Override
    public List<String> findStaleTables(ConnectionSetting setting, String schemaName) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        // 条件:
        //   1) copy_copy_ の二重コピー（常に表示）
        //   2) 最終アクセスから3日以上経過したテーブル（放置テーブル）
        //   作成直後（統計が全てNULLかつseq_scan=0）は除外する
        return jdbc.queryForList(
            "SELECT t.table_name FROM information_schema.tables t " +
            "LEFT JOIN pg_stat_user_tables s " +
            "  ON s.relname = t.table_name AND s.schemaname = t.table_schema " +
            "WHERE t.table_schema = ? AND t.table_type = 'BASE TABLE' " +
            "AND (t.table_name LIKE 'copy\\_%' ESCAPE '\\' " +
            "  OR t.table_name LIKE 'backup\\_%' ESCAPE '\\' " +
            "  OR t.table_name LIKE 'history\\_%' ESCAPE '\\') " +
            "AND (" +
            "  t.table_name LIKE 'copy\\_copy\\_%' ESCAPE '\\' " +
            "  OR (" +
            "    NOT (s.seq_scan = 0 AND s.last_vacuum IS NULL AND s.last_autovacuum IS NULL" +
            "      AND s.last_analyze IS NULL AND s.last_autoanalyze IS NULL) " +
            "    AND GREATEST(" +
            "      COALESCE(s.last_vacuum, '-infinity'::timestamptz)," +
            "      COALESCE(s.last_autovacuum, '-infinity'::timestamptz)," +
            "      COALESCE(s.last_analyze, '-infinity'::timestamptz)," +
            "      COALESCE(s.last_autoanalyze, '-infinity'::timestamptz)," +
            "      COALESCE(s.last_seq_scan, '-infinity'::timestamptz)," +
            "      COALESCE(s.last_idx_scan, '-infinity'::timestamptz)" +
            "    ) < NOW() - INTERVAL '3 days'" +
            "  )" +
            ") " +
            "ORDER BY t.table_name",
            String.class, schemaName);
    }

    @Override
    public void dropTable(ConnectionSetting setting, String schemaName, String tableName) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        // テーブル名はプレフィックス付きのため直接クォートして使用
        jdbc.execute("DROP TABLE IF EXISTS \"" + schemaName + "\".\"" + tableName + "\"");
    }
}
