# DD02-11 履歴復元API 詳細設計書

- 機能名：テーブル操作機能
- API名：履歴復元API
- メソッド：POST
- パス：/api/tables/{name}/history/{seq}/restore
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | 復元対象のテーブル名（実テーブル名） |
| seq | Integer | ✅ | 復元する履歴の連番 |

### クエリパラメータ

| パラメータ名 | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| connectionId | Integer | ✅ | - | 接続設定のPK（n） |
| schema | String | ❌ | public | 対象スキーマ名 |

### リクエストボディ

なし

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

復元後のコピーテーブルの全レコードを `List<Map<String, Object>>` 形式で返す。

### レスポンス例

```json
[
  {
    "id": 1,
    "name": "Alice",
    "created_at": "2026-01-10T09:00:00"
  },
  {
    "id": 2,
    "name": "Bob",
    "created_at": "2026-02-15T14:30:00"
  }
]
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 400 Bad Request | テーブル名・スキーマ名に不正な文字が含まれる | `{"message": "不正なテーブル名またはスキーマ名です: ..."}` |
| 500 Internal Server Error | 対象履歴テーブルが存在しない・対象DBへの接続失敗等 | `{"message": "..."}` |

---

## 処理フロー

### 1. TableController.restoreHistory()

- 前提条件：指定のseqに対応する履歴テーブルが存在すること
- パスパラメータ `name`・`seq`・クエリパラメータ `connectionId`・`schema`（デフォルト"public"）を受け取る
- TableHistoryUseCaseのrestoreHistoryメソッドをconnectionId・schema・name・seqを引数に呼び出す（コピーテーブルへの復元）
- 続けてTableRecordUseCaseのgetCopyRecordsメソッドをconnectionId・schema・nameを引数に呼び出す（復元後レコード取得）
- getCopyRecordsから返された `List<Map<String, Object>>` をHTTP200で返す

### 2. TableHistoryUseCase.restoreHistory()

- 前提条件：なし
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- 取得したConnectionSettingエンティティ・schemaName・tableName・seqをTableHistoryRepositoryのrestoreHistoryに渡す

### 3. TableHistoryGateway.restoreHistory()

- 前提条件：指定seqの履歴テーブルが存在すること
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- TableNameValidator.quotedCopy(schemaName, tableName)でコピーテーブルのSQL安全名を生成する
- TableNameValidator.quotedHistory(schemaName, tableName, seq)で履歴テーブルのSQL安全名（`history_{tableName}_{seq}`）を生成する
- 以下を順に実行する
  - `DELETE FROM "{schema}"."copy_{tableName}"`（コピーテーブルの全レコード削除）
  - `INSERT INTO "{schema}"."copy_{tableName}" SELECT * FROM "{schema}"."history_{tableName}_{seq}"`（履歴テーブルから全件INSERT）
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる（履歴テーブル未存在の場合も同様）

### 4. TableRecordUseCase.getCopyRecords()（レスポンス用）

- 前提条件：restoreHistoryが完了していること
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- 取得したConnectionSettingエンティティ・schemaName・tableNameをTableRecordRepositoryのfindAllCopyRecordsに渡す
- `SELECT * FROM "{schema}"."copy_{tableName}"` を実行し結果をコントローラーに返す

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableHistoryUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableHistoryGateway | テーブル名・スキーマ名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableHistoryGateway | 履歴テーブル未存在・対象DBへの接続失敗等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
