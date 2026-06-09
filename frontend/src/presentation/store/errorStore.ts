import { create } from 'zustand';

interface ErrorState {
  message: string | null;
  setError: (message: string) => void;
  clearError: () => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  message: null,
  setError: (message) => set({ message }),
  clearError: () => set({ message: null }),
}));
