# DD01-03 接続設定個別取得API 詳細設計書

- 機能名：DB接続設定機能
- API名：接続設定個別取得API
- メソッド：GET
- パス：/api/connections/{id}
- 対応コントローラー：ConnectionController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | Integer | ✅ | 取得対象の接続設定のPK（n） |

### リクエストボディ

なし

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

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
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | 指定されたIDに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=3"}` |
| 500 Internal Server Error | DB取得失敗など予期しないエラー | `{"message": "..."}` |

---

## 処理フロー

### 1. ConnectionController.getById()

- 前提条件：なし
- パスパラメータ `id` をInteger型として受け取る
- ConnectionUseCaseのgetByIdメソッドを呼び出す
- UseCaseからConnectionSettingエンティティを受け取る
- ConnectionSettingResponse.fromEntity()でレスポンスDTOに変換する
- HTTP200とConnectionSettingResponseを返す

### 2. ConnectionUseCase.getById()

- 前提条件：なし
- 受け取ったnを引数にConnectionSettingRepositoryのfindByIdメソッドを呼び出す
- findByIdがOptional.empty()を返した場合、IllegalArgumentExceptionをスローする
  - メッセージ：`"接続設定が見つかりません: n=" + n`
  - GlobalExceptionHandlerがキャッチしHTTP400・causeメッセージを返す
- Optionalから取り出したConnectionSettingエンティティをコントローラーに返す

### 3. ConnectionSettingGateway.findById()

- 前提条件：なし
- 以下のSELECT文をJdbcTemplateで実行する
  - 対象テーブル：db_editor.connection_settings
  - 取得カラム：全カラム（*）
  - WHERE条件：n = ?（引数のnを使用）
- 取得結果をRowMapperでConnectionSettingエンティティに変換しOptionalに包んで返す
- 0件の場合はOptional.empty()を返す
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる
  - GlobalExceptionHandlerがキャッチしHTTP500・causeメッセージを返す

### 4. ConnectionController.getById()（レスポンス処理）

- 前提条件：なし
- UseCaseから返されたConnectionSettingエンティティをConnectionSettingResponse.fromEntity()でDTOに変換する
- dbPasswordはレスポンスDTOに含めない（ConnectionSettingResponseにdbPasswordフィールドなし）
- HTTP200とConnectionSettingResponseをレスポンスとして返す

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| ConnectionUseCase | findByIdがOptional.empty()を返した（対象レコード不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
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
