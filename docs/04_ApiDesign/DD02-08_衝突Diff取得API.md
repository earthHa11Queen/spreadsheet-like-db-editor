# DD02-08 衝突Diff取得API 詳細設計書

- 機能名：テーブル操作機能
- API名：衝突Diff取得API
- メソッド：POST
- パス：/api/tables/{name}/conflict-diff
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | 差分取得対象のテーブル名（実テーブル名） |

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

`List<Map<String, Object>>` 形式を返す。各Mapには先頭に `side` フィールドが付加されており、`"before"` はバックアップ側の行、`"after"` は実テーブル側の行を示す。差分がない場合は空配列を返す。

### レスポンス例

```json
[
  {
    "side": "before",
    "id": 2,
    "name": "Bob",
    "created_at": "2026-02-15T14:30:00"
  },
  {
    "side": "after",
    "id": 2,
    "name": "Bob Updated",
    "created_at": "2026-02-15T14:30:00"
  }
]
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

### 1. TableController.conflictDiff()

- 前提条件：バックアップテーブルが事前に作成されていること（DD02-05参照）
- パスパラメータ `name` を受け取る
- リクエストボディをConflictCheckRequestとして受け取る
- `@Validated`アノテーションによりバリデーションチェックを実施する（connectionIdのNotNull）
- バリデーションエラーが発生した場合はHTTP400を返し後続処理を行わない
- request.getSchemaName()がnullの場合は"public"をschemaとして使用する
- ConflictUseCaseのcalcDiffメソッドをconnectionId・schema・nameを引数に呼び出す
- 返された `List<Map<String, Object>>` をそのままHTTP200で返す

### 2. ConflictUseCase.calcDiff()

- 前提条件：なし
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- 取得したConnectionSettingエンティティ・schemaName・tableNameをTableConflictRepositoryのcalcDiffに渡す
- calcDiffから返された `List<Map<String, Object>>` をコントローラーに返す

### 3. TableConflictGateway.calcDiff()

- 前提条件：バックアップテーブルが存在すること
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- TableNameValidator.quoted(schemaName, tableName)で実テーブルのSQL安全名を生成する
- TableNameValidator.quotedBackup(schemaName, tableName)でバックアップテーブルのSQL安全名を生成する
- 以下の2つのSELECT（EXCEPT）でそれぞれ差分行を取得する
  - バックアップのみに存在する行（変更前の状態）：`SELECT * FROM backup EXCEPT SELECT * FROM real`
  - 実テーブルのみに存在する行（変更後の状態）：`SELECT * FROM real EXCEPT SELECT * FROM backup`
- バックアップのみに存在する行のMapにキー`"side" = "before"`を追加してresultに追加する
- 実テーブルのみに存在する行のMapにキー`"side" = "after"`を追加してresultに追加する
- resultをコントローラーに返す
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる

**sideフィールドの意味：**
- `"before"`：バックアップ作成時点の行。実テーブルから既に変更・削除されている状態
- `"after"`：現在の実テーブルにある行。バックアップ以降に追加・変更された状態

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableController | @Validatedバリデーションエラー（connectionIdがnull） | Spring MVCがMethodArgumentNotValidExceptionを発生させHTTP400を返す | 400 |
| ConflictUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableConflictGateway | テーブル名・スキーマ名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableConflictGateway | バックアップテーブル未存在・対象DBへの接続失敗等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
