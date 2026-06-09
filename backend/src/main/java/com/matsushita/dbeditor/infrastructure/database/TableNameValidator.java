package com.matsushita.dbeditor.infrastructure.database;

import java.util.regex.Pattern;

public final class TableNameValidator {

    private static final Pattern VALID_IDENTIFIER = Pattern.compile("^[a-zA-Z_][a-zA-Z0-9_]*$");

    private TableNameValidator() {
    }

    public static String validate(String name) {
        if (name == null || !VALID_IDENTIFIER.matcher(name).matches()) {
            throw new IllegalArgumentException("不正なテーブル名またはスキーマ名です: " + name);
        }
        return name;
    }

    public static String quoted(String schemaName, String tableName) {
        validate(schemaName);
        validate(tableName);
        return "\"" + schemaName + "\".\"" + tableName + "\"";
    }

    public static String copyTableName(String tableName) {
        return "copy_" + validate(tableName);
    }

    public static String quotedCopy(String schemaName, String tableName) {
        validate(schemaName);
        return "\"" + schemaName + "\".\"" + copyTableName(tableName) + "\"";
    }

    public static String quotedReal(String schemaName, String tableName) {
        return quoted(schemaName, tableName);
    }

    public static String historyTableName(String tableName, int seq) {
        return "history_" + validate(tableName) + "_" + seq;
    }

    public static String quotedHistory(String schemaName, String tableName, int seq) {
        validate(schemaName);
        return "\"" + schemaName + "\".\"" + historyTableName(tableName, seq) + "\"";
    }

    public static String backupTableName(String tableName) {
        return "backup_" + validate(tableName);
    }

    public static String quotedBackup(String schemaName, String tableName) {
        validate(schemaName);
        return "\"" + schemaName + "\".\"" + backupTableName(tableName) + "\"";
    }
}
