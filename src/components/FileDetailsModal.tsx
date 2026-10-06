"use client";

import { 
  X, 
  File, 
  Calendar, 
  Clock, 
  HardDrive, 
  Star, 
  Folder 
} from "lucide-react";
import { FileMetadata } from "../lib/types";
import { formatBytes } from "../lib/config";
import { getFileType } from "./FileItem";

interface FileDetailsModalProps {
  file: FileMetadata | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FileDetailsModal = ({ file, isOpen, onClose }: FileDetailsModalProps) => {
  if (!isOpen || !file) return null;

  const fileType = getFileType(file.filename);
  const ext = file.filename.split('.').pop()?.toUpperCase() || 'UNKNOWN';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-backdrop-fade"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-slate-200 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <File className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">File Properties</h3>
              <p className="text-xs text-slate-400">Complete item details</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400">Filename:</span>
            <span className="font-medium text-slate-200 truncate max-w-[240px]" title={file.filename}>
              {file.filename}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400">Type / Extension:</span>
            <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
              {ext} ({fileType})
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400">File Size:</span>
            <span className="font-mono text-slate-200">
              {formatBytes(file.file_size)} ({file.file_size.toLocaleString()} bytes)
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Uploaded At:
            </span>
            <span className="text-slate-200">
              {new Date(file.uploaded_at).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Expiration:
            </span>
            <span className="text-slate-200">
              {file.expires_at ? new Date(file.expires_at).toLocaleString() : "Never expires"}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-slate-500" />
              Starred / Favorite:
            </span>
            <span className={file.is_starred ? "text-amber-400 font-medium" : "text-slate-500"}>
              {file.is_starred ? "Yes" : "No"}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-slate-500" />
              Folder:
            </span>
            <span className="text-slate-300">
              {file.folder_id ? "Organized in folder" : "Root directory"}
            </span>
          </div>

          <div className="flex flex-col gap-1 py-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              Storage Path:
            </span>
            <span className="font-mono text-[11px] text-slate-500 bg-slate-950 p-2 rounded-lg break-all select-all">
              {file.storage_path}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
