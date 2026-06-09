package com.matsushita.dbeditor.usecase.file;

import org.springframework.stereotype.Service;

import com.matsushita.dbeditor.domain.entity.TableMemo;
import com.matsushita.dbeditor.domain.repository.TableMemoRepository;
import com.matsushita.dbeditor.dto.outdto.MemoResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MemoUseCase {

    private final TableMemoRepository tableMemoRepository;

    public MemoResponse getMemo(Integer connectionId, String tableName) {
        return tableMemoRepository.findByConnectionIdAndTableName(connectionId, tableName)
                .map(MemoResponse::fromEntity)
                .orElse(MemoResponse.empty(connectionId, tableName));
    }

    public MemoResponse saveMemo(Integer connectionId, String tableName, String content) {
        TableMemo memo = TableMemo.builder()
                .dbConnectionId(connectionId)
                .dbTableName(tableName)
                .contentMemo(content)
                .build();
        return MemoResponse.fromEntity(tableMemoRepository.upsert(memo));
    }

    public String downloadMemo(Integer connectionId, String tableName) {
        return tableMemoRepository.findByConnectionIdAndTableName(connectionId, tableName)
                .map(m -> m.getContentMemo() != null ? m.getContentMemo() : "")
                .orElse("");
    }

    public MemoResponse uploadMemo(Integer connectionId, String tableName, String content) {
        return saveMemo(connectionId, tableName, content);
    }
}
