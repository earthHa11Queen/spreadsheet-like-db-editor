import { create } from 'zustand';
import apiClient from '../../adapter/api/axiosInstance';
import { tableApi } from '../../adapter/api/tableApi';

export type RowData = Record<string, unknown>;

export interface HistoryEntry {
  seq: number;
  savedAt: string;
}

interface TableEditState {
  /** 現在編集中のテーブル名 */
  tableName: string | null;
  /** カラム名一覧 */
  columns: string[];
  /** 編集中のレコード */
  rows: RowData[];
  /** 読み込み中 */
  loading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 編集済みフラグ */
  dirty: boolean;
  /** 保存中フラグ */
  saving: boolean;
  /** トースト通知メッセージ */
  toastMessage: string | null;
  /** トースト種別 */
  toastSeverity: 'success' | 'error';
  /** 保存済み履歴一覧（seq降順） */
  historyList: HistoryEntry[];
  /** 現在表示中の履歴インデックス（historyList上のindex。-1=最新編集中） */
  historyPointer: number;
  /** 衝突検知結果（null=未チェック） */
  conflictDetected: boolean | null;
  /** 衝突Diff行一覧 */
  conflictDiff: Record<string, unknown>[];
  /** 反映処理中フラグ */
  applying: boolean;
  /** 残存テーブル一覧（copy_/backup_/history_） */
  staleTables: string[];

  /** テーブルデータをロード（コピーテーブル作成→読み込み） */
  loadTable: (connectionId: number, tableName: string) => Promise<void>;
  /** 残存テーブル一覧を取得 */
  fetchStaleTables: (connectionId: number) => Promise<void>;
  /** 残存テーブルを削除 */
  dropStaleTable: (connectionId: number, tableName: string) => Promise<void>;
  /** 残存テーブル一覧をクリア */
  clearStaleTables: () => void;
  /** セル編集 */
  updateCell: (rowIndex: number, column: string, value: unknown) => void;
  /** 行追加 */
  addRow: () => void;
  /** 行削除 */
  deleteRow: (rowIndex: number) => void;
  /** dirtyフラグリセット */
  clearDirty: () => void;
  /** 編集履歴保存（Ctrl+S） */
  saveHistory: (connectionId: number) => Promise<void>;
  /** 一つ前の履歴に戻る（Ctrl+Z） */
  undo: (connectionId: number) => Promise<void>;
  /** 一つ先の履歴に進む（Ctrl+Y） */
  redo: (connectionId: number) => Promise<void>;
  /** バックアップ作成→衝突検知を実行し結果をストアに格納 */
  checkConflict: (connectionId: number) => Promise<void>;
  /** 衝突なしで実テーブルに反映 */
  applyToReal: (connectionId: number) => Promise<void>;
  /** 衝突状態をリセット */
  clearConflict: () => void;
  /** 衝突解決: 選択結果をコピーテーブルに書き戻し再反映 */
  resolveConflict: (connectionId: number, resolvedRows: Record<string, unknown>[]) => Promise<void>;
  /** DBから再取得してコピーテーブルを再作成（リフレッシュ） */
  refreshTable: (connectionId: number) => Promise<void>;
  /** トーストを閉じる */
  clearToast: () => void;
}

export const useTableEditStore = create<TableEditState>((set, get) => ({
  tableName: null,
  columns: [],
  rows: [],
  loading: false,
  error: null,
  dirty: false,
  saving: false,
  toastMessage: null,
  toastSeverity: 'success',
  historyList: [],
  historyPointer: -1,
  conflictDetected: null,
  conflictDiff: [],
  applying: false,
  staleTables: [],

  loadTable: async (connectionId: number, tableName: string) => {
    set({ loading: true, error: null, dirty: false, tableName, historyList: [], historyPointer: -1 });
    try {
      const records = await tableApi.createCopy(connectionId, tableName);
      const columns = records.length > 0 ? Object.keys(records[0]) : [];
      // テーブルロード時に既存の履歴一覧も取得
      const historyList = await tableApi.getHistoryList(connectionId, tableName).catch(() => []);
      set({
        columns,
        rows: records as RowData[],
        loading: false,
        historyList,
        historyPointer: -1,
      });
      // ロード後に残存テーブルを非同期取得
      tableApi.getStaleTables(connectionId).then((stale) => set({ staleTables: stale })).catch(() => {});
    } catch {
      set({ error: 'テーブルデータの読み込みに失敗しました', loading: false });
    }
  },

  updateCell: (rowIndex: number, column: string, value: unknown) => {
    const rows = [...get().rows];
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    rows[rowIndex] = { ...rows[rowIndex], [column]: value };
    // 環境依存文字の検知（制御文字・特殊スペース）
    if (typeof value === 'string' && /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u3000\uFEFF]/.test(value)) {
      set({ rows, dirty: true, toastMessage: '環境依存文字（制御文字・全角スペース等）が含まれています', toastSeverity: 'error' });
      return;
    }
    set({ rows, dirty: true });
  },

  addRow: () => {
    const { columns, rows } = get();
    const newRow: RowData = {};
    columns.forEach((col) => {
      newRow[col] = null;
    });
    set({ rows: [...rows, newRow], dirty: true });
  },

  deleteRow: (rowIndex: number) => {
    const rows = get().rows.filter((_, i) => i !== rowIndex);
    set({ rows, dirty: true });
  },

  clearDirty: () => set({ dirty: false }),

  saveHistory: async (connectionId: number) => {
    const { tableName, rows, saving } = get();
    if (!tableName || saving) return;
    set({ saving: true });
    try {
      const result = await tableApi.saveHistory(
        connectionId,
        tableName,
        rows as Record<string, unknown>[],
      );
      // 保存後に履歴一覧を再取得してポインタを最新（先頭=0）に設定
      const historyList = await tableApi.getHistoryList(connectionId, tableName).catch(() => []);
      set({
        saving: false,
        dirty: false,
        historyList,
        historyPointer: 0,
        toastMessage: `履歴 #${result.seq} として保存しました`,
        toastSeverity: 'success',
      });
    } catch {
      set({
        saving: false,
        toastMessage: '保存に失敗しました',
        toastSeverity: 'error',
      });
    }
  },

  undo: async (connectionId: number) => {
    const { tableName, historyList, historyPointer, saving } = get();
    if (!tableName || saving || historyList.length === 0) return;
    // pointer=-1（最新編集中）→ 0（最新保存済み）、0→1（一つ前）…
    const nextPointer = historyPointer + 1;
    if (nextPointer >= historyList.length) return;
    set({ saving: true });
    try {
      const seq = historyList[nextPointer].seq;
      const records = await tableApi.restoreHistory(connectionId, tableName, seq);
      const columns = records.length > 0 ? Object.keys(records[0]) : get().columns;
      set({
        rows: records as RowData[],
        columns,
        historyPointer: nextPointer,
        dirty: false,
        saving: false,
        toastMessage: `履歴 #${seq} に戻りました`,
        toastSeverity: 'success',
      });
    } catch {
      set({ saving: false, toastMessage: 'Undoに失敗しました', toastSeverity: 'error' });
    }
  },

  redo: async (connectionId: number) => {
    const { tableName, historyList, historyPointer, saving } = get();
    if (!tableName || saving || historyPointer <= 0) return;
    const nextPointer = historyPointer - 1;
    set({ saving: true });
    try {
      const seq = historyList[nextPointer].seq;
      const records = await tableApi.restoreHistory(connectionId, tableName, seq);
      const columns = records.length > 0 ? Object.keys(records[0]) : get().columns;
      set({
        rows: records as RowData[],
        columns,
        historyPointer: nextPointer,
        dirty: false,
        saving: false,
        toastMessage: `履歴 #${seq} に進みました`,
        toastSeverity: 'success',
      });
    } catch {
      set({ saving: false, toastMessage: 'Redoに失敗しました', toastSeverity: 'error' });
    }
  },

  clearToast: () => set({ toastMessage: null }),

  fetchStaleTables: async (connectionId: number) => {
    const stale = await tableApi.getStaleTables(connectionId).catch(() => []);
    set({ staleTables: stale });
  },

  dropStaleTable: async (connectionId: number, tableName: string) => {
    await tableApi.dropStaleTable(connectionId, tableName);
    const stale = await tableApi.getStaleTables(connectionId).catch(() => []);
    set({ staleTables: stale });
  },

  clearStaleTables: () => set({ staleTables: [] }),

  checkConflict: async (connectionId: number) => {
    const { tableName, applying } = get();
    if (!tableName || applying) return;
    set({ applying: true, conflictDetected: null, conflictDiff: [] });
    try {
      // バックアップ作成
      await tableApi.createBackup(connectionId, tableName);
      // 衝突検知
      const { conflict } = await tableApi.conflictCheck(connectionId, tableName);
      if (conflict) {
        // 衝突あり → Diff取得してストアに格納
        const diff = await tableApi.conflictDiff(connectionId, tableName);
        set({ applying: false, conflictDetected: true, conflictDiff: diff });
      } else {
        set({ applying: false, conflictDetected: false });
      }
    } catch {
      set({
        applying: false,
        toastMessage: '衝突検知に失敗しました',
        toastSeverity: 'error',
      });
    }
  },

  applyToReal: async (connectionId: number) => {
    const { tableName, applying } = get();
    if (!tableName || applying) return;
    set({ applying: true });
    try {
      // コピーテーブルを実テーブルに反映（バックアップは checkConflict 時点で作成済み）
      await tableApi.createBackup(connectionId, tableName);
      const { conflict } = await tableApi.conflictCheck(connectionId, tableName);
      if (conflict) {
        const diff = await tableApi.conflictDiff(connectionId, tableName);
        set({ applying: false, conflictDetected: true, conflictDiff: diff,
              toastMessage: '衝突が検出されました。Diffを確認してください',
              toastSeverity: 'error' });
        return;
      }
      // 衝突なし → 実テーブルに反映
      await apiClient.post(`/api/tables/${tableName}/apply`, {
        connectionId,
        schemaName: 'public',
      });
      set({
        applying: false,
        dirty: false,
        conflictDetected: null,
        conflictDiff: [],
        toastMessage: '実DBに反映しました',
        toastSeverity: 'success',
      });
    } catch {
      set({
        applying: false,
        toastMessage: 'DB反映に失敗しました',
        toastSeverity: 'error',
      });
    }
  },

  clearConflict: () => set({ conflictDetected: null, conflictDiff: [] }),

  refreshTable: async (connectionId: number) => {
    const { tableName } = get();
    if (!tableName) return;
    set({ loading: true, error: null });
    try {
      const records = await tableApi.createCopy(connectionId, tableName);
      const columns = records.length > 0 ? Object.keys(records[0]) : [];
      const historyList = await tableApi.getHistoryList(connectionId, tableName).catch(() => []);
      set({
        columns,
        rows: records as RowData[],
        loading: false,
        dirty: false,
        historyList,
        historyPointer: -1,
        conflictDetected: null,
        conflictDiff: [],
        toastMessage: 'DBから最新データを取得しました',
        toastSeverity: 'success',
      });
    } catch {
      set({ loading: false, toastMessage: 'リフレッシュに失敗しました', toastSeverity: 'error' });
    }
  },

  resolveConflict: async (connectionId: number, resolvedRows: Record<string, unknown>[]) => {
    const { tableName } = get();
    if (!tableName) return;
    set({ applying: true });
    try {
      // 解決結果をコピーテーブルに書き戻す
      await tableApi.updateCopyRecords(connectionId, tableName, resolvedRows);
      // 再度衝突なしで実テーブルに反映
      await apiClient.post(`/api/tables/${tableName}/apply`, {
        connectionId,
        schemaName: 'public',
      });
      set({
        rows: resolvedRows as RowData[],
        applying: false,
        dirty: false,
        conflictDetected: null,
        conflictDiff: [],
        toastMessage: '衝突を解決し実DBに反映しました',
        toastSeverity: 'success',
      });
    } catch {
      set({
        applying: false,
        toastMessage: '衝突解決に失敗しました',
        toastSeverity: 'error',
      });
    }
  },
}));
