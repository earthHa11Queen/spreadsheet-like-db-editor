# DD02-06 実テーブル反映API 詳細設計書

- 機能名：テーブル操作機能
- API名：実テーブル反映API
- メソッド：POST
- パス：/api/tables/{name}/apply
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | 反映対象のテーブル名（実テーブル名） |

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

### 正常時（HTTP 200 OK）

レスポンスボディなし

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | バリデーションエラー（connectionIdがnull） | `{"message": "..."}` |
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 400 Bad Request | テーブル名・スキーマ名・カラム名に不正な文字が含まれる | `{"message": "不正なテーブル名またはスキーマ名です: ..."}` |
| 500 Internal Server Error | 対象DBへの接続失敗・SQLエラー等 | `{"message": "..."}` |

---

## 処理フロー

### 1. TableController.applyToReal()

- 前提条件：なし
- パスパラメータ `name` を受け取る
- リクエストボディをConflictCheckRequestとして受け取る
- `@Validated`アノテーションによりバリデーションチェックを実施する（connectionIdのNotNull）
- バリデーションエラーが発生した場合はHTTP400を返し後続処理を行わない
- request.getSchemaName()がnullの場合は"public"をschemaとして使用する
- ConflictUseCaseのapplyToRealメソッドをconnectionId・schema・nameを引数に呼び出す
- HTTP200（レスポンスボディなし）を返す

### 2. ConflictUseCase.applyToReal()

- 前提条件：コピーテーブルが存在すること
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- 取得したConnectionSettingエンティティ・schemaName・tableNameをTableConflictRepositoryのapplyToRealに渡す

### 3. TableConflictGateway.applyToReal()

- 前提条件：コピーテーブルが存在すること
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- TableNameValidator.quoted(schemaName, tableName)で実テーブルのSQL安全名を生成する
- TableNameValidator.quotedCopy(schemaName, tableName)でコピーテーブルのSQL安全名を生成する
- コピーテーブルの全レコードを `SELECT * FROM "{schemaName}"."copy_{tableName}"` で取得する
- 実テーブルの全レコードを `DELETE FROM "{schemaName}"."{tableName}"` で削除する
- recordsが空の場合はここで処理を終了する
- records.get(0)のkeySet()からカラム一覧を取得する
- 各カラム名をTableNameValidator.validate()で検証する
- INSERT文を組み立て、JdbcTemplate.batchUpdateで全レコードを実テーブルに一括INSERTする
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる

**注意：** 本APIはDELETE→INSERT方式で実テーブルを全件置換する。呼び出し前に必要に応じてバックアップ作成API（DD02-05）を実行しておくことを推奨する。

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableController | @Validatedバリデーションエラー（connectionIdがnull） | Spring MVCがMethodArgumentNotValidExceptionを発生させHTTP400を返す | 400 |
| ConflictUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableConflictGateway | テーブル名・スキーマ名・カラム名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableConflictGateway | 対象DBへの接続失敗・SQLエラー等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
