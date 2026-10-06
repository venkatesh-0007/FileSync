import { supabase } from "./supabase";

export const getDeviceType = (): 'PC' | 'Mobile' | 'Tablet' => {
  if (typeof window === "undefined") return "PC";
  const ua = window.navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) return "Mobile";
  return "PC";
};

export interface UploadTaskHandle {
  abort: () => void;
}

/**
 * Uploads a file with real XMLHttpRequest progress tracking and abort support.
 */
export const uploadFile = (
  file: File,
  uid: string,
  onProgress: (progress: number, loadedBytes?: number, totalBytes?: number) => void,
  onComplete: (storagePath: string) => void,
  onError: (error: Error) => void,
  customFilename?: string,
  onCancel?: () => void
): UploadTaskHandle => {
  const timestamp = Date.now();
  const filenameToUse = customFilename || file.name;
  const safeFilename = filenameToUse.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const deviceType = getDeviceType();
  const storagePath = `${uid}/${timestamp}_dev-${deviceType}_${safeFilename}`;

  let aborted = false;
  let xhr: XMLHttpRequest | null = null;

  const startUpload = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

      // Retrieve current session token
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || supabaseAnonKey;

      if (!supabaseUrl || !authToken) {
        // Fallback to standard Supabase SDK if session/url missing
        const { data, error } = await supabase.storage
          .from("uploads")
          .upload(storagePath, file, { cacheControl: "3600", upsert: false });

        if (error) {
          onError(error);
          return;
        }
        onProgress(100, file.size, file.size);
        onComplete(data.path);
        return;
      }

      xhr = new XMLHttpRequest();
      // Supabase storage object endpoint
      const uploadUrl = `${supabaseUrl}/storage/v1/object/uploads/${encodeURIComponent(storagePath).replace(/%2F/g, '/')}`;

      xhr.open("POST", uploadUrl, true);
      xhr.setRequestHeader("apikey", supabaseAnonKey);
      xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.setRequestHeader("x-upsert", "false");

      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable && !aborted) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress(percent, event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        if (aborted) return;
        if (xhr && xhr.status >= 200 && xhr.status < 300) {
          onProgress(100, file.size, file.size);
          onComplete(storagePath);
        } else {
          let errorMsg = `Upload failed (Status ${xhr?.status || 500})`;
          try {
            if (xhr?.responseText) {
              const res = JSON.parse(xhr.responseText);
              errorMsg = res.message || res.error || errorMsg;
            }
          } catch {
            // response not JSON
          }
          onError(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        if (aborted) return;
        onError(new Error("Network connection error during file upload. Please check your connection and retry."));
      };

      xhr.onabort = () => {
        aborted = true;
        if (onCancel) onCancel();
      };

      xhr.send(file);
    } catch (err: unknown) {
      if (!aborted) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  };

  startUpload();

  return {
    abort: () => {
      aborted = true;
      if (xhr && xhr.readyState !== XMLHttpRequest.DONE) {
        xhr.abort();
      } else if (onCancel) {
        onCancel();
      }
    },
  };
};

export const deleteFileFromStorage = async (storagePath: string) => {
  const { error } = await supabase.storage
    .from("uploads")
    .remove([storagePath]);

  if (error) {
    console.error("Failed to delete file from storage:", error);
    throw error;
  }
};

export const getFileDownloadURL = async (storagePath: string) => {
  const { data, error } = await supabase.storage
    .from("uploads")
    .createSignedUrl(storagePath, 300); // 300 seconds (5 min) expiry

  if (error) throw error;
  return data.signedUrl;
};
