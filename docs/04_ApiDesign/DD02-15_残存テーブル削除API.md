# DD02-15 残存テーブル削除API 詳細設計書

- 機能名：テーブル操作機能
- API名：残存テーブル削除API
- メソッド：DELETE
- パス：/api/tables/stale
- 対応コントローラー：TableController
- 作成日：2026-06-15

---

## リクエスト仕様

### クエリパラメータ

| パラメータ名 | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| connectionId | Integer | ✅ | - | 接続設定のPK（n） |
| tableName | String | ✅ | - | 削除対象のテーブル名（`copy_`・`backup_`・`history_`プレフィックス必須） |
| schema | String | ❌ | public | 対象スキーマ名 |

### リクエストボディ

なし

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

レスポンスボディなし

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 400 Bad Request | tableNameが`copy_`・`backup_`・`history_`以外のプレフィックスを持つ | `{"message": "削除対象は copy_ / backup_ / history_ プレフィックスのテーブルのみです: {tableName}"}` |
| 500 Internal Server Error | 対象DBへの接続失敗・SQLエラー等 | `{"message": "..."}` |

---

## 処理フロー

### 1. TableController.dropStaleTable()

- 前提条件：なし
- クエリパラメータ `connectionId`・`tableName`・`schema`（デフォルト"public"）を受け取る
- TableRecordUseCaseのdropStaleTableメソッドをconnectionId・schema・tableNameを引数に呼び出す
- HTTP200（レスポンスボディなし）を返す

### 2. TableRecordUseCase.dropStaleTable()

- 前提条件：なし
- tableNameが`copy_`・`backup_`・`history_`のいずれかで始まらない場合はIllegalArgumentExceptionをスローする
  - メッセージ：`"削除対象は copy_ / backup_ / history_ プレフィックスのテーブルのみです: " + tableName`
- ConnectionSettingRepositoryのfindByIdでconnectionIdに対応する接続設定を取得する
- findByIdがOptional.empty()の場合はIllegalArgumentExceptionをスローする
- 取得したConnectionSettingエンティティ・schemaName・tableNameをTableRecordRepositoryのdropTableに渡す

### 3. TableRecordGateway.dropTable()

- 前提条件：tableNameのプレフィックスチェックが完了していること
- ConnectionSettingエンティティをもとにTargetDatabaseConnector.createJdbcTemplateで対象DBへのJdbcTemplateを生成する
- `DROP TABLE IF EXISTS "{schemaName}"."{tableName}"` を実行する
  - テーブルが存在しない場合は `IF EXISTS` により正常終了する
  - schemaNameとtableNameはダブルクォートで囲んで使用する（注：本処理ではTableNameValidatorは使用しない）
- SQL実行時にエラーが発生した場合はRuntimeExceptionがスローされる
- 戻り値はなし（void）

**安全ガードについて：**
UseCaseレイヤでプレフィックスチェックを行うことで、実テーブルや管理テーブルの誤削除を防止する。`copy_`・`backup_`・`history_`プレフィックス以外のテーブルは一切削除できない。

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableRecordUseCase | プレフィックス違反のテーブル名 | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordUseCase | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordGateway | 対象DBへの接続失敗・SQLエラー等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
