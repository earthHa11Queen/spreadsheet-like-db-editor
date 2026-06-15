# DD02-12 テーブルエクスポートAPI 詳細設計書

- 機能名：テーブル操作機能
- API名：テーブルエクスポートAPI
- メソッド：GET
- パス：/api/tables/{name}/export
- 対応コントローラー：ExportController
- 作成日：2026-06-15

---

## リクエスト仕様

### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | String | ✅ | エクスポート対象のテーブル名 |

### クエリパラメータ

| パラメータ名 | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| connectionId | Integer | ✅ | - | 接続設定のPK（n） |
| format | String | ❌ | csv | 出力形式。`csv`・`excel`・`markdown`（`md`）のいずれか |
| schema | String | ❌ | public | 対象スキーマ名 |

---

## レスポンス仕様

### 正常時（HTTP 200 OK）

バイナリファイルとしてレスポンスを返す。Content-Dispositionヘッダにファイル名を含む。

| format値 | Content-Type | ファイル名形式 | 備考 |
|---|---|---|---|
| csv（デフォルト） | text/csv; charset=UTF-8 | `{tableName}_{yyyyMMdd_HHmmss}.csv` | BOM付きUTF-8 |
| excel | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | `{tableName}_{yyyyMMdd_HHmmss}.xlsx` | EasyExcel使用 |
| markdown / md | text/markdown; charset=UTF-8 | `{tableName}_{yyyyMMdd_HHmmss}.md` | UTF-8 |

### エラー時

| HTTPステータス | 発生条件 | レスポンスボディ例 |
|---|---|---|
| 400 Bad Request | connectionIdに対応する接続設定が存在しない | `{"message": "接続設定が見つかりません: n=99"}` |
| 400 Bad Request | テーブル名・スキーマ名に不正な文字が含まれる | `{"message": "不正なテーブル名またはスキーマ名です: ..."}` |
| 500 Internal Server Error | 対象DBへの接続失敗・ファイル生成エラー等 | `{"message": "..."}` |

---

## 処理フロー

### 1. ExportController.export()

- 前提条件：なし
- パスパラメータ `name`・クエリパラメータ `connectionId`・`format`（デフォルト"csv"）・`schema`（デフォルト"public"）を受け取る
- タイムスタンプを `yyyyMMdd_HHmmss` フォーマットで取得する
- format.toLowerCase()でswitch分岐する

  **excel の場合：**
  - ExportUseCaseのexportExcelメソッドをconnectionId・schema・nameを引数に呼び出す
  - ファイル名：`{name}_{timestamp}.xlsx`
  - Content-Type：`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - Content-Disposition：`attachment; filename="{ファイル名}"`

  **markdown / md の場合：**
  - ExportUseCaseのexportMarkdownメソッドをconnectionId・schema・nameを引数に呼び出す
  - ファイル名：`{name}_{timestamp}.md`
  - Content-Type：`text/markdown; charset=UTF-8`

  **それ以外（デフォルトcsv）：**
  - ExportUseCaseのexportCsvメソッドをconnectionId・schema・nameを引数に呼び出す
  - ファイル名：`{name}_{timestamp}.csv`
  - Content-Type：`text/csv; charset=UTF-8`

- HTTP200とbyte[]をレスポンスとして返す

### 2. ExportUseCase.exportCsv()

- 前提条件：なし
- TableRecordUseCaseのgetAllRecordsメソッドで対象テーブルの全レコードを取得する
- レコードが空の場合はBOM（0xEF 0xBB 0xBF）のみのbyte[]を返す
- records.get(0).keySet()からカラム一覧を取得する
- ByteArrayOutputStreamにBOM → ヘッダ行 → データ行の順でCSV形式で書き込む
  - カンマ・ダブルクォート・改行を含む値はダブルクォートで囲みエスケープする（RFC 4180準拠）
  - 行末は`\r\n`を使用する
- 書き込み済みbyte[]を返す

### 3. ExportUseCase.exportExcel()

- 前提条件：なし
- TableRecordUseCaseのgetAllRecordsメソッドで対象テーブルの全レコードを取得する
- EasyExcelを使用してByteArrayOutputStreamに書き込む
  - シート名：tableName
  - 1行目：カラム名（ヘッダ行）
  - 2行目以降：レコードデータ（値はすべてString変換。nullは空文字）
- 書き込み済みbyte[]を返す

### 4. ExportUseCase.exportMarkdown()

- 前提条件：なし
- TableRecordUseCaseのgetAllRecordsメソッドで対象テーブルの全レコードを取得する
- 以下のMarkdown形式で文字列を組み立てる
  - 1行目：`# {tableName}`
  - レコードが空の場合：`*データなし*`
  - ヘッダ行：`| col1 | col2 | ...`
  - 区切り行：`| --- | --- | ...`
  - データ行：各レコードの値（nullは空文字、`|` を含む値は `\|` にエスケープ）
- UTF-8エンコードのbyte[]を返す

---

## エラーハンドリング一覧

| 発生箇所 | エラー内容 | 処理 | HTTPステータス |
|---|---|---|---|
| TableRecordUseCase（getAllRecords内） | findByIdがOptional.empty()（接続設定不存在） | IllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordGateway（getAllRecords内） | テーブル名・スキーマ名の不正文字 | TableNameValidator.validateがIllegalArgumentExceptionをスローしGlobalExceptionHandlerがHTTP400を返す | 400 |
| TableRecordGateway（getAllRecords内） | 対象DBへの接続失敗・SQLエラー等 | RuntimeExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
| ExportUseCase | Excel/CSV書き込み時のIOException | IOExceptionがスローされGlobalExceptionHandlerがHTTP500を返す | 500 |
