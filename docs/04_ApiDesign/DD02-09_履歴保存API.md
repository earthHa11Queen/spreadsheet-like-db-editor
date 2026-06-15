# DD02-09 履歴保存API 詳細設計書

- 機能名：テーブル操作機能
- API名：履歴保存API
- メソッド：POST
- パス：/api/tables/{name}/history
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | 履歴保存対象のテーブル名（実テーブル名） |

### リクエストボディ（application/json）

| フィールド名 | 型 | 必須 | 制約 | 説明 |
|---|---|---|---|---|
| connectionId | Integer | ✅ | null不可 | 接続設定のPK（n） |
| schemaName | String | ❌ | - | 対象スキーマ名（省略時は"public"） |
| records | List\<Map\<String, Object\>\> | ✅ | null不可 | 履歴として保存するレコード一覧 |

### リクエスト例

```json
{
  "connectionId": 3,
  "schemaName": "public",
  "records": [
    { "id": 1, "name": "Alice", "created_at": "2026-01-10T09:00:00" },
    { "id": 2, "name": "Bob", "created_at": "2026-02-15T14:30:00" }
  ]
}
```

---

## レスポンス仕様

### 正常時（HTTP 201 Created）

| フィールド名 | 型 | 説明 |
|---|---|---|
| seq | Integer | 採番された履歴連番 |

### レスポンス例

```json
{
  "seq": 3
}
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | バリデーションエラー（connectionId・recordsがnull） | `{"message": "..."}` |
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 400 Bad Request | テーブル名・スキーマ名・カラム名に不正な文字が含まれる | `{"message": "不正なテーブル名またはスキーマ名です: ..."}` |
| 500 Internal Server Error | 対象DBへの接続失敗・SQLエラー等 | `{"message": "..."}` |

---

## 処理フロー

### 1. TableController.saveHistory()

- 前提条件：コピーテーブルが存在すること
- パスパラメータ `name` を受け取る
- リクエストボディをTableHistorySaveRequestとして受け取る
- `@Validated`アノテーションによりバリデーションチェックを実施する（connectionId・recordsのNotNull）
- バリデーションエラーが発生した場合はHTTP400を返し後続処理を行わない
- request.getSchemaName()がnullの場合は"public"をschemaとして使用する
- TableHistoryUseCaseのsaveHistoryメソッドをconnectionId・schema・name・request.getRecords()を引数に呼び出す
- UseCaseから返されたseq（Integer）を `Map.of("seq", seq)` に詰めてHTTP201で返す

### 2. TableHistoryUseCase.saveHistory()

- 前提条件：なし
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- 取得したConnectionSettingエンティティ・schemaName・tableName・recordsをTableHistoryRepositoryのsaveHistoryに渡す
- saveHistoryから返されたseqをコントローラーに返す

### 3. TableHistoryGateway.saveHistory()

- 前提条件：なし
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- ensureHistoryIndex(jdbc, schemaName)で履歴インデックステーブル（history_index）を必要に応じて作成する
  - テーブル構成：table_name VARCHAR・seq INTEGER・saved_at TIMESTAMP・PRIMARY KEY(table_name, seq)
- nextSeq(jdbc, schemaName, tableName)でtableNameに対する次の連番を採番しINSERTする
  - `SELECT COALESCE(MAX(seq), 0) FROM "{schema}"."history_index" WHERE table_name = ?` で現在の最大seqを取得
  - seq = 現在の最大seq + 1 として計算する
  - `INSERT INTO "{schema}"."history_index" (table_name, seq, saved_at) VALUES (?, ?, NOW())` で登録する
- TableNameValidator.quotedHistory(schemaName, tableName, seq)で履歴テーブル名（`history_{tableName}_{seq}`）を生成する
- `DROP TABLE IF EXISTS "{schema}"."history_{tableName}_{seq}"` で既存の同名履歴テーブルを削除する
- `CREATE TABLE "{schema}"."history_{tableName}_{seq}" AS SELECT * FROM "{schema}"."copy_{tableName}" WHERE 1=0` で空の履歴テーブルを作成する
- recordsが空でない場合、カラム一覧を取得しbatchUpdateで全レコードをINSERTする
  - 値がISO8601形式の文字列の場合はOffsetDateTimeでパースしTimestampに変換する
- 採番したseqを返す

**テーブル命名規則：**
- 履歴テーブル名：`history_{tableName}_{seq}`
- 例：テーブル`customers`の3番目の履歴 → `history_customers_3`

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableController | @Validatedバリデーションエラー（connectionId・recordsがnull） | Spring MVCがMethodArgumentNotValidExceptionを発生させHTTP400を返す | 400 |
| TableHistoryUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableHistoryGateway | テーブル名・スキーマ名・カラム名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableHistoryGateway | 対象DBへの接続失敗・SQLエラー等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
