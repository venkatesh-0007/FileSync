"use client";

import { useState, useEffect } from "react";
import { Folder, X, Check, FolderRoot } from "lucide-react";
import { Folder as FolderType, FileMetadata } from "../lib/types";
import { getUserFolders, moveFileToFolder } from "../lib/db";
import { useAuth } from "./AuthProvider";

interface MoveFolderModalProps {
  file: FileMetadata;
  isOpen: boolean;
  onClose: () => void;
  onMoved: (updatedFile: FileMetadata) => void;
}

export const MoveFolderModal = ({ file, isOpen, onClose, onMoved }: MoveFolderModalProps) => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(file.folder_id || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (isOpen && user?.id) {
      getUserFolders(user.id)
        .then((data) => {
          if (active) {
            setFolders(data);
            setSelectedFolderId(file.folder_id || null);
          }
        })
        .catch(console.warn);
    }
    return () => {
      active = false;
    };
  }, [isOpen, user?.id, file.folder_id]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!user) return;
    try {
      setIsSubmitting(true);
      const updated = await moveFileToFolder(file.id, selectedFolderId, user.id, file.filename);
      onMoved(updated);
      onClose();
    } catch (err) {
      console.error("Failed to move file:", err);
      alert("Failed to move file to selected folder.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-backdrop-fade"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-slate-200 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-sm text-white">Move to Folder</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 truncate">
          Select destination folder for <span className="text-slate-200 font-medium">{file.filename}</span>
        </p>

        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
          {/* Root Option */}
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors text-left ${
              selectedFolderId === null 
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" 
                : "bg-slate-800/50 hover:bg-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderRoot className="w-4 h-4 text-slate-400" />
              <span>Root (No Folder)</span>
            </div>
            {selectedFolderId === null && <Check className="w-4 h-4 text-blue-400" />}
          </button>

          {/* User Folders */}
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors text-left ${
                selectedFolderId === folder.id 
                  ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" 
                  : "bg-slate-800/50 hover:bg-slate-800 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </div>
              {selectedFolderId === folder.id && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50"
          >
            {isSubmitting ? "Moving..." : "Save Move"}
          </button>
        </div>
      </div>
    </div>
  );
};
