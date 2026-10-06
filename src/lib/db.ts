import { supabase } from "./supabase";
import { 
  FileMetadata, 
  Folder, 
  ActivityLog, 
  ActivityAction,
  FileShare 
} from "./types";
import { TRASH_RETENTION_DAYS } from "./config";

export interface GetUserFilesOptions {
  folderId?: string | null;
  view?: "all" | "trash" | "starred" | "recent";
  search?: string;
  fileType?: string;
  dateFilter?: "all" | "today" | "week" | "month";
  sortBy?: "uploaded_at" | "filename" | "file_size";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * Inserts metadata for a newly uploaded file.
 */
export const addFileMetadata = async (metadata: Omit<FileMetadata, "id" | "uploaded_at">) => {
  // Construct clean payload, only including defined optional fields
  const payload: Record<string, unknown> = {
    owner_uid: metadata.owner_uid,
    filename: metadata.filename,
    storage_path: metadata.storage_path,
    file_size: metadata.file_size,
    expires_at: metadata.expires_at,
  };

  if (metadata.folder_id) {
    payload.folder_id = metadata.folder_id;
  }
  if (metadata.is_starred !== undefined) {
    payload.is_starred = metadata.is_starred;
  }
  if (metadata.is_deleted !== undefined) {
    payload.is_deleted = metadata.is_deleted;
  }

  let { data, error } = await supabase
    .from("files")
    .insert([payload])
    .select()
    .single();

  // If column error occurs (e.g. schema migration pending for folder_id/is_starred), fallback to baseline columns
  if (error) {
    console.warn("Advanced metadata insert failed, retrying with base columns:", error.message);
    const basePayload = {
      owner_uid: metadata.owner_uid,
      filename: metadata.filename,
      storage_path: metadata.storage_path,
      file_size: metadata.file_size,
      expires_at: metadata.expires_at,
    };

    const retry = await supabase
      .from("files")
      .insert([basePayload])
      .select()
      .single();

    if (retry.error) {
      throw retry.error;
    }
    data = retry.data;
    error = null;
  }

  if (error) throw error;

  // Log activity
  try {
    await logActivity(
      metadata.owner_uid,
      "upload",
      metadata.filename,
      data.id,
      { file_size: metadata.file_size }
    );
  } catch (err) {
    console.warn("Could not log upload activity:", err);
  }

  return data as FileMetadata;
};

/**
 * Fetches files for a user with optional filtering, search, folder scoping, and sorting.
 */
export const getUserFiles = async (
  uid: string, 
  options: GetUserFilesOptions = {}
): Promise<FileMetadata[]> => {
  const now = new Date().toISOString();
  let query = supabase
    .from("files")
    .select("*")
    .eq("owner_uid", uid);

  // If in Trash view, show deleted files; otherwise show active non-expired files
  if (options.view === "trash") {
    query = query.eq("is_deleted", true);
  } else {
    // Active files: not deleted & not expired
    query = query
      .or(`is_deleted.is.null,is_deleted.eq.false`)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (options.view === "starred") {
      query = query.eq("is_starred", true);
    } else if (options.folderId !== undefined) {
      if (options.folderId === null) {
        query = query.is("folder_id", null);
      } else {
        query = query.eq("folder_id", options.folderId);
      }
    }
  }

  // Sorting
  const sortBy = options.sortBy || "uploaded_at";
  const ascending = options.sortOrder === "asc";
  query = query.order(sortBy, { ascending });

  if (options.limit) {
    query = query.limit(options.limit);
    if (options.offset) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    }
  }

  const { data, error } = await query;
  if (error) {
    // Fallback if custom columns (is_deleted/folder_id) aren't migrated yet
    console.warn("Advanced query error, attempting base query fallback:", error.message);
    const fallback = await supabase
      .from("files")
      .select("*")
      .eq("owner_uid", uid)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("uploaded_at", { ascending: false });

    if (fallback.error) throw fallback.error;
    return (fallback.data as FileMetadata[]) || [];
  }

  return (data as FileMetadata[]) || [];
};

/**
 * Calculates the total storage used by a user in bytes.
 */
export const getUserStorageUsage = async (uid: string): Promise<number> => {
  const { data: initialData, error } = await supabase
    .from("files")
    .select("file_size, is_deleted")
    .eq("owner_uid", uid);

  let data = initialData as unknown as { file_size: number; is_deleted?: boolean }[] | null;

  if (error) {
    // Fallback if is_deleted column does not exist
    const baseQuery = await supabase
      .from("files")
      .select("file_size")
      .eq("owner_uid", uid);

    if (baseQuery.error) {
      console.warn("Could not calculate storage usage:", baseQuery.error.message);
      return 0;
    }
    data = (baseQuery.data || []) as unknown as { file_size: number; is_deleted?: boolean }[];
  }

  // Count files that are not permanently deleted
  const total = (data || [])
    .filter((f) => !f.is_deleted)
    .reduce((sum, f) => sum + (Number(f.file_size) || 0), 0);

  return total;
};

/**
 * Permanently deletes a file record from the database.
 */
export const deleteFileMetadata = async (fileId: string) => {
  const { error } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId);

  if (error) throw error;
};

/**
 * Soft deletes a file by moving it to Trash.
 */
export const softDeleteFile = async (fileId: string, ownerUid: string, filename: string) => {
  const { data, error } = await supabase
    .from("files")
    .update({ 
      is_deleted: true, 
      deleted_at: new Date().toISOString() 
    })
    .eq("id", fileId)
    .select()
    .single();

  if (error) {
    // If column doesn't exist yet, fallback to permanent delete
    console.warn("softDelete fallback to hard delete:", error.message);
    await deleteFileMetadata(fileId);
    return;
  }

  try {
    await logActivity(ownerUid, "delete", filename, fileId);
  } catch (err) {
    console.warn("Activity log failed:", err);
  }

  return data as FileMetadata;
};

/**
 * Restores a file from Trash back to active files.
 */
export const restoreFileFromTrash = async (fileId: string, ownerUid: string, filename: string) => {
  const { data, error } = await supabase
    .from("files")
    .update({ 
      is_deleted: false, 
      deleted_at: null 
    })
    .eq("id", fileId)
    .select()
    .single();

  if (error) throw error;

  try {
    await logActivity(ownerUid, "restore", filename, fileId);
  } catch (err) {
    console.warn("Activity log failed:", err);
  }

  return data as FileMetadata;
};

/**
 * Toggles the favorite/star status of a file.
 */
export const toggleStarFile = async (fileId: string, isStarred: boolean) => {
  const { data, error } = await supabase
    .from("files")
    .update({ is_starred: isStarred })
    .eq("id", fileId)
    .select()
    .single();

  if (error) throw error;
  return data as FileMetadata;
};

/**
 * Updates filename and/or expiration date.
 */
export const updateFileMetadata = async (
  fileId: string,
  filename: string,
  expires_at: string | null | undefined
): Promise<FileMetadata> => {
  const updateData: { filename: string; expires_at?: string | null; updated_at?: string } = { 
    filename,
    updated_at: new Date().toISOString()
  };
  if (expires_at !== undefined) {
    updateData.expires_at = expires_at;
  }

  const { data, error } = await supabase
    .from("files")
    .update(updateData)
    .eq("id", fileId)
    .select()
    .single();

  if (error) throw error;
  return data as FileMetadata;
};

/**
 * Moves a file to a folder (or root if folderId is null).
 */
export const moveFileToFolder = async (
  fileId: string, 
  folderId: string | null,
  ownerUid: string,
  filename: string
) => {
  const { data, error } = await supabase
    .from("files")
    .update({ 
      folder_id: folderId,
      updated_at: new Date().toISOString()
    })
    .eq("id", fileId)
    .select()
    .single();

  if (error) throw error;

  try {
    await logActivity(ownerUid, "move", filename, fileId, { folder_id: folderId });
  } catch (err) {
    console.warn("Activity log failed:", err);
  }

  return data as FileMetadata;
};

// ==========================================
// Folder Operations (Phase 2)
// ==========================================

export const createFolder = async (
  ownerUid: string, 
  name: string, 
  parentId: string | null = null
): Promise<Folder> => {
  const { data, error } = await supabase
    .from("folders")
    .insert([{
      owner_uid: ownerUid,
      name: name.trim(),
      parent_id: parentId
    }])
    .select()
    .single();

  if (error) throw error;
  return data as Folder;
};

export const getUserFolders = async (
  ownerUid: string, 
  parentId: string | null = null
): Promise<Folder[]> => {
  let query = supabase
    .from("folders")
    .select("*")
    .eq("owner_uid", ownerUid)
    .eq("is_deleted", false)
    .order("name", { ascending: true });

  if (parentId === null) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Folders table query error:", error.message);
    return [];
  }
  return (data as Folder[]) || [];
};

export const renameFolder = async (folderId: string, newName: string): Promise<Folder> => {
  const { data, error } = await supabase
    .from("folders")
    .update({ 
      name: newName.trim(),
      updated_at: new Date().toISOString()
    })
    .eq("id", folderId)
    .select()
    .single();

  if (error) throw error;
  return data as Folder;
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", folderId);

  if (error) throw error;
};

// ==========================================
// Activity Log Operations (Phase 5)
// ==========================================

export const logActivity = async (
  userId: string,
  action: ActivityAction,
  targetName: string,
  targetId?: string,
  details: Record<string, unknown> = {}
) => {
  try {
    await supabase.from("activity_logs").insert([{
      user_id: userId,
      action,
      target_id: targetId,
      target_name: targetName,
      details,
    }]);
  } catch (err) {
    console.warn("Could not insert activity log:", err);
  }
};

export const getUserActivities = async (userId: string, limit = 20): Promise<ActivityLog[]> => {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("Failed to fetch activity logs:", error.message);
    return [];
  }
  return (data as ActivityLog[]) || [];
};

// ==========================================
// Sharing & Transfers Operations (Phase 3)
// ==========================================

export const createFileShare = async (
  fileId: string,
  ownerUid: string,
  expiresInHours: number | null = 24,
  maxDownloads: number | null = null,
  transferCode?: string
): Promise<FileShare> => {
  const shareToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  let expires_at: string | null = null;
  if (expiresInHours) {
    const d = new Date();
    d.setHours(d.getHours() + expiresInHours);
    expires_at = d.toISOString();
  }

  const { data, error } = await supabase
    .from("file_shares")
    .insert([{
      file_id: fileId,
      owner_uid: ownerUid,
      share_token: shareToken,
      transfer_code: transferCode || null,
      expires_at,
      max_downloads: maxDownloads,
      download_count: 0,
      is_revoked: false
    }])
    .select()
    .single();

  if (error) throw error;

  try {
    await logActivity(ownerUid, "share", `Shared file`, fileId, { share_token: shareToken });
  } catch (err) {
    console.warn("Activity log error:", err);
  }

  return data as FileShare;
};

export const getFileShareByToken = async (token: string): Promise<(FileShare & { file: FileMetadata }) | null> => {
  const { data, error } = await supabase
    .from("file_shares")
    .select("*, file:files(*)")
    .eq("share_token", token)
    .single();

  if (error || !data) return null;
  return data as (FileShare & { file: FileMetadata });
};

export const getFileShareByCode = async (code: string): Promise<(FileShare & { file: FileMetadata }) | null> => {
  const { data, error } = await supabase
    .from("file_shares")
    .select("*, file:files(*)")
    .ilike("transfer_code", code.trim().toUpperCase())
    .single();

  if (error || !data) return null;
  return data as (FileShare & { file: FileMetadata });
};

export const revokeFileShare = async (shareId: string): Promise<void> => {
  const { error } = await supabase
    .from("file_shares")
    .update({ is_revoked: true })
    .eq("id", shareId);

  if (error) throw error;
};

export const incrementShareDownload = async (shareId: string): Promise<void> => {
  const { data } = await supabase
    .from("file_shares")
    .select("download_count")
    .eq("id", shareId)
    .single();

  if (data) {
    await supabase
      .from("file_shares")
      .update({ download_count: (data.download_count || 0) + 1 })
      .eq("id", shareId);
  }
};

// ==========================================
// Cleanup & Expiration Operations (Phase 1 & 6)
// ==========================================

export const getExpiredFilesForCleanup = async (): Promise<FileMetadata[]> => {
  const now = new Date().toISOString();
  
  // Files past expiration date
  const { data: expired, error: err1 } = await supabase
    .from("files")
    .select("*")
    .not("expires_at", "is", null)
    .lte("expires_at", now);

  if (err1) {
    console.error("Error finding expired files:", err1);
    return [];
  }

  // Trashed files older than retention days (30 days)
  const retentionThreshold = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: oldTrash, error: err2 } = await supabase
    .from("files")
    .select("*")
    .eq("is_deleted", true)
    .lte("deleted_at", retentionThreshold);

  if (err2) {
    console.warn("Error finding old trashed files:", err2.message);
  }

  const allFiles = [...(expired || []), ...(oldTrash || [])];
  // Deduplicate by ID
  const uniqueMap = new Map<string, FileMetadata>();
  allFiles.forEach(f => uniqueMap.set(f.id, f as FileMetadata));
  return Array.from(uniqueMap.values());
};
