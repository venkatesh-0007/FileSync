export interface UserProfile {
  id: string; // Supabase auth.users id
  username: string;
  hiddenEmail: string;
}

export interface FileMetadata {
  id: string; // UUID from public.files
  owner_uid: string;
  filename: string;
  storage_path: string;
  file_size: number;
  uploaded_at: string; // ISO string
  expires_at?: string | null; // ISO string or null for never
  folder_id?: string | null; // UUID from public.folders
  is_starred?: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
  updated_at?: string;
}

export interface Folder {
  id: string;
  owner_uid: string;
  name: string;
  parent_id?: string | null;
  created_at: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface FileShare {
  id: string;
  file_id: string;
  owner_uid: string;
  share_token: string;
  transfer_code?: string | null;
  download_count: number;
  max_downloads?: number | null;
  expires_at?: string | null;
  is_revoked: boolean;
  created_at: string;
  file?: FileMetadata;
}

export interface UserDevice {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  device_type: 'PC' | 'Mobile' | 'Tablet';
  browser?: string;
  os?: string;
  last_active_at: string;
  created_at: string;
  is_current?: boolean;
}

export type ActivityAction = 
  | 'upload' 
  | 'download' 
  | 'delete' 
  | 'restore' 
  | 'permanent_delete' 
  | 'share' 
  | 'rename' 
  | 'move' 
  | 'star';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: ActivityAction;
  target_id?: string;
  target_name: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export type UploadStatus = 'idle' | 'uploading' | 'completed' | 'failed' | 'cancelled';

export interface UploadProgressInfo {
  status: UploadStatus;
  progress: number; // 0 - 100
  loadedBytes: number;
  totalBytes: number;
  error?: string | null;
}

export interface StorageUsage {
  usedBytes: number;
  totalBytes: number;
  remainingBytes: number;
  percentUsed: number;
}
