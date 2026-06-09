package com.matsushita.dbeditor.usecase.sql;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.matsushita.dbeditor.domain.entity.SavedSql;
import com.matsushita.dbeditor.domain.repository.ConnectionSettingRepository;
import com.matsushita.dbeditor.domain.repository.SavedSqlRepository;
import com.matsushita.dbeditor.dto.outdto.SqlExecuteResponse;
import com.matsushita.dbeditor.dto.outdto.SqlResponse;
import com.matsushita.dbeditor.infrastructure.database.TargetDatabaseConnector;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SqlUseCase {

    private final SavedSqlRepository savedSqlRepository;
    private final ConnectionSettingRepository connectionSettingRepository;
    private final TargetDatabaseConnector connector;

    // A22: SQL一覧取得（タイトルのみ）
    public List<SqlResponse> listSql(Integer connectionId) {
        return savedSqlRepository.findAllByConnectionId(connectionId).stream()
                .map(SqlResponse::summaryFromEntity)
                .collect(Collectors.toList());
    }

    // A23: SQL取得（本文含む）
    public SqlResponse getSql(Integer n) {
        return savedSqlRepository.findById(n)
                .map(SqlResponse::fromEntity)
                .orElseThrow(() -> new IllegalArgumentException("SQL not found: " + n));
    }

    // A24: SQL保存
    public SqlResponse saveSql(Integer connectionId, String title, String content) {
        SavedSql sql = SavedSql.builder()
                .dbConnectionId(connectionId)
                .titleSql(title)
                .contentSql(content)
                .build();
        return SqlResponse.fromEntity(savedSqlRepository.save(sql));
    }

    // A25: SQL実行
    public SqlExecuteResponse executeSql(Integer connectionId, String sql) {
        return connectionSettingRepository.findById(connectionId)
                .map(setting -> {
                    JdbcTemplate targetJdbc = connector.createJdbcTemplate(setting);
                    String trimmed = sql.trim().toUpperCase();
                    try {
                        if (trimmed.startsWith("SELECT")) {
                            List<java.util.Map<String, Object>> rows = targetJdbc.queryForList(sql);
                            return SqlExecuteResponse.ofSelect(rows);
                        } else {
                            int affected = targetJdbc.update(sql);
                            return SqlExecuteResponse.ofDml(affected);
                        }
                    } catch (DataAccessException e) {
                        return SqlExecuteResponse.ofError(e.getMostSpecificCause().getMessage());
                    }
                })
                .orElse(SqlExecuteResponse.ofError("接続設定が見つかりません: " + connectionId));
    }

    // A09: SQLファイルアップロード → DB保存
    public SqlResponse uploadSql(Integer connectionId, String filename, byte[] bytes) {
        String content = new String(bytes, StandardCharsets.UTF_8);
        String title = filename.replaceAll("\\.[^.]+$", ""); // 拡張子除去をタイトルに
        return saveSql(connectionId, title, content);
    }

    // A11: SQLファイルダウンロード
    public SavedSql getSqlForDownload(Integer n) {
        return savedSqlRepository.findById(n)
                .orElseThrow(() -> new IllegalArgumentException("SQL not found: " + n));
    }
}
