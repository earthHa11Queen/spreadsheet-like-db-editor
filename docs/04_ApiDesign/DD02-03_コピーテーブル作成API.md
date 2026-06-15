# DD02-03 コピーテーブル作成API 詳細設計書

- 機能名：テーブル操作機能
- API名：コピーテーブル作成API
- メソッド：POST
- パス：/api/tables/{name}/copy
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | コピー元のテーブル名 |

### クエリパラメータ

| パラメータ名 | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| connectionId | Integer | ✅ | - | 接続設定のPK（n） |
| schema | String | ❌ | public | 対象スキーマ名 |

### リクエストボディ

なし

---

## レスポンス仕様

### 正常時（HTTP 201 Created）

コピーテーブルに格納された全レコードを `List<Map<String, Object>>` 形式で返す。

### レスポンス例

```json
[
  {
    "id": 1,
    "name": "Alice",
    "created_at": "2026-01-10T09:00:00"
  }
]
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 400 Bad Request | テーブル名・スキーマ名に不正な文字が含まれる | `{"message": "不正なテーブル名またはスキーマ名です: ..."}` |
| 500 Internal Server Error | 対象DBへの接続失敗・SQLエラー等 | `{"message": "..."}` |

---

## 処理フロー

### 1. TableController.createCopy()

- 前提条件：なし
- パスパラメータ `name`・クエリパラメータ `connectionId`・`schema`（デフォルト"public"）を受け取る
- TableRecordUseCaseのcreateCopyメソッドをconnectionId・schema・nameを引数に呼び出す（コピーテーブル作成）
- 続けてTableRecordUseCaseのgetCopyRecordsメソッドをconnectionId・schema・nameを引数に呼び出す（作成後レコード取得）
- getCopyRecordsから返された `List<Map<String, Object>>` をHTTP201で返す

### 2. TableRecordUseCase.createCopy()

- 前提条件：なし
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- 取得したConnectionSettingエンティティ・schemaName・tableNameをTableRecordRepositoryのcreateTableCopyに渡す

### 3. TableRecordGateway.createCopyTable()

- 前提条件：なし
- tableName が `copy_` で始まる場合は先頭の"copy_"を除去してベーステーブル名として使用する（二重コピー防止）
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- TableNameValidator.quoted(schemaName, baseTableName)でコピー元のSQL安全名を生成する
- TableNameValidator.quotedCopy(schemaName, baseTableName)でコピー先名（`copy_{tableName}`）を生成する
- 同一コネクション・同一トランザクション内で以下を実行する
  - `DROP TABLE IF EXISTS "{schemaName}"."copy_{tableName}"`
  - `CREATE TABLE "{schemaName}"."copy_{tableName}" AS SELECT * FROM "{schemaName}"."{tableName}"`
  - 例外が発生した場合はROLLBACKしてSQLExceptionを再スローする
- DROP→CREATEをトランザクション内で行うことでpg_type重複エラーを防止する

### 4. TableRecordUseCase.getCopyRecords()

- 前提条件：createCopyが完了していること
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- 取得したConnectionSettingエンティティ・schemaName・tableNameをTableRecordRepositoryのfindAllCopyRecordsに渡す
- findAllCopyRecordsから返された `List<Map<String, Object>>` をコントローラーに返す

### 5. TableRecordGateway.findAllCopyRecords()

- 前提条件：コピーテーブルが存在すること
- TableNameValidator.quotedCopy(schemaName, tableName)でコピーテーブルのSQL安全名を生成する
- `SELECT * FROM "{schemaName}"."copy_{tableName}"` をJdbcTemplateのqueryForListで実行する
- 取得結果を `List<Map<String, Object>>` として返す

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableRecordUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordGateway | テーブル名・スキーマ名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordGateway | DROP/CREATE失敗・対象DBへの接続失敗等 | SQLExceptionを再スローしGlobalExceptionHandlerがHTTP500を返す | 500 |
