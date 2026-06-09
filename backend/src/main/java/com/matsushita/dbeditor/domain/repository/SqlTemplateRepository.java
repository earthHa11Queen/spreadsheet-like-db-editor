package com.matsushita.dbeditor.domain.repository;

import java.util.List;
import java.util.Optional;

import com.matsushita.dbeditor.domain.entity.SqlTemplate;

public interface SqlTemplateRepository {
    List<SqlTemplate> findAll();
    Optional<SqlTemplate> findById(Integer n);
    SqlTemplate save(SqlTemplate template);
    void deleteById(Integer n);
}
