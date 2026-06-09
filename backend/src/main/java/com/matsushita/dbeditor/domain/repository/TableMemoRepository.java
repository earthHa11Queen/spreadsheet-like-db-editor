package com.matsushita.dbeditor.domain.repository;

import java.util.Optional;

import com.matsushita.dbeditor.domain.entity.TableMemo;

public interface TableMemoRepository {
    Optional<TableMemo> findByConnectionIdAndTableName(Integer connectionId, String tableName);
    TableMemo upsert(TableMemo memo);
}
