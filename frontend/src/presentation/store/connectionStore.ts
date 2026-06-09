import { create } from 'zustand';
import type { ConnectionSetting } from '../../domain/connectionTypes';
import { connectionApi } from '../../adapter/api/connectionApi';

interface ConnectionState {
  connections: ConnectionSetting[];
  selectedConnectionId: number | null;
  loading: boolean;
  error: string | null;
  fetchConnections: () => Promise<void>;
  setSelectedConnectionId: (id: number | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  connections: [],
  selectedConnectionId: null,
  loading: false,
  error: null,

  fetchConnections: async () => {
    set({ loading: true, error: null });
    try {
      const connections = await connectionApi.getAll();
      set({ connections, loading: false });
    } catch {
      set({ error: '接続設定の取得に失敗しました', loading: false });
    }
  },

  setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),
}));
