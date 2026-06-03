import { supabase } from "./supabase";
import { FileMetadata } from "./types";

export const addFileMetadata = async (metadata: Omit<FileMetadata, "id" | "uploaded_at">) => {
  const { data, error } = await supabase
    .from("files")
    .insert([metadata])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getUserFiles = async (uid: string): Promise<FileMetadata[]> => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("owner_uid", uid)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;
  return data as FileMetadata[];
};

export const deleteFileMetadata = async (fileId: string) => {
  const { error } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId);

  if (error) throw error;
};
