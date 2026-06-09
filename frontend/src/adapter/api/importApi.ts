import apiClient from './axiosInstance';

export type FileKind = 'csv' | 'excel' | 'sql' | 'text' | 'unknown';

export interface AutoMappingResult {
  csvHeaders: string[];
  tableColumns: string[];
  mapping: Record<string, string | null>;
  rows: Record<string, string>[];
}

export function detectFileKind(file: File): FileKind {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel';
  if (name.endsWith('.sql')) return 'sql';
  if (name.endsWith('.txt') || name.endsWith('.md')) return 'text';
  return 'unknown';
}

export const importApi = {
  /** CSV → 自動マッピング提案 (A06) */
  csvAutoMapping: (
    connectionId: number,
    tableName: string,
    file: File,
  ): Promise<AutoMappingResult> => {
    const form = new FormData();
    form.append('file', file);
    form.append('connectionId', String(connectionId));
    form.append('tableName', tableName);
    return apiClient
      .post<AutoMappingResult>('/api/import/csv/auto-mapping', form)
      .then((r) => r.data);
  },

  /** SQL ファイルアップロード (A09) */
  uploadSql: (connectionId: number, file: File): Promise<{ id: number; title: string }> => {
    const form = new FormData();
    form.append('file', file);
    form.append('connectionId', String(connectionId));
    return apiClient
      .post<{ id: number; title: string }>('/api/sql/upload', form)
      .then((r) => r.data);
  },

  /** テキスト/メモ ファイルアップロード (A08) */
  uploadMemo: (
    connectionId: number,
    tableName: string,
    file: File,
  ): Promise<void> => {
    const form = new FormData();
    form.append('file', file);
    form.append('connectionId', String(connectionId));
    form.append('tableName', tableName);
    return apiClient.post('/api/memo/upload', form).then(() => undefined);
  },

  /** Excel シート名一覧取得 */
  getExcelSheets: (file: File): Promise<string[]> => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<string[]>('/api/import/excel/sheets', form).then((r) => r.data);
  },

  /** Excel 指定シート → 自動マッピング提案 */
  excelAutoMapping: (
    connectionId: number,
    tableName: string,
    file: File,
    sheetIndex: number,
  ): Promise<AutoMappingResult> => {
    const form = new FormData();
    form.append('file', file);
    form.append('connectionId', String(connectionId));
    form.append('tableName', tableName);
    form.append('sheetIndex', String(sheetIndex));
    return apiClient
      .post<AutoMappingResult>('/api/import/excel/auto-mapping', form)
      .then((r) => r.data);
  },

  /** 確定マッピングをコピーテーブルに反映 (A07) */
  applyMapping: (
    connectionId: number,
    tableName: string,
    mapping: Record<string, string | null>,
    rows: Record<string, string>[],
    schemaName = 'public',
  ): Promise<void> =>
    apiClient
      .post('/api/import/mapping/apply', { connectionId, tableName, schemaName, mapping, rows })
      .then(() => undefined),

  /** 新規テーブル作成 + データ挿入 */
  createTableAndImport: (
    connectionId: number,
    tableName: string,
    columns: string[],
    columnTypes: string[],
    rows: Record<string, string>[],
    schemaName = 'public',
  ): Promise<void> =>
    apiClient
      .post('/api/import/new-table', { connectionId, tableName, schemaName, columns, columnTypes, rows })
      .then(() => undefined),
};
