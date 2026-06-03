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
}
