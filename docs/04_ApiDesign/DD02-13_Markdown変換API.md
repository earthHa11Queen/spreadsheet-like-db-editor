# DD02-13 Markdown変換API 詳細設計書

- 機能名：テーブル操作機能
- API名：Markdown変換API
- メソッド：GET
- パス：/api/tables/{name}/markdown
- 対応コントローラー：ExportController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | Markdown変換対象のテーブル名 |

### クエリパラメータ

| パラメータ名 | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| connectionId | Integer | ✅ | - | 接続設定のPK（n） |
| schema | String | ❌ | public | 対象スキーマ名 |

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

Markdownファイルとしてバイナリレスポンスを返す。

| 項目 | 値 |
|---|---|
| Content-Type | text/markdown; charset=UTF-8 |
| Content-Disposition | `attachment; filename="{tableName}_{yyyyMMdd_HHmmss}.md"` |

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 400 Bad Request | テーブル名・スキーマ名に不正な文字が含まれる | `{"message": "不正なテーブル名またはスキーマ名です: ..."}` |
| 500 Internal Server Error | 対象DBへの接続失敗・SQLエラー等 | `{"message": "..."}` |

---

## 処理フロー

### 1. ExportController.markdown()

- 前提条件：なし
- パスパラメータ `name`・クエリパラメータ `connectionId`・`schema`（デフォルト"public"）を受け取る
- タイムスタンプを `yyyyMMdd_HHmmss` フォーマットで取得する
- ExportUseCaseのexportMarkdownメソッドをconnectionId・schema・nameを引数に呼び出す
- ファイル名：`{name}_{timestamp}.md`
- Content-Type：`text/markdown; charset=UTF-8`
- Content-Disposition：`attachment; filename="{ファイル名}"`
- HTTP200とbyte[]をレスポンスとして返す

### 2. ExportUseCase.exportMarkdown()

- DD02-12「テーブルエクスポートAPI」の「4. ExportUseCase.exportMarkdown()」と同一の処理。
- TableRecordUseCaseのgetAllRecordsメソッドで対象テーブルの全レコードを取得する
- Markdown形式の文字列を組み立ててUTF-8エンコードのbyte[]を返す

**DD02-12との違い：** DD02-12はformat指定によってCSV/Excel/Markdownを切り替えるAPIであるのに対し、本APIはMarkdown形式に特化したエンドポイントであり、ExportController内で直接exportMarkdownを呼び出す。内部処理は同一のExportUseCase.exportMarkdown()を使用する。

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableRecordUseCase（getAllRecords内） | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordGateway（getAllRecords内） | テーブル名・スキーマ名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordGateway（getAllRecords内） | 対象DBへの接続失敗・SQLエラー等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
