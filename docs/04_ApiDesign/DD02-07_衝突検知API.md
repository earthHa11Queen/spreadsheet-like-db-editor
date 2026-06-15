# DD02-07 衝突検知API 詳細設計書

- 機能名：テーブル操作機能
- API名：衝突検知API
- メソッド：POST
- パス：/api/tables/{name}/conflict-check
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | 衝突検知対象のテーブル名（実テーブル名） |

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

| フィールド名 | 型 | 説明 |
|---|---|---|
| conflict | boolean | 衝突が検知された場合はtrue、なければfalse |

### レスポンス例（衝突あり）

```json
{
  "conflict": true
}
```

### レスポンス例（衝突なし）

```json
{
  "conflict": false
}
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | バリデーションエラー（connectionIdがnull） | `{"message": "..."}` |
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 400 Bad Request | テーブル名・スキーマ名に不正な文字が含まれる | `{"message": "不正なテーブル名またはスキーマ名です: ..."}` |
| 500 Internal Server Error | 対象DBへの接続失敗・バックアップテーブル未存在等 | `{"message": "..."}` |

---

## 処理フロー

### 1. TableController.conflictCheck()

- 前提条件：バックアップテーブルが事前に作成されていること（DD02-05参照）
- パスパラメータ `name` を受け取る
- リクエストボディをConflictCheckRequestとして受け取る
- `@Validated`アノテーションによりバリデーションチェックを実施する（connectionIdのNotNull）
- バリデーションエラーが発生した場合はHTTP400を返し後続処理を行わない
- request.getSchemaName()がnullの場合は"public"をschemaとして使用する
- ConflictUseCaseのhasConflictメソッドをconnectionId・schema・nameを引数に呼び出す
- boolean値をConflictCheckResponse（conflict）に詰めてHTTP200で返す

### 2. ConflictUseCase.hasConflict()

- 前提条件：なし
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- 取得したConnectionSettingエンティティ・schemaName・tableNameをTableConflictRepositoryのhasConflictに渡す
- hasConflictの戻り値（boolean）をコントローラーに返す

### 3. TableConflictGateway.hasConflict()

- 前提条件：バックアップテーブルが存在すること
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- TableNameValidator.quoted(schemaName, tableName)で実テーブルのSQL安全名を生成する
- TableNameValidator.quotedBackup(schemaName, tableName)でバックアップテーブルのSQL安全名を生成する
- 以下のEXCEPT SQLで差分行を検出する
  ```sql
  SELECT COUNT(*) FROM (
    SELECT * FROM "{schema}"."backup_{name}" EXCEPT SELECT * FROM "{schema}"."{name}"
    UNION ALL
    SELECT * FROM "{schema}"."{name}" EXCEPT SELECT * FROM "{schema}"."backup_{name}"
  ) diff
  ```
- 差分行数が1件以上の場合はtrue、0件の場合はfalseを返す
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる（バックアップテーブル未存在の場合も同様）

**衝突の定義：**
バックアップ作成時点の実テーブルの内容と現在の実テーブルの内容に差異がある場合を「衝突」と定義する。コピーテーブルへの編集期間中に別プロセスが実テーブルを更新したケースを検知するために使用する。

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableController | @Validatedバリデーションエラー（connectionIdがnull） | Spring MVCがMethodArgumentNotValidExceptionを発生させHTTP400を返す | 400 |
| ConflictUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableConflictGateway | テーブル名・スキーマ名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableConflictGateway | バックアップテーブル未存在・対象DBへの接続失敗等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
