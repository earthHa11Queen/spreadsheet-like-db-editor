# DD01-04 接続設定更新API 詳細設計書

- 機能名：DB接続設定機能
- API名：接続設定更新API
- メソッド：PUT
- パス：/api/connections/{id}
- 対応コントローラー：ConnectionController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | Integer | ✅ | 更新対象の接続設定のPK（n） |

### リクエストボディ（application/json）

| フィールド名 | 型 | 必須 | 制約 | 説明 |
|---|---|---|---|---|
| dbName | String | ✅ | 空文字不可 | 接続設定の表示名 |
| dbHost | String | ✅ | 空文字不可 | 接続先ホスト名またはIPアドレス |
| dbPort | Integer | ✅ | 1〜65535 | 接続先ポート番号 |
| databaseName | String | ✅ | 空文字不可 | 接続先データベース名 |
| dbUsername | String | ✅ | 空文字不可 | 接続先ユーザ名 |
| dbPassword | String | ✅ | 空文字不可 | 接続先パスワード |

### リクエスト例

```json
{
  "dbName": "テスト接続A（更新）",
  "dbHost": "main-db",
  "dbPort": 5432,
  "databaseName": "test_target",
  "dbUsername": "postgres",
  "dbPassword": "new_password"
}
```

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

| フィールド名 | 型 | 説明 |
|---|---|---|
| n | Integer | PK |
| dbName | String | 接続設定の表示名（更新後の値） |
| dbHost | String | ホスト名またはIPアドレス（更新後の値） |
| dbPort | Integer | ポート番号（更新後の値） |
| databaseName | String | データベース名（更新後の値） |
| dbUsername | String | ユーザ名（更新後の値） |
| createdTimestamp | LocalDateTime | 作成日時（変更なし） |
| updatedTimestamp | LocalDateTime | 更新日時（更新時のタイムスタンプ） |

※ dbPassword はレスポンスに含まれない

### レスポンス例

```json
{
  "n": 3,
  "dbName": "テスト接続A（更新）",
  "dbHost": "main-db",
  "dbPort": 5432,
  "databaseName": "test_target",
  "dbUsername": "postgres",
  "createdTimestamp": "2026-06-15T07:17:38",
  "updatedTimestamp": "2026-06-15T10:30:00"
}
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | バリデーションエラー（必須項目未入力・ポート範囲外） | `{"message": "..."}` |
| 400 Bad Request | 指定されたIDに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=3"}` |
| 500 Internal Server Error | DB更新失敗など予期しないエラー | `{"message": "..."}` |

---

## 処理フロー

### 1. ConnectionController.update()

- 前提条件：なし
- パスパラメータ `id` をInteger型として受け取る
- リクエストボディをConnectionSettingRequestとして受け取る
- `@Validated`アノテーションによりバリデーションチェックを実施する
- バリデーションエラーが発生した場合はHTTP400を返し後続処理を行わない
  - 対象フィールド：dbName・dbHost・dbPort・databaseName・dbUsername・dbPassword
  - dbName・dbHost・databaseName・dbUsername・dbPasswordは空文字・null不可（@NotBlank）
  - dbPortはnull不可かつ1〜65535の範囲（@NotNull・@Min(1)・@Max(65535)）
- バリデーション通過後、ConnectionUseCaseのupdateメソッドをid・requestを引数に呼び出す
- UseCaseからConnectionSettingエンティティを受け取る
- ConnectionSettingResponse.fromEntity()でレスポンスDTOに変換する
- HTTP200とConnectionSettingResponseを返す

### 2. ConnectionUseCase.update()

- 前提条件：バリデーションが完了したConnectionSettingRequestが渡されていること
- 受け取ったnを引数にConnectionSettingRepositoryのfindByIdメソッドを呼び出す
- findByIdがOptional.empty()を返した場合、IllegalArgumentExceptionをスローする
  - メッセージ：`"接続設定が見つかりません: n=" + n`
  - GlobalExceptionHandlerがキャッチしHTTP400・causeメッセージを返す
- ConnectionSettingRequestの各フィールドとパスパラメータのnをConnectionSettingエンティティに詰め替える
  - n・dbName・dbHost・dbPort・databaseName・dbUsername・dbPasswordをセットする
  - updatedTimestampはこの時点では未セット（Gateway側で設定される）
  - createdTimestampはこの時点では未セット（UPDATE文で更新しないため）
- ConnectionSettingRepositoryのupdateメソッドを呼び出す
- updateメソッドから返されたConnectionSettingエンティティをそのままコントローラーに返す

### 3. ConnectionSettingGateway.update()

- 前提条件：なし
- ConnectionSettingエンティティを受け取る
- 現在日時（LocalDateTime.now()）をnowとして取得する
- 以下のUPDATE文をJdbcTemplateで実行する
  - 対象テーブル：db_editor.connection_settings
  - 更新カラム：db_name・db_host・db_port・database_name・db_username・db_password・updated_timestamp
  - WHERE条件：n = ?（エンティティのnを使用）
  - created_timestampは更新しない
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる
  - GlobalExceptionHandlerがキャッチしHTTP500・causeメッセージを返す
- SQL実行が成功した場合、nowをConnectionSettingエンティティのupdatedTimestampにセットして返す

### 4. ConnectionController.update()（レスポンス処理）

- 前提条件：なし
- UseCaseから返されたConnectionSettingエンティティをConnectionSettingResponse.fromEntity()でDTOに変換する
- dbPasswordはレスポンスDTOに含めない（ConnectionSettingResponseにdbPasswordフィールドなし）
- HTTP200とConnectionSettingResponseをレスポンスとして返す

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| ConnectionController | @Validatedバリデーションエラー | Spring MVCがMethodArgumentNotValidExceptionを発生させHTTP400を返す | 400 |
| ConnectionUseCase | findByIdがOptional.empty()を返した（対象レコード不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| ConnectionSettingGateway | UPDATE失敗（DB接続不可・制約違反等） | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |

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
