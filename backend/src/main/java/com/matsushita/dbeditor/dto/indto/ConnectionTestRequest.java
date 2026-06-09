package com.matsushita.dbeditor.dto.indto;

import lombok.Data;

/**
 * 接続テスト用リクエスト。
 * connectionId が指定された場合は保存済みパスワードを使用する。
 * connectionId が null の場合は dbPassword を使用する（新規設定のテスト用）。
 */
@Data
public class ConnectionTestRequest {
    /** 保存済み接続設定のID（指定時はパスワードをDBから取得） */
    private Integer connectionId;

    private String dbName;
    private String dbHost;
    private Integer dbPort;
    private String databaseName;
    private String dbUsername;
    /** connectionId が null の場合のみ使用 */
    private String dbPassword;
}
