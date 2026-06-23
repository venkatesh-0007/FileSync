"use client";

import { useState, useEffect } from "react";
import { FileItem, getFileType, TextPreview } from "./FileItem";
import { FileMetadata } from "../lib/types";
import { getUserFiles } from "../lib/db";
import { useAuth } from "./AuthProvider";
import { Loader2, FolderOpen, X, Music } from "lucide-react";

export const FileList = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<{ file: FileMetadata; url: string } | null>(null);

  useEffect(() => {
    let active = true;
    const fetchFiles = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const userFiles = await getUserFiles(userId);
        if (active) {
          setFiles(userFiles);
          setError(null);
        }
      } catch (err: unknown) {
        console.error("Error fetching files:", err);
        if (active) {
          setError("Failed to load your files. Please try again later.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchFiles();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (refreshTrigger === 0) return;
    let active = true;
    const fetchFilesSilent = async () => {
      if (!userId) return;
      try {
        const userFiles = await getUserFiles(userId);
        if (active) {
          setFiles(userFiles);
          setError(null);
        }
      } catch (err: unknown) {
        console.error("Silent refetch failed:", err);
      }
    };

    fetchFilesSilent();
    return () => {
      active = false;
    };
  }, [refreshTrigger, userId]);

  const handleDelete = (deletedId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== deletedId));
  };

  const handleUpdate = (updatedFile: FileMetadata) => {
    setFiles((prev) => prev.map((f) => f.id === updatedFile.id ? updatedFile : f));
  };

  const handlePreviewClose = () => setActivePreview(null);

  const renderPreviewContent = () => {
    if (!activePreview) return null;
    const { file, url } = activePreview;
    const type = getFileType(file.filename);
    
    switch (type) {
      case 'image':
        return (
          <img 
            src={url} 
            alt={file.filename} 
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl animate-scale-up" 
            onClick={(e) => e.stopPropagation()} 
          />
        );
      case 'pdf':
        return (
          <iframe 
            src={url} 
            className="w-full h-[75vh] rounded-lg border border-slate-700 bg-slate-900 shadow-2xl animate-scale-up" 
            title={file.filename}
            onClick={(e) => e.stopPropagation()} 
          />
        );
      case 'audio':
        return (
          <div 
            className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl mx-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <Music className="w-16 h-16 text-purple-400 mb-4 animate-pulse" />
            <p className="text-slate-200 font-semibold mb-4 text-center truncate w-full" title={file.filename}>
              {file.filename}
            </p>
            <audio src={url} controls className="w-full" autoPlay />
          </div>
        );
      case 'video':
        return (
          <div 
            className="w-full max-w-3xl bg-black rounded-lg overflow-hidden border border-slate-700 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <video src={url} controls className="w-full max-h-[70vh]" autoPlay />
          </div>
        );
      case 'text':
        return <TextPreview url={url} filename={file.filename} />;
      case 'office':
        return (
          <div 
            className="w-full h-[75vh] flex flex-col rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-950 px-4 py-2 text-xs text-slate-400 border-b border-slate-800 flex justify-between items-center shrink-0">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Office Online Document Viewer
              </span>
              <a 
                href={url} 
                target="_blank" 
                rel="noreferrer" 
                className="underline hover:text-white transition-colors"
              >
                Download Copy
              </a>
            </div>
            <iframe 
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} 
              className="w-full flex-1 bg-white border-0" 
              title={file.filename}
            />
          </div>
        );
      default:
        return (
          <div className="text-slate-400 p-8 text-center bg-slate-900 border border-slate-700 rounded-lg animate-scale-up" onClick={(e) => e.stopPropagation()}>
            Preview not available for this file type.
          </div>
        );
    }
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
    <>
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
        {files.map((file, index) => (
          <FileItem 
            key={file.id} 
            file={file} 
            index={index} 
            onDelete={handleDelete} 
            onPreview={(url) => setActivePreview({ file, url })}
            onUpdate={handleUpdate}
          />
        ))}
      </div>

      {/* Full screen preview modal at root level to bypass 3D transform perspective stacking context */}
      {activePreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 md:p-8 animate-backdrop-fade" 
          onClick={handlePreviewClose}
        >
          <div className="relative max-w-5xl w-full flex justify-center items-center">
            <button 
              className="absolute -top-14 right-0 p-2.5 text-white/70 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-full transition-all hover:scale-110 active:scale-95 shadow-lg z-10"
              onClick={(e) => { e.stopPropagation(); handlePreviewClose(); }}
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
            {renderPreviewContent()}
          </div>
        </div>
      )}
    </>
  );
};
