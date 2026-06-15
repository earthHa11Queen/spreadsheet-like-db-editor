# DD02-10 履歴一覧取得API 詳細設計書

- 機能名：テーブル操作機能
- API名：履歴一覧取得API
- メソッド：GET
- パス：/api/tables/{name}/history
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | 履歴一覧取得対象のテーブル名（実テーブル名） |

### クエリパラメータ

| パラメータ名 | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| connectionId | Integer | ✅ | - | 接続設定のPK（n） |
| schema | String | ❌ | public | 対象スキーマ名 |

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

`List<Map<String, Object>>` 形式を返す。各Mapはseq（連番）とsavedAt（保存日時）を持つ。seq降順で返す。件数が0件の場合は空配列を返す。

| フィールド名 | 型 | 説明 |
|---|---|---|
| seq | Integer | 履歴連番 |
| savedAt | Timestamp | 履歴保存日時 |

### レスポンス例

```json
[
  {
    "seq": 3,
    "savedAt": "2026-06-15T10:30:00"
  },
  {
    "seq": 2,
    "savedAt": "2026-06-14T15:00:00"
  },
  {
    "seq": 1,
    "savedAt": "2026-06-13T09:00:00"
  }
]
```

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 500 Internal Server Error | 対象DBへの接続失敗・SQLエラー等 | `{"message": "..."}` |

---

## 処理フロー

### 1. TableController.getHistoryList()

- 前提条件：なし
- パスパラメータ `name`・クエリパラメータ `connectionId`・`schema`（デフォルト"public"）を受け取る
- TableHistoryUseCaseのgetHistoryListメソッドをconnectionId・schema・nameを引数に呼び出す
- 返された `List<Map<String, Object>>` をそのままHTTP200で返す

### 2. TableHistoryUseCase.getHistoryList()

- 前提条件：なし
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- 取得したConnectionSettingエンティティ・schemaName・tableNameをTableHistoryRepositoryのfindHistoryListに渡す
- findHistoryListから返された `List<Map<String, Object>>` をコントローラーに返す

### 3. TableHistoryGateway.findHistoryList()

- 前提条件：なし
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- ensureHistoryIndex(jdbc, schemaName)で履歴インデックステーブル（history_index）を必要に応じて作成する
- 以下のSELECT文をJdbcTemplateで実行する
  - 対象テーブル：`"{schema}"."history_index"`
  - 取得カラム：seq・saved_at
  - WHERE条件：`table_name = ?`（引数のtableName）
  - ORDER BY：seq降順
- 取得結果をstream処理でMapに変換する
  - `"seq"` → row.get("seq")
  - `"savedAt"` → row.get("saved_at")
- 変換後のListをコントローラーに返す（0件の場合は空のList）

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableHistoryUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableHistoryGateway | 対象DBへの接続失敗・SQLエラー等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
