# Spreadsheet-Like DB Editor

A self-hosted web application for editing PostgreSQL tables directly with a spreadsheet-like UI —
built for development and verification environments.

---

## Overview

Inspecting and editing application data through pgAdmin or DBeaver can be cumbersome
when you're switching contexts frequently during development.
This app solves that by providing a spreadsheet-style interface in the browser.

The key design decision: **the real table is never directly modified.**
A copy-table approach protects against accidental data corruption,
while a two-step save flow (Ctrl+S for history → Apply button for production) keeps changes deliberate and reversible.

---

## Features

- Spreadsheet-style table editing via Glide Data Grid
- **Copy-table approach** — real tables are never directly modified
- **Two-step save**: Ctrl+S saves to history → Apply button commits to the actual DB
- Conflict detection and Diff view for manual resolution (multi-session simultaneous editing support)
- Undo / Redo (edit history)
- Notepad and SQL editor (side navigation, shortcut key support)
- CSV / Spreadsheet (.xlsx) import and export
- Manual column mapping for flexible import into existing tables
- Auto-detection and bulk deletion of residual tables (`copy_` / `backup_` / `history_` prefixes)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | TypeScript + React 18 + Vite + MUI + Zustand + Glide Data Grid 6.0.3 |
| Backend | Java 17 + Spring Boot 3.2 + Gradle 8.6 |
| Database | PostgreSQL |
| Architecture | Clean Architecture |
| Infrastructure | Docker / docker-compose |

---

## System Architecture

```
[Browser (Chrome)]
    ├── :5173  Frontend (React + Vite)
    └── :8080  Backend (Spring Boot)
                  └── :5432  PostgreSQL (external container via db-net)
```

---

## Setup

### Prerequisites

- Docker and docker-compose installed
- A PostgreSQL container connected to the `db-net` network

### Initial Setup

```bash
# 1. Run the DB schema/table creation script (first time only)
# backend/src/main/resources/db/migration/V001__create_app_schema_and_tables.sql

# 2. Update environment variables in docker-compose.yml
# SPRING_DATASOURCE_URL: specify your PostgreSQL container name
# SPRING_DATASOURCE_PASSWORD: specify your password
# VITE_API_URL: specify your backend URL
```

### Start

```bash
docker compose up -d
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080/api/health

---

## Keyboard Shortcuts

Active only when shortcut mode is ON (toggle with Ctrl+Shift+K).

| Key | Function |
|---|---|
| Ctrl+S | Save memo or table history (depends on side nav state) |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+M | Toggle memo tab |
| Ctrl+Q | Toggle SQL tab |
| Ctrl+J | Focus table selection dropdown |
| Ctrl+Shift+K | Toggle shortcut mode (always active) |
| F2 | Start edit mode on selected cell |
| Escape | Close side navigation |

---

## Screens

| Path | Screen |
|---|---|
| `/` | Connection DB selection (top) |
| `/connections/settings` | DB connection settings CRUD |
| `/tables/_select` | Editor with no table selected |
| `/tables/:tableName` | Table editor (main) |
| `/import` | File import |
| `/export` | Multi-table export |

---

## Notes on Glide Data Grid

- A `<div id="portal"></div>` is required just before `</body>` in `index.html`
- Japanese IME input: double-click or press F2/Enter to open an overlay before typing
- Cell editing uses `cellActivationBehavior="double-click"`

---

## License

[MIT](./LICENSE)

---

## Disclaimer

This application is intended for development and verification environments.
Use in production is at your own risk.
OSS libraries used in this project are subject to their respective licenses.
Note: the `xlsx` library uses v0.18.5 (Apache 2.0).

---

## Security

### Known Vulnerabilities

| Library | Version | CVE | Severity | Note |
|---|---|---|---|---|
| xlsx (SheetJS) | 0.18.5 | CVE-2024-22363 | High (7.5) | Recommended for development/verification use only |

This application is designed for development and verification environments.
Use in production environments accessible by unspecified users is at your own risk.

If you discover a vulnerability, please contact via GitHub DM rather than opening an Issue.

---

---

# Spreadsheet-Like DB Editor（日本語）

PostgreSQLのテーブルをスプレッドシート感覚で直接編集できる、開発・検証用のセルフホスト型Webアプリです。

---

## 概要・背景

開発中のWebアプリのデータをpgAdminやDBeaver経由で確認・編集するのは、
操作が煩雑で切り替えコストが高い場面があります。
本アプリはそれをブラウザ上のスプレッドシートUIで解決するために作りました。

特徴は「実テーブルを直接変更しない設計」です。
コピーテーブル方式により、編集ミスによるデータ破壊を防ぎながら、
Ctrl+Sで履歴保存、確認後に本番テーブルへ反映という二段階保存を実現しています。

---

## 主な機能

- Glide Data Gridによるスプレッドシート風テーブル編集
- コピーテーブル方式による安全な編集（実テーブルを直接変更しない）
- 二段階保存：Ctrl+Sで履歴保存 → 更新実行ボタンで実DB反映
- 衝突検知・Diff表示による手動解決（複数セッションでの同時編集対応）
- Undo/Redo（編集履歴）
- メモ帳・SQLエディタ（サイドナビ、ショートカットキー対応）
- CSV/Spreadsheet（.xlsx）インポート・エクスポート
- カラム手動マッピング機能（既存テーブルへの柔軟なインポート）
- 残存テーブル（copy_/backup_/history_）の自動検知・一括削除

---

## 技術スタック

| 領域 | 技術 |
|---|---|
| フロントエンド | TypeScript + React 18 + Vite + MUI + Zustand + Glide Data Grid 6.0.3 |
| バックエンド | Java 17 + Spring Boot 3.2 + Gradle 8.6 |
| DB | PostgreSQL |
| アーキテクチャ | クリーンアーキテクチャ |
| インフラ | Docker / docker-compose |

---

## システム構成

```
[ブラウザ (Chrome)]
    ├── :5173  フロントエンド (React + Vite)
    └── :8080  バックエンド (Spring Boot)
                  └── :5432  PostgreSQL (外部コンテナ・db-net経由)
```

---

## セットアップ

### 前提条件

- Docker・docker-composeがインストール済みであること
- PostgreSQLコンテナが`db-net`ネットワークに接続済みであること

### 初回セットアップ

```bash
# 1. DBスキーマ・テーブル作成（初回のみ）
# backend/src/main/resources/db/migration/V001__create_app_schema_and_tables.sql
# を対象DBで実行する

# 2. docker-compose.ymlの環境変数を自環境に合わせて変更
# SPRING_DATASOURCE_URL: PostgreSQLコンテナ名を指定
# SPRING_DATASOURCE_PASSWORD: パスワードを指定
# VITE_API_URL: バックエンドのURLを指定
```

### 起動

```bash
docker compose up -d
```

- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:8080/api/health

---

## ショートカットキー

ショートカットモード（Ctrl+Shift+K でトグル）がONの場合のみ有効。

| キー | 機能 |
|---|---|
| Ctrl+S | メモ保存 or テーブル履歴保存（サイドナビの状態による） |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+M | メモタブ開閉 |
| Ctrl+Q | SQLタブ開閉 |
| Ctrl+J | テーブル選択ドロップダウンにフォーカス |
| Ctrl+Shift+K | ショートカットモード切替（常に有効） |
| F2 | 選択中セルの編集モード開始 |
| Escape | サイドナビを閉じる |

---

## 画面一覧

| パス | 画面 |
|---|---|
| `/` | 接続先DB選択（トップ） |
| `/connections/settings` | DB接続設定CRUD |
| `/tables/_select` | テーブル未選択状態の編集画面 |
| `/tables/:tableName` | テーブル編集画面（メイン） |
| `/import` | ファイルインポート |
| `/export` | 複数テーブルエクスポート |

---

## Glide Data Grid 利用上の注意

- `index.html`の`</body>`直前に`<div id="portal"></div>`が必須
- 日本語IME入力はダブルクリックまたはF2/Enterでオーバーレイを開いてから行う
- セル編集は`cellActivationBehavior="double-click"`を使用

---

## ライセンス

[MIT](./LICENSE)

---

## 免責事項

本アプリは開発・検証環境での使用を想定しています。
本番環境での利用は自己責任でお願いします。
使用しているOSSライブラリはそれぞれのライセンスに従います。
なお、xlsxライブラリはv0.18.5（Apache 2.0）を使用しています。

---

## セキュリティについて

### 既知の脆弱性

| ライブラリ | バージョン | CVE | 深刻度 | 備考 |
|---|---|---|---|---|
| xlsx（SheetJS） | 0.18.5 | CVE-2024-22363 | High（7.5） | 開発・検証用途での使用を推奨 |

本アプリは開発・検証環境での使用を想定しています。
不特定多数がアクセスする本番環境での使用は自己責任でお願いします。

脆弱性を発見した場合はIssueではなくGitHub DMにてご連絡ください。
