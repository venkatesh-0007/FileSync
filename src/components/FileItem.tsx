"use client";

import { useState, useEffect } from "react";
import { Download, Trash2, File, Loader2, Eye, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FileMetadata } from "../lib/types";
import { getFileDownloadURL, deleteFileFromStorage } from "../lib/storage";
import { deleteFileMetadata } from "../lib/db";

interface FileItemProps {
  file: FileMetadata;
  onDelete: (fileId: string) => void;
}

export const FileItem = ({ file, onDelete }: FileItemProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.filename);
      if (isImage) {
        try {
          const url = await getFileDownloadURL(file.storage_path);
          setPreviewUrl(url);
        } catch (error) {
          console.error("Failed to load preview for", file.filename, error);
        }
      }
    };
    fetchPreview();
  }, [file]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const url = await getFileDownloadURL(file.storage_path);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download file. It may have been deleted.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${file.filename}"?`)) return;
    
    try {
      setIsDeleting(true);
      await deleteFileFromStorage(file.storage_path);
      await deleteFileMetadata(file.id);
      onDelete(file.id);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete file.");
      setIsDeleting(false);
    }
  };

  const dateObj = new Date(file.uploaded_at);
  const timeAgo = !isNaN(dateObj.getTime()) 
    ? formatDistanceToNow(dateObj, { addSuffix: true }) 
    : 'recently';

  return (
    <div className="group flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all">
      <div className="flex items-center gap-4 overflow-hidden">
        {previewUrl ? (
          <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden relative border border-slate-700/50 bg-slate-900/50">
            <img src={previewUrl} alt={file.filename} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg shrink-0 group-hover:scale-105 transition-transform">
            <File className="w-6 h-6" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-slate-200 font-medium truncate" title={file.filename}>
            {file.filename}
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span>{formatSize(file.file_size)}</span>
            <span className="w-1 h-1 bg-slate-600 rounded-full" />
            <span>Uploaded {timeAgo}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-4">
        {previewUrl && (
          <button
            onClick={() => setIsPreviewOpen(true)}
            disabled={isDeleting || isDownloading}
            className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors disabled:opacity-50"
            title="Preview file"
          >
            <Eye className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={handleDownload}
          disabled={isDownloading || isDeleting}
          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors disabled:opacity-50"
          title="Download file"
        >
          {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting || isDownloading}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
          title="Delete file"
        >
          {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Full screen preview modal */}
      {isPreviewOpen && previewUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" 
          onClick={() => setIsPreviewOpen(false)}
        >
          <div className="relative max-w-5xl max-h-full w-full flex justify-center items-center">
            <button 
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(false); }}
              title="Close preview"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={previewUrl} 
              alt={file.filename} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
  );
};
