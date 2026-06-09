package com.matsushita.dbeditor.dto.outdto;

import com.matsushita.dbeditor.domain.entity.SavedSql;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SqlResponse {
    private Integer n;
    private Integer connectionId;
    private String title;
    private String content;

    public static SqlResponse fromEntity(SavedSql sql) {
        return new SqlResponse(sql.getN(), sql.getDbConnectionId(), sql.getTitleSql(), sql.getContentSql());
    }

    /** 一覧用（contentなし） */
    public static SqlResponse summaryFromEntity(SavedSql sql) {
        return new SqlResponse(sql.getN(), sql.getDbConnectionId(), sql.getTitleSql(), null);
    }
}
