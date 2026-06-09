import apiClient from './axiosInstance';
import type { TableMetadata } from '../../domain/tableTypes';

export const tableApi = {
  getTables: (connectionId: number) =>
    apiClient
      .get<TableMetadata[]>('/api/tables', { params: { connectionId } })
      .then((res) => res.data),

  getRecords: (connectionId: number, tableName: string, schema = 'public') =>
    apiClient
      .get<Record<string, unknown>[]>(`/api/tables/${tableName}/records`, {
        params: { connectionId, schema },
      })
      .then((res) => res.data),

  createCopy: (connectionId: number, tableName: string, schema = 'public') =>
    apiClient
      .post<Record<string, unknown>[]>(`/api/tables/${tableName}/copy`, null, {
        params: { connectionId, schema },
      })
      .then((res) => res.data),

  updateCopyRecords: (
    connectionId: number,
    tableName: string,
    records: Record<string, unknown>[],
    schemaName = 'public',
  ) =>
    apiClient.put(`/api/tables/${tableName}/copy/records`, {
      connectionId,
      schemaName,
      records,
    }),

  saveHistory: (
    connectionId: number,
    tableName: string,
    records: Record<string, unknown>[],
    schemaName = 'public',
  ) =>
    apiClient
      .post<{ seq: number }>(`/api/tables/${tableName}/history`, {
        connectionId,
        schemaName,
        records,
      })
      .then((res) => res.data),

  getHistoryList: (connectionId: number, tableName: string, schema = 'public') =>
    apiClient
      .get<{ seq: number; savedAt: string }[]>(`/api/tables/${tableName}/history`, {
        params: { connectionId, schema },
      })
      .then((res) => res.data),

  restoreHistory: (
    connectionId: number,
    tableName: string,
    seq: number,
    schema = 'public',
  ) =>
    apiClient
      .post<Record<string, unknown>[]>(
        `/api/tables/${tableName}/history/${seq}/restore`,
        null,
        { params: { connectionId, schema } },
      )
      .then((res) => res.data),

  createBackup: (connectionId: number, tableName: string, schemaName = 'public') =>
    apiClient.post(`/api/tables/${tableName}/backup`, { connectionId, schemaName }),

  conflictCheck: (connectionId: number, tableName: string, schemaName = 'public') =>
    apiClient
      .post<{ conflict: boolean }>(`/api/tables/${tableName}/conflict-check`, { connectionId, schemaName })
      .then((res) => res.data),

  conflictDiff: (connectionId: number, tableName: string, schemaName = 'public') =>
    apiClient
      .post<Record<string, unknown>[]>(`/api/tables/${tableName}/conflict-diff`, { connectionId, schemaName })
      .then((res) => res.data),

  getStaleTables: (connectionId: number, schema = 'public') =>
    apiClient
      .get<string[]>('/api/tables/stale', { params: { connectionId, schema } })
      .then((res) => res.data),

  dropStaleTable: (connectionId: number, tableName: string, schema = 'public') =>
    apiClient.delete('/api/tables/stale', { params: { connectionId, tableName, schema } }),
};
