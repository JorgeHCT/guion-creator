import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Canal } from '@/types';

interface CanalesStore {
  canales: Canal[];
  addCanal: (canal: Canal) => void;
  removeCanal: (id: string) => void;
  updateCanal: (id: string, updates: Partial<Canal>) => void;
}

export const useCanalesStore = create<CanalesStore>()(
  persist(
    (set) => ({
      canales: [],
      addCanal: (canal) => set((s) => ({ canales: [...s.canales, canal] })),
      removeCanal: (id) => set((s) => ({ canales: s.canales.filter((c) => c.id !== id) })),
      updateCanal: (id, updates) =>
        set((s) => ({
          canales: s.canales.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
    }),
    { name: 'canales-store' }
  )
);
