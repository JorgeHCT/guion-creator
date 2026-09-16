export interface Video {
  id: string;
  url: string;
  title: string;
  thumb: string;
  transcripcion: string;
  status: 'pending' | 'processing' | 'done';
  guion: string[] | null;
  createdAt: number;
  equipo: 'realmadrid' | 'barcelona';
  canalId: string | null;
  fechaPublicacion?: string;
}

export interface Canal {
  id: string;
  nombre: string;
  equipo: 'realmadrid' | 'barcelona';
  descripcion: string;
  urlCanal: string;
  logo: string;
  createdAt: number;
}

export interface CanalMonitorizado {
  id: string;
  url: string;
  nombre: string;
  equipo: 'realmadrid' | 'barcelona';
  ultimoVideoId: string | null;
  createdAt: number;
}
