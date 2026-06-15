# DD02-01 テーブル一覧取得API 詳細設計書

- 機能名：テーブル操作機能
- API名：テーブル一覧取得API
- メソッド：GET
- パス：/api/tables
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### クエリパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| connectionId | Integer | ✅ | 接続設定のPK（n）。このDB接続で取得するテーブル一覧の対象となる |

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

TableMetadataResponseの配列を返す。件数が0件の場合は空配列を返す。

| フィールド名 | 型 | 説明 |
|---|---|---|
| schemaName | String | テーブルが属するスキーマ名 |
| tableName | String | テーブル名 |
| tableType | String | テーブル種別（常に"BASE TABLE"） |

### レスポンス例

```json
[
  {
    "schemaName": "public",
    "tableName": "customers",
    "tableType": "BASE TABLE"
  },
  {
    "schemaName": "public",
    "tableName": "orders",
    "tableType": "BASE TABLE"
  }
]
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 500 Internal Server Error | 対象DBへの接続失敗など予期しないエラー | `{"message": "..."}` |

---

## 処理フロー

### 1. TableController.getTables()

- 前提条件：なし
- クエリパラメータ `connectionId` をInteger型として受け取る
- GetTableListUseCaseのexecuteメソッドをconnectionIdを引数に呼び出す
- UseCaseからTableMetadataエンティティのListを受け取る
- 各エンティティをTableMetadataResponse.fromEntity()でDTOに変換しListとして収集する
- HTTP200とTableMetadataResponseのListを返す

### 2. GetTableListUseCase.execute()

- 前提条件：なし
- ConnectionSettingRepositoryのfindByIdメソッドをconnectionIdを引数に呼び出す
- findByIdがOptional.empty()を返した場合、IllegalArgumentExceptionをスローする
  - メッセージ：`"接続設定が見つかりません: n=" + connectionId`
- 取得したConnectionSettingエンティティをTableMetadataRepositoryのfindAllTablesに渡す
- findAllTablesから返されたTableMetadataエンティティのListをコントローラーに返す

### 3. TableMetadataGateway.findAllTables()

- 前提条件：なし
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- 以下のSELECT文をJdbcTemplateで実行する
  - 対象テーブル：information_schema.tables
  - 取得カラム：table_schema・table_name・table_type
  - 除外条件：information_schema・pg_catalogスキーマを除外、table_type = 'BASE TABLE'のみ
  - 除外プレフィックス：`copy_`・`backup_`・`history_`で始まるテーブルを除外
  - ORDER BY：table_schema昇順・table_name昇順
- 取得結果をRowMapperでTableMetadataエンティティのListに変換して返す
- 0件の場合は空のListを返す
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| GetTableListUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableMetadataGateway | 対象DBへの接続失敗・SQLエラー等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
