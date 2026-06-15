# DD02-02 レコード全件取得API 詳細設計書

- 機能名：テーブル操作機能
- API名：レコード全件取得API
- メソッド：GET
- パス：/api/tables/{name}/records
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | 取得対象のテーブル名 |

### クエリパラメータ

| パラメータ名 | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| connectionId | Integer | ✅ | - | 接続設定のPK（n） |
| schema | String | ❌ | public | 対象スキーマ名 |

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

`List<Map<String, Object>>` 形式を返す。各MapのキーはカラムSQL名、値はレコードの値。件数が0件の場合は空配列を返す。

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
| 500 Internal Server Error | 対象DBへの接続失敗・SQLエラー等 | `{"message": "..."}` |

---

## 処理フロー

### 1. TableController.getRecords()

- 前提条件：なし
- パスパラメータ `name`・クエリパラメータ `connectionId`・`schema`（デフォルト"public"）を受け取る
- TableRecordUseCaseのgetAllRecordsメソッドをconnectionId・schema・nameを引数に呼び出す
- UseCaseから返された `List<Map<String, Object>>` をそのままHTTP200で返す

### 2. TableRecordUseCase.getAllRecords()

- 前提条件：なし
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- 取得したConnectionSettingエンティティ・schemaName・tableNameをTableRecordRepositoryのfindAllRecordsに渡す
- findAllRecordsから返された `List<Map<String, Object>>` をコントローラーに返す

### 3. TableRecordGateway.findAllRecords()

- 前提条件：なし
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- TableNameValidator.quoted(schemaName, tableName)でSQL安全なスキーマ修飾テーブル名を生成する
  - テーブル名・スキーマ名が正規表現 `^[a-zA-Z_][a-zA-Z0-9_]*$` に合致しない場合はIllegalArgumentExceptionをスローする
- `SELECT * FROM "{schemaName}"."{tableName}"` をJdbcTemplateのqueryForListで実行する
- 取得結果を `List<Map<String, Object>>` として返す
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableRecordUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordGateway | テーブル名・スキーマ名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordGateway | 対象DBへの接続失敗・SQLエラー等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
