"use client";

import { useState, useEffect } from "react";
import { FileItem } from "./FileItem";
import { FileMetadata } from "../lib/types";
import { getUserFiles } from "../lib/db";
import { useAuth } from "./AuthProvider";
import { Loader2, FolderOpen } from "lucide-react";

export const FileList = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const userFiles = await getUserFiles(user.id);
        setFiles(userFiles);
        setError(null);
      } catch (err: unknown) {
        console.error("Error fetching files:", err);
        setError("Failed to load your files. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [user, refreshTrigger]);

  const handleDelete = (deletedId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== deletedId));
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
        {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="w-full bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="bg-slate-800 p-4 rounded-full mb-4">
          <FolderOpen className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-200 mb-1">No files yet</h3>
        <p className="text-slate-400 text-sm max-w-sm">
          Upload your first file above. It will appear here and be accessible from any of your devices.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {files.map((file) => (
        <FileItem key={file.id} file={file} onDelete={handleDelete} />
      ))}
    </div>
  );
};
