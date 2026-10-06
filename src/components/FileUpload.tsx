"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  UploadCloud, 
  File, 
  X, 
  Clock, 
  Pencil, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle,
  HardDrive
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { uploadFile, deleteFileFromStorage, UploadTaskHandle } from "../lib/storage";
import { addFileMetadata, getUserStorageUsage } from "../lib/db";
import { 
  MAX_FILE_SIZE_MB, 
  MAX_FILE_SIZE_BYTES, 
  getStorageLimitBytes, 
  formatBytes 
} from "../lib/config";
import { UploadStatus } from "../lib/types";

interface FileUploadProps {
  onUploadSuccess: () => void;
  currentFolderId?: string | null;
}

export const FileUpload = ({ onUploadSuccess, currentFolderId }: FileUploadProps) => {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expiryHours, setExpiryHours] = useState<number | null>(6);
  const [baseName, setBaseName] = useState<string>("");
  const [extension, setExtension] = useState<string>("");
  const [currentUsage, setCurrentUsage] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const currentTaskRef = useRef<UploadTaskHandle | null>(null);

  const userId = user?.id;

  // Fetch current user storage quota
  const refreshQuota = useCallback(() => {
    if (!userId) return;
    getUserStorageUsage(userId)
      .then((used) => {
        setCurrentUsage(used);
      })
      .catch((err) => {
        console.warn("Could not fetch user storage quota:", err);
      });
  }, [userId]);

  useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);


  const validateAndSetFile = useCallback((file: File) => {
    setError(null);
    setStatus("idle");
    setProgress(0);
    setLoadedBytes(0);

    // 1. Check max individual file size limit (100MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size (${formatBytes(file.size)}) exceeds the maximum ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }

    // 2. Check total storage quota
    const quotaLimit = getStorageLimitBytes();
    if (currentUsage + file.size > quotaLimit) {
      const remaining = Math.max(0, quotaLimit - currentUsage);
      setError(
        `Upload blocked: Storage quota exceeded. You have ${formatBytes(remaining)} remaining of your ${formatBytes(quotaLimit)} limit.`
      );
      return;
    }

    setSelectedFile(file);

    const lastDot = file.name.lastIndexOf('.');
    if (lastDot !== -1) {
      setBaseName(file.name.substring(0, lastDot));
      setExtension(file.name.substring(lastDot));
    } else {
      setBaseName(file.name);
      setExtension("");
    }
  }, [currentUsage]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (status === "uploading") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            validateAndSetFile(file);
            break;
          }
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [status, validateAndSetFile]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleCancel = () => {
    if (currentTaskRef.current) {
      currentTaskRef.current.abort();
    }
    setStatus("cancelled");
    setError("Upload cancelled by user.");
  };

  const handleUpload = () => {
    if (!selectedFile || !user) return;

    // Double check quota prior to dispatch
    const quotaLimit = getStorageLimitBytes();
    if (currentUsage + selectedFile.size > quotaLimit) {
      setError(`Cannot upload: Storage quota limit reached (${formatBytes(quotaLimit)}). Free up space to continue.`);
      return;
    }

    const finalFilename = `${baseName.trim() || "untitled"}${extension}`;

    setStatus("uploading");
    setProgress(0);
    setLoadedBytes(0);
    setError(null);

    const task = uploadFile(
      selectedFile,
      user.id,
      (prog, loaded) => {
        setProgress(prog);
        if (loaded) setLoadedBytes(loaded);
      },
      async (storagePath) => {
        try {
          let expires_at = null;
          if (expiryHours !== null) {
            const date = new Date();
            date.setHours(date.getHours() + expiryHours);
            expires_at = date.toISOString();
          }

          // Save metadata in database
          await addFileMetadata({
            owner_uid: user.id,
            filename: finalFilename,
            storage_path: storagePath,
            file_size: selectedFile.size,
            expires_at,
            folder_id: currentFolderId || null
          });
          
          setStatus("completed");
          setProgress(100);
          refreshQuota();

          setTimeout(() => {
            setSelectedFile(null);
            setBaseName("");
            setExtension("");
            setProgress(0);
            setStatus("idle");
            onUploadSuccess();
          }, 1200);
        } catch (err: unknown) {
          // Prevent orphaned files in Supabase Storage if database record creation fails
          console.error("Database insert failed. Cleaning up orphaned file in storage:", storagePath);
          try {
            await deleteFileFromStorage(storagePath);
          } catch (cleanErr) {
            console.error("Failed to delete orphaned storage object:", cleanErr);
          }

          const message = err instanceof Error ? err.message : "Failed to save file metadata.";
          setError(`${message} (Orphaned file cleaned up from storage).`);
          setStatus("failed");
        }
      },
      (err) => {
        setError(err.message || "Failed to upload file. Check network connection.");
        setStatus("failed");
      },
      finalFilename,
      () => {
        setStatus("cancelled");
        setError("Upload cancelled.");
      }
    );

    currentTaskRef.current = task;
  };

  const quotaLimit = getStorageLimitBytes();
  const percentUsed = Math.min(100, Math.round((currentUsage / quotaLimit) * 100));

  return (
    <div className="w-full bg-slate-800/50 rounded-2xl border border-slate-700 p-6 flex flex-col gap-4 shadow-xl">
      {/* Storage Quota Mini Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 px-3.5 py-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-blue-400" />
          <span className="font-medium text-slate-300">Storage Usage</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">
            {formatBytes(currentUsage)}
          </span>
          <span className="text-slate-500">/</span>
          <span>{formatBytes(quotaLimit)}</span>
          <span className="text-blue-400 font-medium">({percentUsed}%)</span>
        </div>
      </div>

      <div 
        className={`w-full relative border-2 border-dashed rounded-xl py-14 px-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer
          ${dragActive ? "border-blue-500 bg-blue-500/10" : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"}
          ${status === "uploading" ? "opacity-60 pointer-events-none" : ""}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          if (status !== "uploading") {
            inputRef.current?.click();
          }
        }}
      >
        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          onChange={handleChange}
          disabled={status === "uploading"}
        />
        
        {!selectedFile ? (
          <>
            <div className="p-3.5 bg-blue-500/10 rounded-2xl mb-3 border border-blue-500/20 text-blue-400">
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="text-slate-200 font-semibold text-base">Click or drag file here to upload</p>
            <p className="text-slate-400 text-xs mt-1.5">Max {MAX_FILE_SIZE_MB}MB per file • Clipboard paste supported</p>
          </>
        ) : (
          <div className="flex flex-col items-center w-full max-w-sm">
            <div className="p-3 bg-blue-500/10 rounded-xl mb-3 text-blue-400 border border-blue-500/20">
              <File className="w-8 h-8" />
            </div>
            
            {/* Editable Filename Input */}
            <div 
              className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 focus-within:border-blue-500 rounded-xl px-3 py-2 text-slate-200 text-sm w-full max-w-[280px]"
              onClick={(e) => e.stopPropagation()}
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value.replace(/[/\\?%*:|"<>]/g, ""))}
                disabled={status === "uploading"}
                className="bg-transparent outline-none w-full text-slate-200 font-medium placeholder-slate-500 text-center sm:text-left"
                placeholder="Rename file"
              />
              {extension && (
                <span className="text-slate-500 font-mono select-none shrink-0">{extension}</span>
              )}
            </div>

            <p className="text-slate-400 text-xs mt-2 font-mono">
              {formatBytes(selectedFile.size)}
            </p>
            
            {status !== "uploading" && (
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setSelectedFile(null); 
                  setBaseName(""); 
                  setExtension(""); 
                  setError(null);
                  setStatus("idle");
                }}
                className="mt-3 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Remove selection
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error / Alert Display */}
      {error && (
        <div className="flex items-start gap-2.5 text-red-400 text-sm bg-red-400/10 p-3.5 rounded-xl border border-red-400/20 animate-slide-up-fade">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs leading-relaxed">{error}</div>
        </div>
      )}

      {/* Uploading Status & Real Progress Bar */}
      {status === "uploading" && (
        <div className="w-full flex flex-col gap-2 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              Uploading... {loadedBytes > 0 && selectedFile && (
                <span className="text-slate-400">({formatBytes(loadedBytes)} / {formatBytes(selectedFile.size)})</span>
              )}
            </span>
            <span className="font-mono font-bold text-blue-400">{progress}%</span>
          </div>

          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/50">
            <div 
              className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full transition-all duration-150 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-end mt-1">
            <button
              onClick={handleCancel}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 font-medium"
            >
              <X className="w-3.5 h-3.5" /> Cancel Upload
            </button>
          </div>
        </div>
      )}

      {/* Completed Success Animation */}
      {status === "completed" && (
        <div className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-sm font-medium animate-scale-up">
          <CheckCircle2 className="w-4 h-4" />
          <span>Upload complete! Saved securely.</span>
        </div>
      )}

      {/* Action Controls & Options */}
      {selectedFile && status !== "uploading" && status !== "completed" && (
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="flex items-center gap-2 bg-slate-700/50 rounded-xl px-4 py-3 border border-slate-600 sm:w-1/3">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <select 
              className="bg-transparent text-slate-200 outline-none w-full text-xs font-medium appearance-none cursor-pointer"
              value={expiryHours === null ? "never" : expiryHours}
              onChange={(e) => setExpiryHours(e.target.value === "never" ? null : parseInt(e.target.value))}
            >
              <option value={1} className="bg-slate-800 text-slate-200">Expires in 1 Hour</option>
              <option value={6} className="bg-slate-800 text-slate-200">Expires in 6 Hours</option>
              <option value={24} className="bg-slate-800 text-slate-200">Expires in 24 Hours</option>
              <option value="never" className="bg-slate-800 text-slate-200">Never Expires</option>
            </select>
          </div>

          {status === "failed" || status === "cancelled" ? (
            <button
              onClick={handleUpload}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 text-sm"
            >
              <RotateCw className="w-4 h-4" /> Retry Upload
            </button>
          ) : (
            <button
              onClick={handleUpload}
              className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 text-sm"
            >
              <UploadCloud className="w-4 h-4" /> Upload File
            </button>
          )}
        </div>
      )}
    </div>
  );
};
