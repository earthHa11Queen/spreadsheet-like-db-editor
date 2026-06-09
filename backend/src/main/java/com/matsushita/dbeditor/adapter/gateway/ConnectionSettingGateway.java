package com.matsushita.dbeditor.adapter.gateway;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;
import com.matsushita.dbeditor.domain.repository.ConnectionSettingRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ConnectionSettingGateway implements ConnectionSettingRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final String SCHEMA = "db_editor";

    private final RowMapper<ConnectionSetting> rowMapper = (ResultSet rs, int rowNum) -> ConnectionSetting.builder()
            .n(rs.getInt("n"))
            .dbName(rs.getString("db_name"))
            .dbHost(rs.getString("db_host"))
            .dbPort(rs.getInt("db_port"))
            .databaseName(rs.getString("database_name"))
            .dbUsername(rs.getString("db_username"))
            .dbPassword(rs.getString("db_password"))
            .createdTimestamp(rs.getTimestamp("created_timestamp").toLocalDateTime())
            .updatedTimestamp(rs.getTimestamp("updated_timestamp").toLocalDateTime())
            .build();

    @Override
    public List<ConnectionSetting> findAll() {
        return jdbcTemplate.query(
                "SELECT * FROM " + SCHEMA + ".connection_settings ORDER BY n",
                rowMapper);
    }

    @Override
    public Optional<ConnectionSetting> findById(Integer n) {
        List<ConnectionSetting> results = jdbcTemplate.query(
                "SELECT * FROM " + SCHEMA + ".connection_settings WHERE n = ?",
                rowMapper, n);
        return results.stream().findFirst();
    }

    @Override
    public ConnectionSetting save(ConnectionSetting setting) {
        LocalDateTime now = LocalDateTime.now();
        Integer generatedKey = jdbcTemplate.queryForObject(
                "INSERT INTO " + SCHEMA + ".connection_settings " +
                        "(db_name, db_host, db_port, database_name, db_username, db_password, created_timestamp, updated_timestamp) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING n",
                Integer.class,
                setting.getDbName(),
                setting.getDbHost(),
                setting.getDbPort(),
                setting.getDatabaseName(),
                setting.getDbUsername(),
                setting.getDbPassword(),
                now, now);
        setting.setN(generatedKey);
        setting.setCreatedTimestamp(now);
        setting.setUpdatedTimestamp(now);
        return setting;
    }

    @Override
    public ConnectionSetting update(ConnectionSetting setting) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                "UPDATE " + SCHEMA + ".connection_settings SET " +
                        "db_name = ?, db_host = ?, db_port = ?, database_name = ?, " +
                        "db_username = ?, db_password = ?, updated_timestamp = ? WHERE n = ?",
                setting.getDbName(),
                setting.getDbHost(),
                setting.getDbPort(),
                setting.getDatabaseName(),
                setting.getDbUsername(),
                setting.getDbPassword(),
                now,
                setting.getN());
        setting.setUpdatedTimestamp(now);
        return setting;
    }

    @Override
    public void deleteById(Integer n) {
        jdbcTemplate.update("DELETE FROM " + SCHEMA + ".connection_settings WHERE n = ?", n);
    }

    @Override
    public boolean testConnection(String host, Integer port, String databaseName, String username, String password) {
        String url = "jdbc:postgresql://" + host + ":" + port + "/" + databaseName;
        try (Connection conn = DriverManager.getConnection(url, username, password)) {
            return conn.isValid(5);
        } catch (SQLException e) {
            return false;
        }
    }
}
