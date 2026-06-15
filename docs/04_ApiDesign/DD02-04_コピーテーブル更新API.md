# DD02-04 コピーテーブル更新API 詳細設計書

- 機能名：テーブル操作機能
- API名：コピーテーブル更新API
- メソッド：PUT
- パス：/api/tables/{name}/copy/records
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | 更新対象のコピーテーブルの元テーブル名 |

### リクエストボディ（application/json）

| フィールド名 | 型 | 必須 | 制約 | 説明 |
|---|---|---|---|---|
| connectionId | Integer | ✅ | null不可 | 接続設定のPK（n） |
| schemaName | String | ❌ | - | 対象スキーマ名（省略時は"public"） |
| records | List\<Map\<String, Object\>\> | ✅ | null不可 | コピーテーブルに反映するレコード一覧 |

### リクエスト例

```json
{
  "connectionId": 3,
  "schemaName": "public",
  "records": [
    { "id": 1, "name": "Alice Updated", "created_at": "2026-01-10T09:00:00" },
    { "id": 3, "name": "Charlie", "created_at": "2026-06-01T10:00:00" }
  ]
}
```

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

レスポンスボディなし

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | バリデーションエラー（connectionId・recordsがnull） | `{"message": "..."}` |
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 400 Bad Request | テーブル名・スキーマ名・カラム名に不正な文字が含まれる | `{"message": "不正なテーブル名またはスキーマ名です: ..."}` |
| 500 Internal Server Error | 対象DBへの接続失敗・SQLエラー等 | `{"message": "..."}` |

---

## 処理フロー

### 1. TableController.updateCopyRecords()

- 前提条件：なし
- パスパラメータ `name` を受け取る
- リクエストボディをTableRecordUpdateRequestとして受け取る
- `@Validated`アノテーションによりバリデーションチェックを実施する（connectionId・recordsのNotNull）
- バリデーションエラーが発生した場合はHTTP400を返し後続処理を行わない
- request.getSchemaName()がnullの場合は"public"をschemaとして使用する
- TableRecordUseCaseのupdateCopyRecordsメソッドをconnectionId・schema・name・request.getRecords()を引数に呼び出す
- HTTP200（レスポンスボディなし）を返す

### 2. TableRecordUseCase.updateCopyRecords()

- 前提条件：バリデーションが完了したTableRecordUpdateRequestが渡されていること
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- 取得したConnectionSettingエンティティ・schemaName・tableName・recordsをTableRecordRepositoryのupdateCopyRecordsに渡す

### 3. TableRecordGateway.updateCopyRecords()

- 前提条件：コピーテーブルが存在すること
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- TableNameValidator.quotedCopy(schemaName, tableName)でコピーテーブルのSQL安全名を生成する
- コピーテーブルの全レコードを `DELETE FROM "{schemaName}"."copy_{tableName}"` で削除する
- recordsがnullまたは空の場合はここで処理を終了する
- records.get(0)のkeySet()からカラム一覧を取得する
- 各カラム名をTableNameValidator.validate()で検証し、不正な場合はIllegalArgumentExceptionをスローする
- INSERT文を組み立て、JdbcTemplate.batchUpdateで全レコードを一括INSERT する
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableController | @Validatedバリデーションエラー（connectionId・recordsがnull） | Spring MVCがMethodArgumentNotValidExceptionを発生させHTTP400を返す | 400 |
| TableRecordUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordGateway | カラム名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordGateway | 対象DBへの接続失敗・SQLエラー等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
