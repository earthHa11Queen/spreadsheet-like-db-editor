-- =============================================
-- DB Spreadsheet Editor アプリ用スキーマ・テーブル初期化
-- =============================================

-- アプリ用スキーマ作成
CREATE SCHEMA IF NOT EXISTS db_editor;

-- =============================================
-- T01: connection_settings (DB接続設定保存)
-- =============================================
CREATE TABLE IF NOT EXISTS db_editor.connection_settings (
    n                  SERIAL       PRIMARY KEY,
    db_name            VARCHAR(255) NOT NULL,
    db_host            VARCHAR(255) NOT NULL,
    db_port            INTEGER      NOT NULL DEFAULT 5432,
    database_name      VARCHAR(255) NOT NULL,
    db_username        VARCHAR(255) NOT NULL,
    db_password        VARCHAR(255) NOT NULL,
    created_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================
-- T02: table_memo (テーブル紐付きメモ)
-- =============================================
CREATE TABLE IF NOT EXISTS db_editor.table_memo (
    n                  SERIAL       PRIMARY KEY,
    db_connection_id   INTEGER      NOT NULL REFERENCES db_editor.connection_settings(n) ON DELETE CASCADE,
    db_table_name      VARCHAR(255) NOT NULL,
    content_memo       TEXT,
    created_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (db_connection_id, db_table_name)
);

-- =============================================
-- T03: saved_sql (保存済みSQL)
-- =============================================
CREATE TABLE IF NOT EXISTS db_editor.saved_sql (
    n                  SERIAL       PRIMARY KEY,
    db_connection_id   INTEGER      NOT NULL REFERENCES db_editor.connection_settings(n) ON DELETE CASCADE,
    title_sql          VARCHAR(255) NOT NULL,
    content_sql        TEXT         NOT NULL,
    created_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================
-- T04: memo_templates (メモテンプレート)
-- =============================================
CREATE TABLE IF NOT EXISTS db_editor.memo_templates (
    n                  SERIAL       PRIMARY KEY,
    title_memo         VARCHAR(255) NOT NULL,
    content_memo       TEXT         NOT NULL,
    created_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================
-- T05: sql_templates (SQLテンプレート)
-- =============================================
CREATE TABLE IF NOT EXISTS db_editor.sql_templates (
    n                  SERIAL       PRIMARY KEY,
    title_sql          VARCHAR(255) NOT NULL,
    content_sql        TEXT         NOT NULL,
    created_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW()
);
