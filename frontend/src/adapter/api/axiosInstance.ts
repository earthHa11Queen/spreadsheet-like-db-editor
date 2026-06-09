import axios from 'axios';
import { useErrorStore } from '../../presentation/store/errorStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status;
    const serverMessage: string | undefined = error.response?.data?.message ?? error.response?.data?.error;
    let message = serverMessage ?? error.message ?? '予期しないエラーが発生しました';
    if (status === 400) message = serverMessage ?? '入力内容に誤りがあります';
    else if (status === 404) message = serverMessage ?? 'リソースが見つかりません';
    else if (status === 500) message = serverMessage ?? 'サーバーエラーが発生しました';
    else if (!error.response) message = 'サーバーに接続できません';
    useErrorStore.getState().setError(message);
    return Promise.reject(error);
  },
);

export default apiClient;
