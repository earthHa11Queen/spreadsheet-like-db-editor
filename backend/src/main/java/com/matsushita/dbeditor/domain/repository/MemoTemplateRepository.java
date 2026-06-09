package com.matsushita.dbeditor.domain.repository;

import java.util.List;
import java.util.Optional;

import com.matsushita.dbeditor.domain.entity.MemoTemplate;

public interface MemoTemplateRepository {
    List<MemoTemplate> findAll();
    Optional<MemoTemplate> findById(Integer n);
    MemoTemplate save(MemoTemplate template);
    void deleteById(Integer n);
}
