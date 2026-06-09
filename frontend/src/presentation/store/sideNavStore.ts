import { create } from 'zustand';
import { memoApi, sqlApi, templateApi, SqlSummary, TemplateItem } from '../../adapter/api/memoApi';

type SideNavTab = 'memo' | 'sql';

interface SideNavState {
  open: boolean;
  tab: SideNavTab;
  memoContent: string;
  memoSaving: boolean;
  sqlContent: string;
  sqlList: SqlSummary[];
  sqlExecuting: boolean;
  sqlResult: { rows: Record<string, unknown>[] | null; affectedRows: number | null; errorMessage: string | null } | null;
  memoTemplates: TemplateItem[];
  sqlTemplates: TemplateItem[];
  toastMessage: string | null;
  toastSeverity: 'success' | 'error';

  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setTab: (tab: SideNavTab) => void;
  setMemoContent: (content: string) => void;
  setSqlContent: (content: string) => void;

  loadMemo: (connectionId: number, tableName: string) => Promise<void>;
  saveMemo: (connectionId: number, tableName: string) => Promise<void>;
  loadSqlList: (connectionId: number) => Promise<void>;
  loadSqlById: (id: number) => Promise<void>;
  saveSql: (connectionId: number, title: string) => Promise<void>;
  executeSql: (connectionId: number) => Promise<void>;
  downloadMemo: (connectionId: number, tableName: string) => Promise<void>;
  downloadSql: (id: number) => Promise<void>;
  loadMemoTemplates: () => Promise<void>;
  saveMemoTemplate: (title: string, content: string) => Promise<void>;
  deleteMemoTemplate: (n: number) => Promise<void>;
  loadSqlTemplates: () => Promise<void>;
  saveSqlTemplate: (title: string, content: string) => Promise<void>;
  deleteSqlTemplate: (n: number) => Promise<void>;
  applyMemoTemplate: (content: string) => void;
  applySqlTemplate: (content: string) => void;
  clearToast: () => void;
}

export const useSideNavStore = create<SideNavState>((set, get) => ({
  open: false,
  tab: 'memo',
  memoContent: '',
  memoSaving: false,
  sqlContent: '',
  sqlList: [],
  sqlExecuting: false,
  sqlResult: null,
  memoTemplates: [],
  sqlTemplates: [],
  toastMessage: null,
  toastSeverity: 'success',

  toggleOpen: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  setTab: (tab) => set({ tab }),
  setMemoContent: (content) => set({ memoContent: content }),
  setSqlContent: (content) => set({ sqlContent: content }),

  loadMemo: async (connectionId, tableName) => {
    try {
      const res = await memoApi.getMemo(connectionId, tableName);
      set({ memoContent: res.content });
    } catch {
      set({ toastMessage: 'メモの読み込みに失敗しました', toastSeverity: 'error' });
    }
  },

  saveMemo: async (connectionId, tableName) => {
    set({ memoSaving: true });
    try {
      await memoApi.saveMemo(connectionId, tableName, get().memoContent);
      set({ memoSaving: false, toastMessage: 'メモを保存しました', toastSeverity: 'success' });
    } catch {
      set({ memoSaving: false, toastMessage: 'メモの保存に失敗しました', toastSeverity: 'error' });
    }
  },

  loadSqlList: async (connectionId) => {
    try {
      const list = await sqlApi.listSql(connectionId);
      set({ sqlList: list });
    } catch {
      set({ toastMessage: 'SQL一覧の読み込みに失敗しました', toastSeverity: 'error' });
    }
  },

  loadSqlById: async (id) => {
    try {
      const sql = await sqlApi.getSql(id);
      set({ sqlContent: sql.content ?? '' });
    } catch {
      set({ toastMessage: 'SQLの読み込みに失敗しました', toastSeverity: 'error' });
    }
  },

  saveSql: async (connectionId, title) => {
    try {
      const saved = await sqlApi.saveSql(connectionId, title, get().sqlContent);
      const list = await sqlApi.listSql(connectionId);
      set({ sqlList: list, toastMessage: `「${saved.title}」を保存しました`, toastSeverity: 'success' });
    } catch {
      set({ toastMessage: 'SQLの保存に失敗しました', toastSeverity: 'error' });
    }
  },

  executeSql: async (connectionId) => {
    set({ sqlExecuting: true, sqlResult: null });
    try {
      const result = await sqlApi.executeSql(connectionId, get().sqlContent);
      set({ sqlExecuting: false, sqlResult: result });
    } catch {
      set({ sqlExecuting: false, toastMessage: 'SQL実行に失敗しました', toastSeverity: 'error' });
    }
  },

  downloadMemo: async (connectionId, tableName) => {
    try {
      const blob = await memoApi.downloadMemo(connectionId, tableName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memo_${tableName}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      set({ toastMessage: 'メモのダウンロードに失敗しました', toastSeverity: 'error' });
    }
  },

  downloadSql: async (id) => {
    try {
      const blob = await sqlApi.downloadSql(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sql_${id}.sql`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      set({ toastMessage: 'SQLのダウンロードに失敗しました', toastSeverity: 'error' });
    }
  },

  loadMemoTemplates: async () => {
    try {
      const list = await templateApi.listMemoTemplates();
      set({ memoTemplates: list });
    } catch {
      set({ toastMessage: 'メモテンプレートの読み込みに失敗しました', toastSeverity: 'error' });
    }
  },

  saveMemoTemplate: async (title, content) => {
    try {
      await templateApi.saveMemoTemplate(title, content);
      const list = await templateApi.listMemoTemplates();
      set({ memoTemplates: list, toastMessage: 'メモテンプレートを保存しました', toastSeverity: 'success' });
    } catch {
      set({ toastMessage: 'メモテンプレートの保存に失敗しました', toastSeverity: 'error' });
    }
  },

  deleteMemoTemplate: async (n) => {
    try {
      await templateApi.deleteMemoTemplate(n);
      set((s) => ({ memoTemplates: s.memoTemplates.filter((t) => t.n !== n) }));
    } catch {
      set({ toastMessage: 'メモテンプレートの削除に失敗しました', toastSeverity: 'error' });
    }
  },

  loadSqlTemplates: async () => {
    try {
      const list = await templateApi.listSqlTemplates();
      set({ sqlTemplates: list });
    } catch {
      set({ toastMessage: 'SQLテンプレートの読み込みに失敗しました', toastSeverity: 'error' });
    }
  },

  saveSqlTemplate: async (title, content) => {
    try {
      await templateApi.saveSqlTemplate(title, content);
      const list = await templateApi.listSqlTemplates();
      set({ sqlTemplates: list, toastMessage: 'SQLテンプレートを保存しました', toastSeverity: 'success' });
    } catch {
      set({ toastMessage: 'SQLテンプレートの保存に失敗しました', toastSeverity: 'error' });
    }
  },

  deleteSqlTemplate: async (n) => {
    try {
      await templateApi.deleteSqlTemplate(n);
      set((s) => ({ sqlTemplates: s.sqlTemplates.filter((t) => t.n !== n) }));
    } catch {
      set({ toastMessage: 'SQLテンプレートの削除に失敗しました', toastSeverity: 'error' });
    }
  },

  applyMemoTemplate: (content) => set({ memoContent: content }),
  applySqlTemplate: (content) => set({ sqlContent: content }),

  clearToast: () => set({ toastMessage: null }),
}));
