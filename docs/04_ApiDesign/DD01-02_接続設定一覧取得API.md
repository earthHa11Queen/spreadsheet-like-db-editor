# DD01-02 接続設定一覧取得API 詳細設計書

- 機能名：DB接続設定機能
- API名：接続設定一覧取得API
- メソッド：GET
- パス：/api/connections
- 対応コントローラー：ConnectionController
- 作成日：2026-06-15

---

## リクエスト仕様

### リクエストパラメータ

なし

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

レスポンスはConnectionSettingResponseの配列を返す。
件数が0件の場合は空配列を返す。

| フィールド名 | 型 | 説明 |
|---|---|---|
| n | Integer | PK |
| dbName | String | 接続設定の表示名 |
| dbHost | String | ホスト名またはIPアドレス |
| dbPort | Integer | ポート番号 |
| databaseName | String | データベース名 |
| dbUsername | String | ユーザ名 |
| createdTimestamp | LocalDateTime | 作成日時 |
| updatedTimestamp | LocalDateTime | 更新日時 |

※ dbPassword はレスポンスに含まれない

### レスポンス例

```json
[
  {
    "n": 1,
    "dbName": "grafana",
    "dbHost": "10.10.10.3",
    "dbPort": 5432,
    "databaseName": "postgres",
    "dbUsername": "postgres",
    "createdTimestamp": "2026-03-15T09:25:25",
    "updatedTimestamp": "2026-03-15T12:36:08"
  },
  {
    "n": 3,
    "dbName": "テスト接続A",
    "dbHost": "main-db",
    "dbPort": 5432,
    "databaseName": "test_target",
    "dbUsername": "postgres",
    "createdTimestamp": "2026-06-15T07:17:38",
    "updatedTimestamp": "2026-06-15T07:17:38"
  }
]
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 500 Internal Server Error | DB取得失敗など予期しないエラー | `{"message": "..."}` |

---

## 処理フロー

### 1. ConnectionController.getAll()

- 前提条件：なし
- リクエストパラメータなし
- ConnectionUseCaseのgetAllメソッドを呼び出す
- UseCaseからConnectionSettingエンティティのListを受け取る
- 各エンティティをConnectionSettingResponse.fromEntity()でDTOに変換しListとして返す
- HTTP200とConnectionSettingResponseのListをレスポンスとして返す

### 2. ConnectionUseCase.getAll()

- 前提条件：なし
- ConnectionSettingRepositoryのfindAllメソッドを呼び出す
- findAllから返されたConnectionSettingエンティティのListをそのままコントローラーに返す

### 3. ConnectionSettingGateway.findAll()

- 前提条件：なし
- 以下のSELECT文をJdbcTemplateで実行する
  - 対象テーブル：db_editor.connection_settings
  - 取得カラム：全カラム（*）
  - ORDER BY：n昇順
- 取得結果をRowMapperでConnectionSettingエンティティのListに変換して返す
- 0件の場合は空のListを返す
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる
  - GlobalExceptionHandlerがキャッチしHTTP500・causeメッセージを返す

### 4. ConnectionController.getAll()（レスポンス処理）

- 前提条件：なし
- UseCaseから返されたConnectionSettingエンティティのListをstream処理でConnectionSettingResponseのListに変換する
- dbPasswordはレスポンスDTOに含めない（ConnectionSettingResponseにdbPasswordフィールドなし）
- HTTP200とConnectionSettingResponseのListをレスポンスとして返す

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| ConnectionSettingGateway | SELECT失敗（DB接続不可等） | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |

---

## 関連テーブルDDL

```sql
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
```
