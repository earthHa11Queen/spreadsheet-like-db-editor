package com.matsushita.dbeditor.adapter.gateway;

import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.entity.TableMetadata;
import com.matsushita.dbeditor.domain.repository.TableMetadataRepository;
import com.matsushita.dbeditor.infrastructure.database.TargetDatabaseConnector;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class TableMetadataGateway implements TableMetadataRepository {

    private final TargetDatabaseConnector targetDatabaseConnector;

    private static final String QUERY_TABLES =
            "SELECT table_schema, table_name, table_type " +
            "FROM information_schema.tables " +
            "WHERE table_schema NOT IN ('information_schema', 'pg_catalog') " +
            "AND table_type = 'BASE TABLE' " +
            "AND table_name NOT LIKE 'copy\\_%' ESCAPE '\\' " +
            "AND table_name NOT LIKE 'backup\\_%' ESCAPE '\\' " +
            "AND table_name NOT LIKE 'history\\_%' ESCAPE '\\' " +
            "ORDER BY table_schema, table_name";

    @Override
    public List<TableMetadata> findAllTables(ConnectionSetting setting) {
        JdbcTemplate targetJdbc = targetDatabaseConnector.createJdbcTemplate(setting);
        return targetJdbc.query(QUERY_TABLES, (rs, rowNum) -> TableMetadata.builder()
                .schemaName(rs.getString("table_schema"))
                .tableName(rs.getString("table_name"))
                .tableType(rs.getString("table_type"))
                .build());
    }
}
