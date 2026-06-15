# DD04-01 メモ取得API 詳細設計書

- 機能名：メモ機能
- API名：メモ取得API
- メソッド：GET
- パス：/api/memo/{connectionId}/{tableName}
- 対応コントローラー：MemoController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| connectionId | Integer | ✅ | 接続設定のPK（n） |
| tableName | String | ✅ | メモを取得するテーブル名 |

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

メモが存在しない場合も200を返す（contentは空文字）。

| フィールド名 | 型 | 説明 |
|---|---|---|
| connectionId | Integer | 接続設定のPK |
| tableName | String | テーブル名 |
| content | String | メモ本文（未登録・contentがnullの場合は空文字） |

### レスポンス例（メモあり）

```json
{
  "connectionId": 3,
  "tableName": "customers",
  "content": "このテーブルは顧客マスタです。\n主キーはidカラム。"
}
```

### レスポンス例（メモなし）

```json
{
  "connectionId": 3,
  "tableName": "customers",
  "content": ""
}
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 500 Internal Server Error | db_editor DBへの接続失敗等 | `{"message": "..."}` |

---

## 処理フロー

### 1. MemoController.getMemo()

- 前提条件：なし
- パスパラメータ `connectionId`（Integer）・`tableName`（String）を受け取る
- MemoUseCaseのgetMemoメソッドをconnectionId・tableNameを引数に呼び出す
- UseCaseから返されたMemoResponseをHTTP200で返す

### 2. MemoUseCase.getMemo()

- 前提条件：なし
- TableMemoRepositoryのfindByConnectionIdAndTableNameメソッドをconnectionId・tableNameを引数に呼び出す
- Optionalが値を持つ場合：MemoResponse.fromEntity()でDTOに変換して返す（contentMemoがnullの場合は空文字）
- Optionalが空の場合：MemoResponse.empty(connectionId, tableName)で空レスポンスを返す（content=""）

### 3. TableMemoGateway.findByConnectionIdAndTableName()

- 前提条件：なし
- 以下のSELECT文をJdbcTemplateで実行する
  - 対象テーブル：db_editor.table_memo
  - WHERE条件：db_connection_id = ?、db_table_name = ?
- 取得結果をRowMapperでTableMemoエンティティに変換しOptionalに包んで返す
- 0件の場合はOptional.empty()を返す
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableMemoGateway | db_editor DBへの接続失敗・SQLエラー等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |

---

## 関連テーブルDDL

```sql
CREATE TABLE IF NOT EXISTS db_editor.table_memo (
    n                  SERIAL       PRIMARY KEY,
    db_connection_id   INTEGER      NOT NULL REFERENCES db_editor.connection_settings(n) ON DELETE CASCADE,
    db_table_name      VARCHAR(255) NOT NULL,
    content_memo       TEXT,
    created_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (db_connection_id, db_table_name)
);
```
