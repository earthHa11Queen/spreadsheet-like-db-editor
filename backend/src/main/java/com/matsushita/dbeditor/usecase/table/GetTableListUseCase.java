package com.matsushita.dbeditor.usecase.table;

import java.util.List;

import org.springframework.stereotype.Service;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.entity.TableMetadata;
import com.matsushita.dbeditor.domain.repository.ConnectionSettingRepository;
import com.matsushita.dbeditor.domain.repository.TableMetadataRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetTableListUseCase {

    private final ConnectionSettingRepository connectionSettingRepository;
    private final TableMetadataRepository tableMetadataRepository;

    public List<TableMetadata> execute(Integer connectionId) {
        ConnectionSetting setting = connectionSettingRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("接続設定が見つかりません: n=" + connectionId));
        return tableMetadataRepository.findAllTables(setting);
    }
}
