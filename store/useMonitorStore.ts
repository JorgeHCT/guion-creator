import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CanalMonitorizado } from '@/types';

interface MonitorStore {
  canales: CanalMonitorizado[];
  addCanal: (canal: CanalMonitorizado) => void;
  removeCanal: (id: string) => void;
  updateUltimoVideo: (id: string, videoId: string) => void;
}

export const useMonitorStore = create<MonitorStore>()(
  persist(
    (set) => ({
      canales: [],
      addCanal: (canal) => set((s) => ({ canales: [...s.canales, canal] })),
      removeCanal: (id) => set((s) => ({ canales: s.canales.filter((c) => c.id !== id) })),
      updateUltimoVideo: (id, videoId) =>
        set((s) => ({
          canales: s.canales.map((c) => c.id === id ? { ...c, ultimoVideoId: videoId } : c),
        })),
    }),
    { name: 'monitor-store' }
  )
);