import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Video, Canal } from '@/types';

interface QueueStore {
  videos: Video[];
  addVideo: (video: Video) => void;
  addVideos: (videos: Video[]) => void;
  removeVideo: (id: string) => void;
  updateVideo: (id: string, updates: Partial<Video>) => void;
  clearDone: () => void;
  clearAll: () => void;
  asignarCanalesAleatorio: (canales: Canal[]) => void;
}

export const useQueueStore = create<QueueStore>()(
  persist(
    (set) => ({
      videos: [],
      addVideo: (video) => set((s) => ({ videos: [...s.videos, video] })),
      addVideos: (nuevos) => set((s) => ({ videos: [...s.videos, ...nuevos] })),
      removeVideo: (id) => set((s) => ({ videos: s.videos.filter((v) => v.id !== id) })),
      updateVideo: (id, updates) =>
        set((s) => ({
          videos: s.videos.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        })),
      clearDone: () => set((s) => ({ videos: s.videos.filter((v) => v.status !== 'done') })),
      clearAll: () => set({ videos: [] }),
      asignarCanalesAleatorio: (canales) =>
        set((s) => ({
          videos: s.videos.map((video) => {
            if (video.canalId) return video;
            const canalesEquipo = canales.filter((c) => c.equipo === video.equipo);
            if (canalesEquipo.length === 0) return video;
            const canal = canalesEquipo[Math.floor(Math.random() * canalesEquipo.length)];
            return { ...video, canalId: canal.id };
          }),
        })),
    }),
    { name: 'guion-queue' }
  )
);
