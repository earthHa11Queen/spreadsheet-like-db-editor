package com.matsushita.dbeditor.adapter.gateway;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.matsushita.dbeditor.domain.entity.SavedSql;
import com.matsushita.dbeditor.domain.repository.SavedSqlRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class SavedSqlGateway implements SavedSqlRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final String SCHEMA = "db_editor";

    private final RowMapper<SavedSql> rowMapper = (rs, rowNum) -> SavedSql.builder()
            .n(rs.getInt("n"))
            .dbConnectionId(rs.getInt("db_connection_id"))
            .titleSql(rs.getString("title_sql"))
            .contentSql(rs.getString("content_sql"))
            .createdTimestamp(rs.getTimestamp("created_timestamp").toLocalDateTime())
            .updatedTimestamp(rs.getTimestamp("updated_timestamp").toLocalDateTime())
            .build();

    @Override
    public List<SavedSql> findAllByConnectionId(Integer connectionId) {
        return jdbcTemplate.query(
                "SELECT * FROM " + SCHEMA + ".saved_sql WHERE db_connection_id = ? ORDER BY n",
                rowMapper, connectionId);
    }

    @Override
    public Optional<SavedSql> findById(Integer n) {
        List<SavedSql> results = jdbcTemplate.query(
                "SELECT * FROM " + SCHEMA + ".saved_sql WHERE n = ?",
                rowMapper, n);
        return results.stream().findFirst();
    }

    @Override
    public SavedSql save(SavedSql sql) {
        LocalDateTime now = LocalDateTime.now();
        Integer generatedKey = jdbcTemplate.queryForObject(
                "INSERT INTO " + SCHEMA + ".saved_sql " +
                "(db_connection_id, title_sql, content_sql, created_timestamp, updated_timestamp) " +
                "VALUES (?, ?, ?, ?, ?) RETURNING n",
                Integer.class,
                sql.getDbConnectionId(), sql.getTitleSql(), sql.getContentSql(), now, now);
        sql.setN(generatedKey);
        sql.setCreatedTimestamp(now);
        sql.setUpdatedTimestamp(now);
        return sql;
    }

    @Override
    public void deleteById(Integer n) {
        jdbcTemplate.update("DELETE FROM " + SCHEMA + ".saved_sql WHERE n = ?", n);
    }
}
