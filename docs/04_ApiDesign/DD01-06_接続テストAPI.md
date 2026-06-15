# DD01-06 接続テストAPI 詳細設計書

- 機能名：DB接続設定機能
- API名：接続テストAPI
- メソッド：POST
- パス：/api/connections/test
- 対応コントローラー：ConnectionController
- 作成日：2026-06-15

---

## リクエスト仕様

### リクエストボディ（application/json）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| connectionId | Integer | ❌ | 保存済み接続設定のPK（指定時はパスワードをDBから取得） |
| dbName | String | ❌ | 接続設定の表示名（テスト結果には使用しない） |
| dbHost | String | ❌ | 接続先ホスト名またはIPアドレス |
| dbPort | Integer | ❌ | 接続先ポート番号 |
| databaseName | String | ❌ | 接続先データベース名 |
| dbUsername | String | ❌ | 接続先ユーザ名 |
| dbPassword | String | ❌ | 接続先パスワード（connectionIdがnullの場合のみ使用） |

**使用パターンの補足：**
- `connectionId` を指定した場合：保存済みレコードのパスワードを使用して接続テストを行う（パスワード非表示状態でのテスト用途）
- `connectionId` がnullの場合：リクエストの `dbPassword` を使用して接続テストを行う（新規設定の事前テスト用途）

### リクエスト例（新規設定テスト）

```json
{
  "dbHost": "main-db",
  "dbPort": 5432,
  "databaseName": "test_target",
  "dbUsername": "postgres",
  "dbPassword": "root_password"
}
```

### リクエスト例（保存済み設定テスト）

```json
{
  "connectionId": 3,
  "dbHost": "main-db",
  "dbPort": 5432,
  "databaseName": "test_target",
  "dbUsername": "postgres"
}
```

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

接続成功・失敗いずれの場合もHTTP200を返す。成否は `success` フィールドで判断する。

| フィールド名 | 型 | 説明 |
|---|---|---|
| success | boolean | 接続成功時はtrue、失敗時はfalse |
| message | String | 結果メッセージ |

### レスポンス例（接続成功）

```json
{
  "success": true,
  "message": "接続に成功しました"
}
```

### レスポンス例（接続失敗）

```json
{
  "success": false,
  "message": "接続に失敗しました"
}
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | connectionIdを指定したが対応する接続設定が存在しない | `{"message": "接続設定が見つかりません"}` |
| 500 Internal Server Error | db_editor DBへのアクセス失敗など予期しないエラー | `{"message": "..."}` |

---

## 処理フロー

### 1. ConnectionController.testConnection()

- 前提条件：なし
- リクエストボディをConnectionTestRequestとして受け取る（バリデーションなし）
- ConnectionUseCaseのtestConnectionメソッドを呼び出す
- UseCaseからboolean値を受け取る
- success=trueの場合はmessageを"接続に成功しました"、falseの場合は"接続に失敗しました"とする
- ConnectionTestResponse（success・message）を生成する
- HTTP200とConnectionTestResponseを返す

### 2. ConnectionUseCase.testConnection()

- 前提条件：なし
- request.getConnectionId()がnullでない場合：
  - ConnectionSettingRepositoryのfindByIdメソッドをconnectionIdを引数に呼び出す
  - findByIdがOptional.empty()を返した場合、IllegalArgumentExceptionをスローする
    - メッセージ：`"接続設定が見つかりません"`
    - GlobalExceptionHandlerがキャッチしHTTP400・causeメッセージを返す
  - 取得したConnectionSettingエンティティのdbPasswordをpassword変数にセットする
- request.getConnectionId()がnullの場合：
  - request.getDbPassword()をpassword変数にセットする
- ConnectionSettingRepositoryのtestConnectionメソッドを以下の引数で呼び出す
  - request.getDbHost()・request.getDbPort()・request.getDatabaseName()・request.getDbUsername()・password
- testConnectionの戻り値（boolean）をそのままコントローラーに返す

### 3. ConnectionSettingGateway.testConnection()

- 前提条件：なし
- 引数（host・port・databaseName・username・password）からJDBC接続URLを組み立てる
  - URL形式：`jdbc:postgresql://{host}:{port}/{databaseName}`
- DriverManager.getConnectionで対象DBへの接続を試みる
- 接続取得後、conn.isValid(5)でタイムアウト5秒以内の疎通確認を行う
- 疎通確認が成功した場合はtrueを返す
- SQLExceptionが発生した場合はfalseを返す（例外はスローしない）
- try-with-resourcesによりConnectionは自動クローズされる

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| ConnectionUseCase | connectionId指定時にfindByIdがOptional.empty()を返した | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| ConnectionSettingGateway.testConnection() | 対象DBへの接続失敗（SQLException） | falseを返す（例外はスローしない・HTTP200で返る） | 200（success: false） |
| ConnectionSettingGateway（db_editor DBアクセス） | db_editor DB接続不可等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |

---

## 関連テーブルDDL

```sql
-- connectionIdを指定する場合に参照する
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
