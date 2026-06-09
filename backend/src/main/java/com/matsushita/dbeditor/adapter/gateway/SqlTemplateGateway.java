package com.matsushita.dbeditor.adapter.gateway;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.matsushita.dbeditor.domain.entity.SqlTemplate;
import com.matsushita.dbeditor.domain.repository.SqlTemplateRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class SqlTemplateGateway implements SqlTemplateRepository {

    private final JdbcTemplate jdbcTemplate;
    private static final String SCHEMA = "db_editor";

    private final RowMapper<SqlTemplate> rowMapper = (rs, rowNum) -> SqlTemplate.builder()
            .n(rs.getInt("n"))
            .titleSql(rs.getString("title_sql"))
            .contentSql(rs.getString("content_sql"))
            .createdTimestamp(rs.getTimestamp("created_timestamp").toLocalDateTime())
            .build();

    @Override
    public List<SqlTemplate> findAll() {
        return jdbcTemplate.query("SELECT * FROM " + SCHEMA + ".sql_templates ORDER BY n", rowMapper);
    }

    @Override
    public Optional<SqlTemplate> findById(Integer n) {
        return jdbcTemplate.query(
                "SELECT * FROM " + SCHEMA + ".sql_templates WHERE n = ?", rowMapper, n)
                .stream().findFirst();
    }

    @Override
    public SqlTemplate save(SqlTemplate template) {
        LocalDateTime now = LocalDateTime.now();
        Integer key = jdbcTemplate.queryForObject(
                "INSERT INTO " + SCHEMA + ".sql_templates (title_sql, content_sql, created_timestamp) VALUES (?, ?, ?) RETURNING n",
                Integer.class, template.getTitleSql(), template.getContentSql(), now);
        template.setN(key);
        template.setCreatedTimestamp(now);
        return template;
    }

    @Override
    public void deleteById(Integer n) {
        jdbcTemplate.update("DELETE FROM " + SCHEMA + ".sql_templates WHERE n = ?", n);
    }
}
