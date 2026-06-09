import apiClient from './axiosInstance';
import type {
  ConnectionSetting,
  ConnectionSettingRequest,
  ConnectionTestRequest,
  ConnectionTestResponse,
} from '../../domain/connectionTypes';

export const connectionApi = {
  getAll: () =>
    apiClient.get<ConnectionSetting[]>('/api/connections').then((res) => res.data),

  getById: (id: number) =>
    apiClient.get<ConnectionSetting>(`/api/connections/${id}`).then((res) => res.data),

  create: (data: ConnectionSettingRequest) =>
    apiClient.post<ConnectionSetting>('/api/connections', data).then((res) => res.data),

  update: (id: number, data: ConnectionSettingRequest) =>
    apiClient.put<ConnectionSetting>(`/api/connections/${id}`, data).then((res) => res.data),

  delete: (id: number) =>
    apiClient.delete(`/api/connections/${id}`),

  testConnection: (data: ConnectionTestRequest) =>
    apiClient.post<ConnectionTestResponse>('/api/connections/test', data).then((res) => res.data),
};
