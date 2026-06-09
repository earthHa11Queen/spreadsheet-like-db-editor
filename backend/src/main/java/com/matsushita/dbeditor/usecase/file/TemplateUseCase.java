package com.matsushita.dbeditor.usecase.file;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.matsushita.dbeditor.domain.entity.MemoTemplate;
import com.matsushita.dbeditor.domain.entity.SqlTemplate;
import com.matsushita.dbeditor.domain.repository.MemoTemplateRepository;
import com.matsushita.dbeditor.domain.repository.SqlTemplateRepository;
import com.matsushita.dbeditor.dto.outdto.TemplateResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TemplateUseCase {

    private final MemoTemplateRepository memoTemplateRepository;
    private final SqlTemplateRepository sqlTemplateRepository;

    public List<TemplateResponse> listMemoTemplates() {
        return memoTemplateRepository.findAll().stream()
                .map(TemplateResponse::fromMemo).collect(Collectors.toList());
    }

    public TemplateResponse saveMemoTemplate(String title, String content) {
        return TemplateResponse.fromMemo(memoTemplateRepository.save(
                MemoTemplate.builder().titleMemo(title).contentMemo(content).build()));
    }

    public void deleteMemoTemplate(Integer n) {
        memoTemplateRepository.deleteById(n);
    }

    public List<TemplateResponse> listSqlTemplates() {
        return sqlTemplateRepository.findAll().stream()
                .map(TemplateResponse::fromSql).collect(Collectors.toList());
    }

    public TemplateResponse saveSqlTemplate(String title, String content) {
        return TemplateResponse.fromSql(sqlTemplateRepository.save(
                SqlTemplate.builder().titleSql(title).contentSql(content).build()));
    }

    public void deleteSqlTemplate(Integer n) {
        sqlTemplateRepository.deleteById(n);
    }
}
