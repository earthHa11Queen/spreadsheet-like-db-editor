package com.matsushita.dbeditor.adapter.gateway;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.matsushita.dbeditor.domain.entity.TableMemo;
import com.matsushita.dbeditor.domain.repository.TableMemoRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class TableMemoGateway implements TableMemoRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final String SCHEMA = "db_editor";

    private final RowMapper<TableMemo> rowMapper = (rs, rowNum) -> TableMemo.builder()
            .n(rs.getInt("n"))
            .dbConnectionId(rs.getInt("db_connection_id"))
            .dbTableName(rs.getString("db_table_name"))
            .contentMemo(rs.getString("content_memo"))
            .createdTimestamp(rs.getTimestamp("created_timestamp").toLocalDateTime())
            .updatedTimestamp(rs.getTimestamp("updated_timestamp").toLocalDateTime())
            .build();

    @Override
    public Optional<TableMemo> findByConnectionIdAndTableName(Integer connectionId, String tableName) {
        List<TableMemo> results = jdbcTemplate.query(
                "SELECT * FROM " + SCHEMA + ".table_memo WHERE db_connection_id = ? AND db_table_name = ?",
                rowMapper, connectionId, tableName);
        return results.stream().findFirst();
    }

    @Override
    public TableMemo upsert(TableMemo memo) {
        LocalDateTime now = LocalDateTime.now();
        Optional<TableMemo> existing = findByConnectionIdAndTableName(memo.getDbConnectionId(), memo.getDbTableName());
        if (existing.isPresent()) {
            jdbcTemplate.update(
                    "UPDATE " + SCHEMA + ".table_memo SET content_memo = ?, updated_timestamp = ? " +
                    "WHERE db_connection_id = ? AND db_table_name = ?",
                    memo.getContentMemo(), now,
                    memo.getDbConnectionId(), memo.getDbTableName());
            memo.setN(existing.get().getN());
            memo.setCreatedTimestamp(existing.get().getCreatedTimestamp());
            memo.setUpdatedTimestamp(now);
        } else {
            Integer generatedKey = jdbcTemplate.queryForObject(
                    "INSERT INTO " + SCHEMA + ".table_memo " +
                    "(db_connection_id, db_table_name, content_memo, created_timestamp, updated_timestamp) " +
                    "VALUES (?, ?, ?, ?, ?) RETURNING n",
                    Integer.class,
                    memo.getDbConnectionId(), memo.getDbTableName(),
                    memo.getContentMemo(), now, now);
            memo.setN(generatedKey);
            memo.setCreatedTimestamp(now);
            memo.setUpdatedTimestamp(now);
        }
        return memo;
    }
}
