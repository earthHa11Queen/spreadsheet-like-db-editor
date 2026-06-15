# DD01-05 接続設定削除API 詳細設計書

- 機能名：DB接続設定機能
- API名：接続設定削除API
- メソッド：DELETE
- パス：/api/connections/{id}
- 対応コントローラー：ConnectionController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | Integer | ✅ | 削除対象の接続設定のPK（n） |

### リクエストボディ

なし

---

## レスポンス仕様

### 正常時（HTTP 204 No Content）

レスポンスボディなし

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | 指定されたIDに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=3"}` |
| 500 Internal Server Error | DB削除失敗など予期しないエラー | `{"message": "..."}` |

---

## 処理フロー

### 1. ConnectionController.delete()

- 前提条件：なし
- パスパラメータ `id` をInteger型として受け取る
- ConnectionUseCaseのdeleteメソッドを呼び出す
- HTTP204（レスポンスボディなし）を返す

### 2. ConnectionUseCase.delete()

- 前提条件：なし
- 受け取ったnを引数にConnectionSettingRepositoryのfindByIdメソッドを呼び出す
- findByIdがOptional.empty()を返した場合、IllegalArgumentExceptionをスローする
  - メッセージ：`"接続設定が見つかりません: n=" + n`
  - GlobalExceptionHandlerがキャッチしHTTP400・causeメッセージを返す
- findByIdが値を返した場合、ConnectionSettingRepositoryのdeleteByIdメソッドを呼び出す
- 戻り値はなし（void）

### 3. ConnectionSettingGateway.deleteById()

- 前提条件：なし
- 以下のDELETE文をJdbcTemplateで実行する
  - 対象テーブル：db_editor.connection_settings
  - WHERE条件：n = ?（引数のnを使用）
- connection_settingsを参照するtable_memo・saved_sqlは ON DELETE CASCADE のため連動削除される
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる
  - GlobalExceptionHandlerがキャッチしHTTP500・causeメッセージを返す
- 戻り値はなし（void）

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| ConnectionUseCase | findByIdがOptional.empty()を返した（対象レコード不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| ConnectionSettingGateway | DELETE失敗（DB接続不可等） | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |

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

-- 参照元テーブル（ON DELETE CASCADEにより連動削除される）
CREATE TABLE IF NOT EXISTS db_editor.table_memo (
    n                  SERIAL       PRIMARY KEY,
    db_connection_id   INTEGER      NOT NULL REFERENCES db_editor.connection_settings(n) ON DELETE CASCADE,
    db_table_name      VARCHAR(255) NOT NULL,
    content_memo       TEXT,
    created_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (db_connection_id, db_table_name)
);

CREATE TABLE IF NOT EXISTS db_editor.saved_sql (
    n                  SERIAL       PRIMARY KEY,
    db_connection_id   INTEGER      NOT NULL REFERENCES db_editor.connection_settings(n) ON DELETE CASCADE,
    title_sql          VARCHAR(255) NOT NULL,
    content_sql        TEXT         NOT NULL,
    created_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_timestamp  TIMESTAMP    NOT NULL DEFAULT NOW()
);
```
