# Spreadsheet-Like DB Editor

PostgreSQLのテーブルをスプレッドシート感覚で直接編集できる、
開発・検証用のセルフホスト型Webアプリです。

## 概要・背景

開発中のWebアプリのデータをpgAdminやDBeaver経由で確認・編集するのは、
操作が煩雑で切り替えコストが高い場面があります。
本アプリはそれをブラウザ上のスプレッドシートUIで解決するために作りました。

特徴は「実テーブルを直接変更しない設計」です。
コピーテーブル方式により、編集ミスによるデータ破壊を防ぎながら、
Ctrl+Sで履歴保存、確認後に本番テーブルへ反映という二段階保存を実現しています。

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

## 技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | TypeScript + React 18 + Vite + MUI + Zustand + Glide Data Grid 6.0.3 |
| バックエンド | Java 17 + Spring Boot 3.2 + Gradle 8.6 |
| DB | PostgreSQL |
| アーキテクチャ | クリーンアーキテクチャ |
| インフラ | Docker / docker-compose |

## システム構成

```text
[ブラウザ (Chrome)]
    ├── :5173  フロントエンド (React + Vite)
    └── :8080  バックエンド (Spring Boot)
                  └── :5432  PostgreSQL (外部コンテナ・db-net経由)
```

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

## ショートカットキー

ショートカットモード（Ctrl+Shift+K でトグル）がONの場合のみ有効。

| キー | 機能 |
|------|------|
| Ctrl+S | メモ保存 or テーブル履歴保存（サイドナビの状態による） |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+M | メモタブ開閉 |
| Ctrl+Q | SQLタブ開閉 |
| Ctrl+J | テーブル選択ドロップダウンにフォーカス |
| Ctrl+Shift+K | ショートカットモード切替（常に有効） |
| F2 | 選択中セルの編集モード開始 |
| Escape | サイドナビを閉じる |

## 画面一覧

| パス | 画面 |
|------|------|
| `/` | 接続先DB選択（トップ） |
| `/connections/settings` | DB接続設定CRUD |
| `/tables/_select` | テーブル未選択状態の編集画面 |
| `/tables/:tableName` | テーブル編集画面（メイン） |
| `/import` | ファイルインポート |
| `/export` | 複数テーブルエクスポート |

## Glide Data Grid 利用上の注意

- `index.html`の`</body>`直前に`<div id="portal"></div>`が必須
- 日本語IME入力はダブルクリックまたはF2/Enterでオーバーレイを開いてから行う
- セル編集は`cellActivationBehavior="double-click"`を使用

## ライセンス

MIT

## 免責事項

本アプリは開発・検証環境での使用を想定しています。
本番環境での利用は自己責任でお願いします。
使用しているOSSライブラリはそれぞれのライセンスに従います。
なお、xlsxライブラリはv0.18.5（Apache 2.0）を使用しています。

## セキュリティについて

### 既知の脆弱性

| ライブラリ | バージョン | CVE | 深刻度 | 備考 |
|-----------|-----------|-----|--------|------|
| xlsx（SheetJS） | 0.18.5 | CVE-2024-22363 | High（7.5） | 開発・検証用途での使用を推奨 |

本アプリは開発・検証環境での使用を想定しています。
不特定多数がアクセスする本番環境での使用は自己責任でお願いします。

脆弱性を発見した場合はIssueではなくGitHub DMにてご連絡ください。


