import { create } from 'zustand';
import type { TableMetadata } from '../../domain/tableTypes';
import { tableApi } from '../../adapter/api/tableApi';

interface HeaderState {
  /** ヘッダー表示/非表示 */
  visible: boolean;
  /** ヘッダー固定ON/OFF（OFFだと操作後に自動で閉じる） */
  pinned: boolean;
  /** ショートカットキーモード ON=アプリ専用 / OFF=ブラウザ標準 */
  shortcutMode: boolean;
  /** テーブル一覧 */
  tables: TableMetadata[];
  /** ドロップダウンで選択中のテーブル名 */
  selectedTable: string | null;
  /** テーブル一覧読込中 */
  loadingTables: boolean;
  /** Ctrl+J でフォーカスを当てるためのコールバック（Header が登録） */
  focusHeaderCallback: (() => void) | null;

  toggleVisible: () => void;
  setVisible: (v: boolean) => void;
  togglePinned: () => void;
  toggleShortcutMode: () => void;
  fetchTables: (connectionId: number) => Promise<void>;
  setSelectedTable: (name: string | null) => void;
  /** Ctrl+J: ヘッダーを開いてフォーカスを当てる */
  focusHeader: () => void;
  /** Header コンポーネントがフォーカスコールバックを登録する */
  setFocusHeaderCallback: (cb: () => void) => void;
}

export const useHeaderStore = create<HeaderState>((set, get) => ({
  visible: true,
  pinned: true,
  shortcutMode: false,
  tables: [],
  selectedTable: null,
  loadingTables: false,
  focusHeaderCallback: null,

  toggleVisible: () => set((s) => ({ visible: !s.visible })),
  setVisible: (v) => set({ visible: v }),
  togglePinned: () => set((s) => ({ pinned: !s.pinned })),
  toggleShortcutMode: () => set((s) => ({ shortcutMode: !s.shortcutMode })),

  focusHeader: () => {
    set({ visible: true });
    get().focusHeaderCallback?.();
  },
  setFocusHeaderCallback: (cb) => set({ focusHeaderCallback: cb }),

  fetchTables: async (connectionId: number) => {
    set({ loadingTables: true });
    try {
      const tables = await tableApi.getTables(connectionId);
      set({ tables, loadingTables: false });
    } catch {
      set({ tables: [], loadingTables: false });
    }
  },

  setSelectedTable: (name) => set({ selectedTable: name }),
}));
