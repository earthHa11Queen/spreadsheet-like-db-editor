# DD05-04 SQL実行API 詳細設計書

- 機能名：SQL管理機能
- API名：SQL実行API
- メソッド：POST
- パス：/api/sql/execute
- 対応コントローラー：SqlController
- 作成日：2026-06-15

---

## リクエスト仕様

### リクエストボディ（application/json）

| フィールド名 | 型 | 必須 | 制約 | 説明 |
|---|---|---|---|---|
| connectionId | Integer | ✅ | null不可 | 接続設定のPK（n） |
| sql | String | ✅ | 空文字不可 | 実行するSQL文 |

### リクエスト例

```json
{
  "connectionId": 3,
  "sql": "SELECT * FROM customers WHERE id = 1;"
}
```

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

SQL成功・失敗いずれもHTTP200を返す。結果種別によりフィールドの有無が変わる。

| フィールド名 | 型 | 説明 |
|---|---|---|
| rows | List\<Map\<String, Object\>\> | SELECT結果行（SELECT以外はnull） |
| affectedRows | Integer | DML影響行数（SELECT時はnull） |
| errorMessage | String | エラーメッセージ（正常時はnull） |

### レスポンス例（SELECT成功）

```json
{
  "rows": [{ "id": 1, "name": "Alice" }],
  "affectedRows": null,
  "errorMessage": null
}
```

### レスポンス例（DML成功）

```json
{
  "rows": null,
  "affectedRows": 2,
  "errorMessage": null
}
```

### レスポンス例（SQL実行エラー）

```json
{
  "rows": null,
  "affectedRows": null,
  "errorMessage": "ERROR: column \"xyz\" does not exist"
}
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | バリデーションエラー（connectionId・sqlがnull/空文字） | `{"message": "..."}` |
| 500 Internal Server Error | db_editor DBへの接続失敗等（connectionId検索失敗） | `{"message": "..."}` |

---

## 処理フロー

### 1. SqlController.executeSql()

- `@Validated @RequestBody` でSqlExecuteRequestを受け取る（connectionIdのNotNull・sqlのNotBlank）
- SqlUseCaseのexecuteSqlメソッドをconnectionId・sqlを引数に呼び出す
- 返されたSqlExecuteResponseをHTTP200で返す

### 2. SqlUseCase.executeSql()

- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はSqlExecuteResponse.ofError("接続設定が見つかりません: " + connectionId)を返す（例外はスローしない）
- TargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- sql.trim().toUpperCase()の先頭が"SELECT"かどうかで分岐する
  - **SELECTの場合：** queryForListでSELECTを実行し、結果をSqlExecuteResponse.ofSelect(rows)で返す
  - **SELECT以外の場合：** updateでDMLを実行し、影響行数をSqlExecuteResponse.ofDml(affected)で返す
- DataAccessExceptionが発生した場合はSqlExecuteResponse.ofError(e.getMostSpecificCause().getMessage())で返す（HTTP200・errorMessageあり）

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| SqlController | @Validatedバリデーションエラー | Spring MVCがMethodArgumentNotValidExceptionを発生させHTTP400を返す | 400 |
| SqlUseCase | connectionId不存在 | SqlExecuteResponse.ofError()で返す（HTTP200・errorMessageあり） | 200 |
| SqlUseCase | SQL実行エラー（DataAccessException） | SqlExecuteResponse.ofError()で返す（HTTP200・errorMessageあり） | 200 |
| SqlUseCase | db_editor DBへの接続失敗等（DataAccessException以外） | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
