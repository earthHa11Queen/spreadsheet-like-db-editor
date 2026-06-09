import apiClient from './axiosInstance';

export interface MemoResponse {
  connectionId: number;
  tableName: string;
  content: string;
}

export interface SqlSummary {
  n: number;
  connectionId: number;
  title: string;
  content: string | null;
}

export interface SqlExecuteResponse {
  rows: Record<string, unknown>[] | null;
  affectedRows: number | null;
  errorMessage: string | null;
}

export const memoApi = {
  getMemo: (connectionId: number, tableName: string) =>
    apiClient.get<MemoResponse>(`/api/memo/${connectionId}/${tableName}`).then((r) => r.data),

  saveMemo: (connectionId: number, tableName: string, content: string) =>
    apiClient
      .put<MemoResponse>(`/api/memo/${connectionId}/${tableName}`, { connectionId, tableName, content })
      .then((r) => r.data),

  downloadMemo: (connectionId: number, tableName: string) =>
    apiClient
      .get<Blob>(`/api/memo/${connectionId}/${tableName}/download`, { responseType: 'blob' })
      .then((r) => r.data),
};

export interface TemplateItem {
  n: number;
  title: string;
  content: string;
}

export const templateApi = {
  listMemoTemplates: () =>
    apiClient.get<TemplateItem[]>('/api/templates/memo').then((r) => r.data),

  saveMemoTemplate: (title: string, content: string) =>
    apiClient.post<TemplateItem>('/api/templates/memo', { title, content }).then((r) => r.data),

  deleteMemoTemplate: (n: number) =>
    apiClient.delete(`/api/templates/memo/${n}`),

  listSqlTemplates: () =>
    apiClient.get<TemplateItem[]>('/api/templates/sql').then((r) => r.data),

  saveSqlTemplate: (title: string, content: string) =>
    apiClient.post<TemplateItem>('/api/templates/sql', { title, content }).then((r) => r.data),

  deleteSqlTemplate: (n: number) =>
    apiClient.delete(`/api/templates/sql/${n}`),
};

export const sqlApi = {
  listSql: (connectionId: number) =>
    apiClient.get<SqlSummary[]>('/api/sql', { params: { connectionId } }).then((r) => r.data),

  getSql: (id: number) =>
    apiClient.get<SqlSummary>(`/api/sql/${id}`).then((r) => r.data),

  saveSql: (connectionId: number, title: string, content: string) =>
    apiClient.post<SqlSummary>('/api/sql', { connectionId, title, content }).then((r) => r.data),

  executeSql: (connectionId: number, sql: string) =>
    apiClient.post<SqlExecuteResponse>('/api/sql/execute', { connectionId, sql }).then((r) => r.data),

  downloadSql: (id: number) =>
    apiClient.get<Blob>(`/api/sql/${id}/download`, { responseType: 'blob' }).then((r) => r.data),
};
