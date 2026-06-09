package com.matsushita.dbeditor.adapter.gateway;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.matsushita.dbeditor.domain.entity.MemoTemplate;
import com.matsushita.dbeditor.domain.repository.MemoTemplateRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class MemoTemplateGateway implements MemoTemplateRepository {

    private final JdbcTemplate jdbcTemplate;
    private static final String SCHEMA = "db_editor";

    private final RowMapper<MemoTemplate> rowMapper = (rs, rowNum) -> MemoTemplate.builder()
            .n(rs.getInt("n"))
            .titleMemo(rs.getString("title_memo"))
            .contentMemo(rs.getString("content_memo"))
            .createdTimestamp(rs.getTimestamp("created_timestamp").toLocalDateTime())
            .build();

    @Override
    public List<MemoTemplate> findAll() {
        return jdbcTemplate.query("SELECT * FROM " + SCHEMA + ".memo_templates ORDER BY n", rowMapper);
    }

    @Override
    public Optional<MemoTemplate> findById(Integer n) {
        return jdbcTemplate.query(
                "SELECT * FROM " + SCHEMA + ".memo_templates WHERE n = ?", rowMapper, n)
                .stream().findFirst();
    }

    @Override
    public MemoTemplate save(MemoTemplate template) {
        LocalDateTime now = LocalDateTime.now();
        Integer key = jdbcTemplate.queryForObject(
                "INSERT INTO " + SCHEMA + ".memo_templates (title_memo, content_memo, created_timestamp) VALUES (?, ?, ?) RETURNING n",
                Integer.class, template.getTitleMemo(), template.getContentMemo(), now);
        template.setN(key);
        template.setCreatedTimestamp(now);
        return template;
    }

    @Override
    public void deleteById(Integer n) {
        jdbcTemplate.update("DELETE FROM " + SCHEMA + ".memo_templates WHERE n = ?", n);
    }
}
