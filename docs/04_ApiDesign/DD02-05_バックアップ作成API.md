# DD02-05 バックアップ作成API 詳細設計書

- 機能名：テーブル操作機能
- API名：バックアップ作成API
- メソッド：POST
- パス：/api/tables/{name}/backup
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | バックアップ元のテーブル名（実テーブル名） |

### リクエストボディ（application/json）

| フィールド名 | 型 | 必須 | 制約 | 説明 |
|---|---|---|---|---|
| connectionId | Integer | ✅ | null不可 | 接続設定のPK（n） |
| schemaName | String | ❌ | - | 対象スキーマ名（省略時は"public"） |

### リクエスト例

```json
{
  "connectionId": 3,
  "schemaName": "public"
}
```

---

## レスポンス仕様

### 正常時（HTTP 201 Created）

レスポンスボディなし

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | バリデーションエラー（connectionIdがnull） | `{"message": "..."}` |
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 400 Bad Request | テーブル名・スキーマ名に不正な文字が含まれる | `{"message": "不正なテーブル名またはスキーマ名です: ..."}` |
| 500 Internal Server Error | 対象DBへの接続失敗・SQLエラー等 | `{"message": "..."}` |

---

## 処理フロー

### 1. TableController.createBackup()

- 前提条件：なし
- パスパラメータ `name` を受け取る
- リクエストボディをConflictCheckRequestとして受け取る
- `@Validated`アノテーションによりバリデーションチェックを実施する（connectionIdのNotNull）
- バリデーションエラーが発生した場合はHTTP400を返し後続処理を行わない
- request.getSchemaName()がnullの場合は"public"をschemaとして使用する
- ConflictUseCaseのcreateBackupメソッドをconnectionId・schema・nameを引数に呼び出す
- HTTP201（レスポンスボディなし）を返す

### 2. ConflictUseCase.createBackup()

- 前提条件：なし
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- 取得したConnectionSettingエンティティ・schemaName・tableNameをTableConflictRepositoryのcreateBackupに渡す

### 3. TableConflictGateway.createBackup()

- 前提条件：なし
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- TableNameValidator.quoted(schemaName, tableName)でコピー元のSQL安全名を生成する
- TableNameValidator.quotedBackup(schemaName, tableName)でバックアップ先名（`backup_{tableName}`）を生成する
- 以下を順に実行する
  - `DROP TABLE IF EXISTS "{schemaName}"."backup_{tableName}"`
  - `CREATE TABLE "{schemaName}"."backup_{tableName}" AS SELECT * FROM "{schemaName}"."{tableName}"`
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる

**テーブル命名規則：**
- バックアップテーブル名：`backup_{tableName}`
- 例：実テーブル `customers` → バックアップテーブル `backup_customers`

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableController | @Validatedバリデーションエラー（connectionIdがnull） | Spring MVCがMethodArgumentNotValidExceptionを発生させHTTP400を返す | 400 |
| ConflictUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableConflictGateway | テーブル名・スキーマ名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableConflictGateway | 対象DBへの接続失敗・SQLエラー等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
