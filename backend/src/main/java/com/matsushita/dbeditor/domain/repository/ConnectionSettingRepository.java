package com.matsushita.dbeditor.domain.repository;

import java.util.List;
import java.util.Optional;

import com.matsushita.dbeditor.domain.entity.ConnectionSetting;

public interface ConnectionSettingRepository {
    List<ConnectionSetting> findAll();
    Optional<ConnectionSetting> findById(Integer n);
    ConnectionSetting save(ConnectionSetting setting);
    ConnectionSetting update(ConnectionSetting setting);
    void deleteById(Integer n);
    boolean testConnection(String host, Integer port, String databaseName, String username, String password);
}
