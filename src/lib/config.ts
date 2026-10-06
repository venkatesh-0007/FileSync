// Storage & Quota Configuration
export const DEFAULT_STORAGE_LIMIT_MB = 500;

export const getStorageLimitBytes = (): number => {
  const envLimit = process.env.NEXT_PUBLIC_STORAGE_LIMIT_MB;
  const mb = envLimit ? Number(envLimit) : DEFAULT_STORAGE_LIMIT_MB;
  return (isNaN(mb) || mb <= 0 ? DEFAULT_STORAGE_LIMIT_MB : mb) * 1024 * 1024;
};

export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Trash retention period in days before automatic permanent deletion
export const TRASH_RETENTION_DAYS = 30;

// Pagination configuration
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${value} ${sizes[i]}`;
};
