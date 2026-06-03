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
