package com.matsushita.dbeditor.adapter.gateway;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.repository.ImportRepository;
import com.matsushita.dbeditor.infrastructure.database.TableNameValidator;
import com.matsushita.dbeditor.infrastructure.database.TargetDatabaseConnector;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ImportGateway implements ImportRepository {

    private final TargetDatabaseConnector targetDatabaseConnector;

    @Override
    public List<String> findColumnNames(ConnectionSetting setting, String schemaName, String tableName) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        TableNameValidator.validate(schemaName);
        TableNameValidator.validate(tableName);
        return jdbc.queryForList(
                "SELECT column_name FROM information_schema.columns " +
                "WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position",
                String.class, schemaName, tableName);
    }

    @Override
    public void insertIntoCopyTable(ConnectionSetting setting, String schemaName, String tableName,
            List<String> columns, List<Map<String, Object>> rows) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);

        // コピーテーブルが存在する場合はそちらに、なければ実テーブルに直接 INSERT
        String copyTableName = TableNameValidator.copyTableName(tableName);
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ? AND table_schema = ?",
                Integer.class, copyTableName, schemaName);
        boolean copyExists = count != null && count > 0;

        String targetTable = copyExists
                ? TableNameValidator.quotedCopy(schemaName, tableName)
                : TableNameValidator.quotedReal(schemaName, tableName);

        String columnList = columns.stream()
                .map(c -> "\"" + TableNameValidator.validate(c) + "\"")
                .collect(Collectors.joining(", "));
        String placeholders = columns.stream().map(c -> "?").collect(Collectors.joining(", "));
        String sql = "INSERT INTO " + targetTable + " (" + columnList + ") VALUES (" + placeholders + ")";

        List<Object[]> batchArgs = rows.stream()
                .map(row -> columns.stream().map(row::get).toArray())
                .collect(Collectors.toList());

        jdbc.batchUpdate(sql, batchArgs);
    }

    @Override
    public void createTableAndInsert(ConnectionSetting setting, String schemaName, String tableName,
            List<String> columns, List<String> columnTypes, List<Map<String, Object>> rows) {
        JdbcTemplate jdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        TableNameValidator.validate(schemaName);
        TableNameValidator.validate(tableName);

        String colDefs = java.util.stream.IntStream.range(0, columns.size())
                .mapToObj(i -> "\"" + TableNameValidator.validate(columns.get(i)) + "\" " + sanitizeType(columnTypes.get(i)))
                .collect(Collectors.joining(", "));
        String qualifiedTable = "\"" + schemaName + "\".\"" + tableName + "\"";
        jdbc.execute("CREATE TABLE " + qualifiedTable + " (" + colDefs + ")");

        if (rows.isEmpty()) return;
        String columnList = columns.stream()
                .map(c -> "\"" + TableNameValidator.validate(c) + "\"")
                .collect(Collectors.joining(", "));
        String placeholders = columns.stream().map(c -> "?").collect(Collectors.joining(", "));
        String sql = "INSERT INTO " + qualifiedTable + " (" + columnList + ") VALUES (" + placeholders + ")";
        List<Object[]> batchArgs = rows.stream()
                .map(row -> columns.stream().map(row::get).toArray())
                .collect(Collectors.toList());
        jdbc.batchUpdate(sql, batchArgs);
    }

    private String sanitizeType(String type) {
        return switch (type.toUpperCase()) {
            case "INTEGER" -> "INTEGER";
            case "NUMERIC" -> "NUMERIC";
            case "BOOLEAN" -> "BOOLEAN";
            case "TIMESTAMP" -> "TIMESTAMP";
            default -> "TEXT";
        };
    }
}
