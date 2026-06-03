"use client";

import { useState, useRef } from "react";
import { UploadCloud, File, X, Clock } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { uploadFile } from "../lib/storage";
import { addFileMetadata } from "../lib/db";

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const FileUpload = ({ onUploadSuccess }: { onUploadSuccess: () => void }) => {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expiryHours, setExpiryHours] = useState<number | null>(6);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const validateAndSetFile = (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    uploadFile(
      selectedFile,
      user.id, // Supabase user ID
      (prog) => {
        setProgress(Math.round(prog));
      },
      async (storagePath) => {
        try {
          let expires_at = null;
          if (expiryHours !== null) {
            const date = new Date();
            date.setHours(date.getHours() + expiryHours);
            expires_at = date.toISOString();
          }

          await addFileMetadata({
            owner_uid: user.id,
            filename: selectedFile.name,
            storage_path: storagePath,
            file_size: selectedFile.size,
            expires_at,
          });
          
          setUploading(false);
          setSelectedFile(null);
          setProgress(0);
          onUploadSuccess();
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Failed to save file metadata.");
          setUploading(false);
        }
      },
      (err) => {
        setError(err.message || "Failed to upload file.");
        setUploading(false);
      }
    );
  };

  return (
    <div className="w-full bg-slate-800/50 rounded-2xl border border-slate-700 p-6 flex flex-col gap-4">
      <div 
        className={`w-full relative border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-colors cursor-pointer
          ${dragActive ? "border-blue-500 bg-blue-500/10" : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"}
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          onChange={handleChange}
          disabled={uploading}
        />
        
        {!selectedFile ? (
          <>
            <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-slate-200 font-medium">Click or drag file to this area to upload</p>
            <p className="text-slate-400 text-sm mt-2">Maximum file size: {MAX_FILE_SIZE_MB}MB</p>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <File className="w-10 h-10 text-blue-400 mb-3" />
            <p className="text-slate-200 font-medium break-all">{selectedFile.name}</p>
            <p className="text-slate-400 text-sm mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            
            {!uploading && (
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                className="mt-4 flex items-center gap-1 text-sm text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-full transition-colors"
              >
                <X className="w-4 h-4" /> Remove
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm text-center bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}

      {uploading && (
        <div className="w-full flex flex-col gap-2 mt-2">
          <div className="flex justify-between text-sm text-slate-300">
            <span>Uploading...</span>
            <span className="font-medium text-blue-400">{progress}%</span>
          </div>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {selectedFile && !uploading && (
        <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full">
          <div className="flex items-center gap-2 bg-slate-700/50 rounded-xl px-4 py-3 border border-slate-600 sm:w-1/3">
            <Clock className="w-5 h-5 text-slate-400 shrink-0" />
            <select 
              className="bg-transparent text-slate-200 outline-none w-full text-sm appearance-none"
              value={expiryHours === null ? "never" : expiryHours}
              onChange={(e) => setExpiryHours(e.target.value === "never" ? null : parseInt(e.target.value))}
            >
              <option value={1}>Expires in 1 Hour</option>
              <option value={6}>Expires in 6 Hours</option>
              <option value={24}>Expires in 24 Hours</option>
              <option value="never">Never Expires</option>
            </select>
          </div>
          <button
            onClick={handleUpload}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
          >
            Upload File
          </button>
        </div>
      )}
    </div>
  );
};
