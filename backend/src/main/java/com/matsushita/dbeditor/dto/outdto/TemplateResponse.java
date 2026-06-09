package com.matsushita.dbeditor.dto.outdto;

import com.matsushita.dbeditor.domain.entity.MemoTemplate;
import com.matsushita.dbeditor.domain.entity.SqlTemplate;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TemplateResponse {
    private Integer n;
    private String title;
    private String content;

    public static TemplateResponse fromMemo(MemoTemplate t) {
        return new TemplateResponse(t.getN(), t.getTitleMemo(), t.getContentMemo());
    }

    public static TemplateResponse fromSql(SqlTemplate t) {
        return new TemplateResponse(t.getN(), t.getTitleSql(), t.getContentSql());
    }
}
