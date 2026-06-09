package com.matsushita.dbeditor.domain.repository;

import java.util.List;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.entity.TableMetadata;

public interface TableMetadataRepository {
    List<TableMetadata> findAllTables(ConnectionSetting setting);
}
