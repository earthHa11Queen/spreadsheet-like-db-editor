# DD03-01 CSVインポート自動マッピングAPI 詳細設計書

- 機能名：インポート機能
- API名：CSV自動マッピングAPI
- メソッド：POST
- パス：/api/import/csv/auto-mapping
- 対応コントローラー：ImportController
- 作成日：2026-06-15

---

## リクエスト仕様

### リクエスト形式

`multipart/form-data`

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| file | MultipartFile | ✅ | インポートするCSVファイル（BOM付きUTF-8対応） |
| connectionId | Integer | ✅ | 接続設定のPK（n） |
| tableName | String | ✅ | マッピング対象のテーブル名。`__new__`を指定した場合は新規テーブル作成モード（テーブルカラム取得をスキップ） |
| schemaName | String | ❌ | 対象スキーマ名（省略時は"public"） |

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

| フィールド名 | 型 | 説明 |
|---|---|---|
| csvHeaders | List\<String\> | CSVの1行目（ヘッダー列名一覧） |
| tableColumns | List\<String\> | テーブルのカラム名一覧（`__new__`指定時は空リスト） |
| mapping | Map\<String, String\> | 自動マッピング結果。キー=CSVヘッダー名、値=テーブルカラム名（マッピング不可の場合はnull） |
| rows | List\<Map\<String, String\>\> | CSVの2行目以降のデータ行 |

### レスポンス例

```json
{
  "csvHeaders": ["id", "user_name", "created_at"],
  "tableColumns": ["id", "name", "created_timestamp"],
  "mapping": {
    "id": "id",
    "user_name": "name",
    "created_at": null
  },
  "rows": [
    { "id": "1", "user_name": "Alice", "created_at": "2026-01-10" }
  ]
}
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 400 Bad Request | テーブル名・スキーマ名に不正な文字が含まれる | `{"message": "不正なテーブル名またはスキーマ名です: ..."}` |
| 500 Internal Server Error | CSV解析失敗・対象DBへの接続失敗等 | `{"message": "CSVの解析に失敗しました: ..."}` |

---

## 処理フロー

### 1. ImportController.csvAutoMapping()

- 前提条件：なし
- `file`・`connectionId`・`tableName`・`schemaName`（デフォルト"public"）をリクエストパラメータとして受け取る
- ImportUseCaseのcsvAutoMappingメソッドをconnectionId・tableName・schemaName・fileを引数に呼び出す
- 例外が発生した場合はRuntimeException（メッセージ："CSVの解析に失敗しました: " + 原因メッセージ）を再スローする
- UseCaseから返されたAutoMappingResponseをHTTP200で返す

### 2. ImportUseCase.csvAutoMapping()

- 前提条件：なし
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- tableNameが`"__new__"`の場合はtableColumnsを空リストとする。それ以外はImportRepositoryのfindColumnNamesでテーブルカラム名を取得する
- parseCsv(file.getInputStream())でCSVを解析する
  - BOM（\uFEFF）を先頭から除去する
  - ダブルクォート囲みに対応した行分割を行う
  - 空行はスキップする
- 解析結果が空の場合はAutoMappingResponse（全フィールド空）を返す
- 1行目をcsvHeadersとし、2行目以降をrowsとして `List<Map<String, String>>` に変換する
- カラム名の正規化（trim→小文字→スペース/ハイフンをアンダースコアに統一）で一致判定し、mappingを生成する
- AutoMappingResponse（csvHeaders・tableColumns・mapping・rows）を返す

### 3. ImportGateway.findColumnNames()

- 前提条件：tableName が `"__new__"` でないこと
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- TableNameValidator.validate()でschemaName・tableNameの文字種を検証する
- 以下のSELECT文をJdbcTemplateで実行する
  - 対象テーブル：information_schema.columns
  - WHERE：table_schema = ?、table_name = ?
  - ORDER BY：ordinal_position昇順
- 取得したカラム名を `List<String>` として返す

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| ImportUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| ImportGateway | テーブル名・スキーマ名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローし、ImportControllerがRuntimeExceptionでラップしGlobalExceptionHandlerがHTTP500を返す | 500 |
| ImportUseCase / ImportGateway | CSV解析失敗・対象DBへの接続失敗等 | ImportControllerがRuntimeExceptionでラップしGlobalExceptionHandlerがHTTP500を返す | 500 |
