-- 1. Create a table for files metadata
create table public.files (
  id uuid default gen_random_uuid() primary key,
  owner_uid uuid references auth.users(id) on delete cascade not null,
  filename text not null,
  storage_path text not null,
  file_size bigint not null,
  uploaded_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone
);

-- 2. Enable Row Level Security (RLS) on the files table
alter table public.files enable row level security;

-- 3. Create RLS Policies for the files table
-- Users can only select their own files
create policy "Users can view their own files"
on public.files for select
to authenticated
using ( auth.uid() = owner_uid );

-- Users can only insert their own files
create policy "Users can insert their own files"
on public.files for insert
to authenticated
with check ( auth.uid() = owner_uid );

-- Users can only delete their own files
create policy "Users can delete their own files"
on public.files for delete
to authenticated
using ( auth.uid() = owner_uid );

-- Users can update their own files
create policy "Users can update their own files"
on public.files for update
to authenticated
using ( auth.uid() = owner_uid )
with check ( auth.uid() = owner_uid );

-- 4. Create the storage bucket for uploads
insert into storage.buckets (id, name, public) 
values ('uploads', 'uploads', false);

-- 5. Create Storage RLS Policies
-- Users can only read their own files in the storage bucket
create policy "Users can view their own storage objects"
on storage.objects for select
to authenticated
using ( bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1] );

-- Users can only insert files in their own folder
create policy "Users can upload to their own folder"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1] );

-- Users can only delete their own files
create policy "Users can delete their own storage objects"
on storage.objects for delete
to authenticated
using ( bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1] );

-- 6. Keep-Alive Function (Prevents Supabase Free tier inactivity pause)
-- Performs a lightweight, harmless query returning the current server timestamp.
create or replace function public.keep_alive()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'status', 'ok',
    'timestamp', now()
  );
$$;

-- Grant execution permissions to anon, authenticated, and service_role
grant execute on function public.keep_alive() to anon, authenticated, service_role;

-- 7. Add Folder and Organization Columns to Files Table
alter table public.files add column if not exists folder_id uuid;
alter table public.files add column if not exists is_starred boolean default false not null;
alter table public.files add column if not exists is_deleted boolean default false not null;
alter table public.files add column if not exists deleted_at timestamp with time zone;
alter table public.files add column if not exists updated_at timestamp with time zone default now() not null;

-- 8. Folders Table
create table if not exists public.folders (
  id uuid default gen_random_uuid() primary key,
  owner_uid uuid references auth.users(id) on delete cascade not null,
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  is_deleted boolean default false not null,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table public.folders enable row level security;

create policy "Users can view their own folders"
on public.folders for select to authenticated
using ( auth.uid() = owner_uid );

create policy "Users can insert their own folders"
on public.folders for insert to authenticated
with check ( auth.uid() = owner_uid );

create policy "Users can update their own folders"
on public.folders for update to authenticated
using ( auth.uid() = owner_uid )
with check ( auth.uid() = owner_uid );

create policy "Users can delete their own folders"
on public.folders for delete to authenticated
using ( auth.uid() = owner_uid );

-- Foreign key link from files to folders
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_files_folder'
  ) then
    alter table public.files 
    add constraint fk_files_folder foreign key (folder_id) references public.folders(id) on delete set null;
  end if;
end $$;

-- 9. File Shares & Cross-Device Transfer Table
create table if not exists public.file_shares (
  id uuid default gen_random_uuid() primary key,
  file_id uuid references public.files(id) on delete cascade not null,
  owner_uid uuid references auth.users(id) on delete cascade not null,
  share_token text unique not null,
  transfer_code text,
  download_count integer default 0 not null,
  max_downloads integer,
  expires_at timestamp with time zone,
  is_revoked boolean default false not null,
  created_at timestamp with time zone default now() not null
);

alter table public.file_shares enable row level security;

-- Owners have full access to their shares
create policy "Owners manage their file shares"
on public.file_shares for all to authenticated
using ( auth.uid() = owner_uid )
with check ( auth.uid() = owner_uid );

-- Anyone can read active, non-revoked, non-expired shares by token or code
create policy "Public can view valid file shares"
on public.file_shares for select to anon, authenticated
using ( 
  is_revoked = false 
  and (expires_at is null or expires_at > now()) 
  and (max_downloads is null or download_count < max_downloads)
);

-- Public can access shared file metadata if a valid share exists
create policy "Public can view shared file metadata"
on public.files for select to anon, authenticated
using (
  exists (
    select 1 from public.file_shares
    where file_shares.file_id = public.files.id
      and file_shares.is_revoked = false
      and (file_shares.expires_at is null or file_shares.expires_at > now())
  )
);

-- 10. Devices Session Tracking Table
create table if not exists public.user_devices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  device_id text not null,
  device_name text not null,
  device_type text not null,
  browser text,
  os text,
  last_active_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  constraint unique_user_device unique (user_id, device_id)
);

alter table public.user_devices enable row level security;

create policy "Users manage their own devices"
on public.user_devices for all to authenticated
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );

-- 11. Activity Log Table
create table if not exists public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  action text not null,
  target_id uuid,
  target_name text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now() not null
);

alter table public.activity_logs enable row level security;

create policy "Users view their own activity logs"
on public.activity_logs for select to authenticated
using ( auth.uid() = user_id );

create policy "Users insert their own activity logs"
on public.activity_logs for insert to authenticated
with check ( auth.uid() = user_id );

-- 12. High Performance Database Indexes
create index if not exists idx_files_owner_active on public.files(owner_uid, is_deleted, uploaded_at desc);
create index if not exists idx_files_folder on public.files(folder_id);
create index if not exists idx_files_expires on public.files(expires_at) where expires_at is not null;
create index if not exists idx_files_deleted on public.files(deleted_at) where is_deleted = true;
create index if not exists idx_files_filename on public.files(owner_uid, filename);
create index if not exists idx_folders_owner on public.folders(owner_uid, parent_id);
create index if not exists idx_file_shares_token on public.file_shares(share_token);
create index if not exists idx_file_shares_code on public.file_shares(transfer_code);
create index if not exists idx_activity_logs_user on public.activity_logs(user_id, created_at desc);
create index if not exists idx_user_devices_user on public.user_devices(user_id, last_active_at desc);


