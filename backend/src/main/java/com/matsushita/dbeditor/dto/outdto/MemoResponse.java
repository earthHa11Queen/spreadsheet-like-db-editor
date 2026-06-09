package com.matsushita.dbeditor.dto.outdto;

import com.matsushita.dbeditor.domain.entity.TableMemo;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MemoResponse {
    private Integer connectionId;
    private String tableName;
    private String content;

    public static MemoResponse fromEntity(TableMemo memo) {
        return new MemoResponse(
                memo.getDbConnectionId(),
                memo.getDbTableName(),
                memo.getContentMemo() != null ? memo.getContentMemo() : "");
    }

    public static MemoResponse empty(Integer connectionId, String tableName) {
        return new MemoResponse(connectionId, tableName, "");
    }
}
