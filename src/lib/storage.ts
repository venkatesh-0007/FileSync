import { supabase } from "./supabase";

export const uploadFile = async (
  file: File,
  uid: string,
  onProgress: (progress: number) => void,
  onComplete: (storagePath: string) => void,
  onError: (error: Error) => void
) => {
  const timestamp = Date.now();
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storagePath = `${uid}/${timestamp}_${safeFilename}`;

  // Supabase storage JS SDK doesn't natively support easy progress callbacks like Firebase did,
  // but it's very fast for smaller files. For MVP, we will simulate a quick progress bar or 
  // just set it to 50% while uploading and 100% when done.
  
  onProgress(20);

  try {
    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      onError(error);
      return;
    }

    onProgress(100);
    onComplete(data.path);
  } catch (err: any) {
    onError(err);
  }
};

export const deleteFileFromStorage = async (storagePath: string) => {
  const { error } = await supabase.storage
    .from("uploads")
    .remove([storagePath]);

  if (error) throw error;
};

export const getFileDownloadURL = async (storagePath: string) => {
  const { data, error } = await supabase.storage
    .from("uploads")
    .createSignedUrl(storagePath, 60); // 60 seconds expiry

  if (error) throw error;
  return data.signedUrl;
};
