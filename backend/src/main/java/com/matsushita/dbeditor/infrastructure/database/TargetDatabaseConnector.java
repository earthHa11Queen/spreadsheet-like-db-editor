package com.matsushita.dbeditor.infrastructure.database;

import javax.sql.DataSource;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.stereotype.Component;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;

@Component
public class TargetDatabaseConnector {

    public JdbcTemplate createJdbcTemplate(ConnectionSetting setting) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl(buildUrl(setting));
        dataSource.setUsername(setting.getDbUsername());
        dataSource.setPassword(setting.getDbPassword());
        return new JdbcTemplate(dataSource);
    }

    public DataSource createDataSource(ConnectionSetting setting) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl(buildUrl(setting));
        dataSource.setUsername(setting.getDbUsername());
        dataSource.setPassword(setting.getDbPassword());
        return dataSource;
    }

    private String buildUrl(ConnectionSetting setting) {
        return "jdbc:postgresql://" + setting.getDbHost() + ":" + setting.getDbPort() + "/" + setting.getDatabaseName();
    }
}
