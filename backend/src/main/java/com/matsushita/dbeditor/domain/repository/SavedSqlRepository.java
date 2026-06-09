package com.matsushita.dbeditor.domain.repository;

import java.util.List;
import java.util.Optional;

import com.matsushita.dbeditor.domain.entity.SavedSql;

public interface SavedSqlRepository {
    List<SavedSql> findAllByConnectionId(Integer connectionId);
    Optional<SavedSql> findById(Integer n);
    SavedSql save(SavedSql sql);
    void deleteById(Integer n);
}
