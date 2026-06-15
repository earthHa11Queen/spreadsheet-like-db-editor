# DD01-01 接続設定新規作成API 詳細設計書

- 機能名：DB接続設定機能
- API名：接続設定新規作成API
- メソッド：POST
- パス：/api/connections
- 対応コントローラー：ConnectionController
- 作成日：2026-06-15

---

## リクエスト仕様

### リクエストボディ（application/json）

| フィールド名 | 型 | 必須 | 制約 | 説明 |
|---|---|---|---|---|
| dbName | String | ✅ | 空文字不可 | 接続設定の表示名 |
| dbHost | String | ✅ | 空文字不可 | 接続先ホスト名またはIPアドレス |
| dbPort | Integer | ✅ | 1〜65535 | 接続先ポート番号（デフォルト5432） |
| databaseName | String | ✅ | 空文字不可 | 接続先データベース名 |
| dbUsername | String | ✅ | 空文字不可 | 接続先ユーザ名 |
| dbPassword | String | ✅ | 空文字不可 | 接続先パスワード |

### リクエスト例

```json
{
  "dbName": "テスト接続A",
  "dbHost": "main-db",
  "dbPort": 5432,
  "databaseName": "test_target",
  "dbUsername": "postgres",
  "dbPassword": "root_password"
}
```

---

## レスポンス仕様

### 正常時（HTTP 201 Created）

| フィールド名 | 型 | 説明 |
|---|---|---|
| n | Integer | 採番されたPK |
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
  "n": 5,
  "dbName": "テスト接続A",
  "dbHost": "main-db",
  "dbPort": 5432,
  "databaseName": "test_target",
  "dbUsername": "postgres",
  "createdTimestamp": "2026-06-15T10:00:00",
  "updatedTimestamp": "2026-06-15T10:00:00"
}
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | バリデーションエラー（必須項目未入力・ポート範囲外） | `{"message": "..."}` |
| 500 Internal Server Error | DB挿入失敗など予期しないエラー | `{"message": "..."}` |

---

## 処理フロー

### 1. ConnectionController.create()

- 前提条件：なし
- リクエストボディをConnectionSettingRequestとして受け取る
- `@Validated`アノテーションによりバリデーションチェックを実施する
- バリデーションエラーが発生した場合はHTTP400を返し後続処理を行わない
  - 対象フィールド：dbName・dbHost・dbPort・databaseName・dbUsername・dbPassword
  - dbName・dbHost・databaseName・dbUsername・dbPasswordは空文字・null不可（@NotBlank）
  - dbPortはnull不可かつ1〜65535の範囲（@NotNull・@Min(1)・@Max(65535)）
- バリデーション通過後、ConnectionUseCaseのcreateメソッドを呼び出す
- UseCaseからConnectionSettingエンティティを受け取る
- ConnectionSettingResponse.fromEntity()でレスポンスDTOに変換する
- HTTP201とレスポンスDTOを返す

### 2. ConnectionUseCase.create()

- 前提条件：バリデーションが完了したConnectionSettingRequestが渡されていること
- ConnectionSettingRequestの各フィールドをConnectionSettingエンティティに詰め替える
  - dbName・dbHost・dbPort・databaseName・dbUsername・dbPasswordをセットする
  - n・createdTimestamp・updatedTimestampはこの時点では未セット（Gateway側で採番・設定される）
- ConnectionSettingRepositoryのsaveメソッドを呼び出す
- saveメソッドから返されたConnectionSettingエンティティをそのままコントローラーに返す

### 3. ConnectionSettingGateway.save()

- 前提条件：なし
- ConnectionSettingエンティティを受け取る
- 現在日時（LocalDateTime.now()）をnowとして取得する
- 以下のINSERT文をJdbcTemplateで実行する
  - 対象テーブル：db_editor.connection_settings
  - 挿入カラム：db_name・db_host・db_port・database_name・db_username・db_password・created_timestamp・updated_timestamp
  - RETURNING nでSERIAL採番されたPK値を取得する
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる
  - GlobalExceptionHandlerがキャッチしHTTP500・causeメッセージを返す
- SQL実行が成功した場合、採番されたnとnowをConnectionSettingエンティティにセットして返す

### 4. ConnectionController.create()（レスポンス処理）

- 前提条件：なし
- UseCaseから返されたConnectionSettingエンティティをConnectionSettingResponse.fromEntity()でDTOに変換する
- dbPasswordはレスポンスDTOに含めない（ConnectionSettingResponseにdbPasswordフィールドなし）
- HTTP201とConnectionSettingResponseをレスポンスとして返す

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| ConnectionController | @Validatedバリデーションエラー | Spring MVCがMethodArgumentNotValidExceptionを発生させHTTP400を返す | 400 |
| ConnectionSettingGateway | INSERT失敗（DB接続不可・制約違反等） | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |

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
