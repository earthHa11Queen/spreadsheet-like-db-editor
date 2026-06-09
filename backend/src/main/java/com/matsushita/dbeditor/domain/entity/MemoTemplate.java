package com.matsushita.dbeditor.domain.entity;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemoTemplate {
    private Integer n;
    private String titleMemo;
    private String contentMemo;
    private LocalDateTime createdTimestamp;
}
