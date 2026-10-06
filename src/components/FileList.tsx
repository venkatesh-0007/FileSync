"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  FileItem, 
  getFileType, 
  TextPreview 
} from "./FileItem";
import { FileMetadata, Folder as FolderType } from "../lib/types";
import { 
  getUserFiles, 
  getUserFolders, 
  createFolder, 
  deleteFolder, 
  deleteFileMetadata 
} from "../lib/db";
import { deleteFileFromStorage } from "../lib/storage";
import { useAuth } from "./AuthProvider";
import { 
  Loader2, 
  FolderOpen, 
  X, 
  Music, 
  Search, 
  Filter, 
  ArrowUpDown, 
  FolderPlus, 
  Folder as FolderIcon, 
  Trash2, 
  ChevronRight,
  Home
} from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "../lib/config";

interface FileListProps {
  refreshTrigger: number;
  activeTab?: "files" | "starred" | "trash" | "devices" | "activity";
  onStatsChange?: (usedBytes: number, activeFileCount: number) => void;
  onCurrentFolderChange?: (folderId: string | null) => void;
}

export const FileList = ({ 
  refreshTrigger, 
  activeTab = "files",
  onStatsChange,
  onCurrentFolderChange
}: FileListProps) => {
  const { user } = useAuth();
  const userId = user?.id;

  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "All Files" }
  ]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<{ file: FileMetadata; url: string } | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"uploaded_at" | "filename" | "file_size">("uploaded_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [referenceTime] = useState(() => Date.now());
  const [folderRefresh, setFolderRefresh] = useState(0);

  // Pagination state
  const [displayCount, setDisplayCount] = useState(DEFAULT_PAGE_SIZE);

  // New folder dialog
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Notify parent of folder changes
  const handleSelectFolder = (folderId: string | null, folderName = "All Files") => {
    setCurrentFolderId(folderId);
    if (onCurrentFolderChange) onCurrentFolderChange(folderId);

    if (folderId === null) {
      setFolderPath([{ id: null, name: "All Files" }]);
    } else {
      setFolderPath((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === folderId);
        if (existingIdx !== -1) {
          return prev.slice(0, existingIdx + 1);
        }
        return [...prev, { id: folderId, name: folderName }];
      });
    }
  };

  useEffect(() => {
    if (!userId) return;
    let active = true;

    const viewOption = activeTab === "trash" ? "trash" : activeTab === "starred" ? "starred" : "all";
    const filesPromise = getUserFiles(userId, {
      view: viewOption,
      folderId: activeTab === "files" ? currentFolderId : undefined,
    });
    const foldersPromise = activeTab === "files" ? getUserFolders(userId, currentFolderId) : Promise.resolve([]);

    Promise.all([filesPromise, foldersPromise])
      .then(([userFiles, userFolders]) => {
        if (!active) return;
        setFiles(userFiles);
        setFolders(userFolders);
        setLoading(false);
        setError(null);

        if (onStatsChange) {
          const activeFiles = userFiles.filter((f) => !f.is_deleted);
          const used = activeFiles.reduce((sum, f) => sum + (Number(f.file_size) || 0), 0);
          onStatsChange(used, activeFiles.length);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading files:", err);
        setError("Failed to load your files. Please check connection.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, activeTab, currentFolderId, onStatsChange, refreshTrigger, folderRefresh]);

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newFolderName.trim()) return;
    try {
      const created = await createFolder(userId, newFolderName.trim(), currentFolderId);
      setFolders((prev) => [...prev, created]);
      setNewFolderName("");
      setIsCreatingFolder(false);
    } catch (err) {
      console.error("Create folder error:", err);
      alert("Failed to create folder.");
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Delete folder "${folderName}"? Files inside will be moved to root.`)) return;
    try {
      await deleteFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setFolderRefresh((prev) => prev + 1);
    } catch (err) {
      console.error("Delete folder error:", err);
      alert("Failed to delete folder.");
    }
  };

  const handleDelete = (deletedId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== deletedId));
  };

  const handleUpdate = (updatedFile: FileMetadata) => {
    setFiles((prev) => prev.map((f) => f.id === updatedFile.id ? updatedFile : f));
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Are you sure you want to permanently delete all items in Trash? This cannot be undone.")) return;
    const trashedFiles = [...files];
    setLoading(true);
    for (const f of trashedFiles) {
      try {
        await deleteFileFromStorage(f.storage_path);
        await deleteFileMetadata(f.id);
      } catch (err) {
        console.warn("Empty trash file failed:", f.filename, err);
      }
    }
    setFiles([]);
    setLoading(false);
  };

  // Client-side filtering & search for instantaneous responsiveness
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      // 1. Search Query
      if (searchQuery.trim() && !file.filename.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
        return false;
      }

      // 2. Type Filter
      if (selectedType !== "all") {
        const type = getFileType(file.filename);
        if (selectedType === "image" && type !== "image") return false;
        if (selectedType === "pdf" && type !== "pdf") return false;
        if (selectedType === "video" && type !== "video") return false;
        if (selectedType === "audio" && type !== "audio") return false;
        if (selectedType === "text" && type !== "text") return false;
        if (selectedType === "office" && type !== "office") return false;
      }

      // 3. Date Filter
      if (dateFilter !== "all") {
        const fileTime = new Date(file.uploaded_at).getTime();
        if (dateFilter === "today" && referenceTime - fileTime > 24 * 60 * 60 * 1000) return false;
        if (dateFilter === "week" && referenceTime - fileTime > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === "month" && referenceTime - fileTime > 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === "uploaded_at") {
        comparison = new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
      } else if (sortBy === "filename") {
        comparison = a.filename.localeCompare(b.filename);
      } else if (sortBy === "file_size") {
        comparison = a.file_size - b.file_size;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [files, searchQuery, selectedType, dateFilter, sortBy, sortOrder, referenceTime]);

  const pagedFiles = filteredFiles.slice(0, displayCount);
  const hasMore = filteredFiles.length > displayCount;

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
            className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl animate-scale-up" 
            onClick={(e) => e.stopPropagation()} 
          />
        );
      case 'pdf':
        return (
          <iframe 
            src={url} 
            className="w-full h-[75vh] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-scale-up" 
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
            className="w-full max-w-3xl bg-black rounded-xl overflow-hidden border border-slate-700 shadow-2xl animate-scale-up"
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
            className="w-full h-[75vh] flex flex-col rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-950 px-4 py-2 text-xs text-slate-400 border-b border-slate-800 flex justify-between items-center shrink-0">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Office Document Preview
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
          <div className="text-slate-400 p-8 text-center bg-slate-900 border border-slate-700 rounded-xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
            Preview not available for this file type.
          </div>
        );
    }
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Search, Filter, Sort and Folder Header Controls */}
      <div className="flex flex-col gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
        {/* Top: Search bar & Sort controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files by name..."
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 text-xs text-slate-200 pl-9 pr-8 py-2.5 rounded-xl outline-none transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const parts = e.target.value.split("-");
                  setSortBy(parts[0] as "uploaded_at" | "filename" | "file_size");
                  setSortOrder(parts[1] as "asc" | "desc");
                }}
                className="bg-transparent outline-none text-xs text-slate-200 cursor-pointer"
              >
                <option value="uploaded_at-desc" className="bg-slate-900">Newest first</option>
                <option value="uploaded_at-asc" className="bg-slate-900">Oldest first</option>
                <option value="filename-asc" className="bg-slate-900">Name (A-Z)</option>
                <option value="filename-desc" className="bg-slate-900">Name (Z-A)</option>
                <option value="file_size-desc" className="bg-slate-900">Size (Largest)</option>
                <option value="file_size-asc" className="bg-slate-900">Size (Smallest)</option>
              </select>
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as "all" | "today" | "week" | "month")}
                className="bg-transparent outline-none text-xs text-slate-200 cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All dates</option>
                <option value="today" className="bg-slate-900">Past 24 hours</option>
                <option value="week" className="bg-slate-900">Past 7 days</option>
                <option value="month" className="bg-slate-900">Past 30 days</option>
              </select>
            </div>

            {/* New Folder Button (only on normal Files tab) */}
            {activeTab === "files" && (
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="p-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-xl transition-colors shrink-0 flex items-center gap-1 text-xs font-medium"
                title="Create folder"
              >
                <FolderPlus className="w-4 h-4" />
                <span className="hidden md:inline">New Folder</span>
              </button>
            )}

            {/* Empty Trash Button (only on Trash tab) */}
            {activeTab === "trash" && files.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-colors shrink-0 flex items-center gap-1 text-xs font-medium"
                title="Empty Trash"
              >
                <Trash2 className="w-4 h-4" />
                <span>Empty Trash</span>
              </button>
            )}
          </div>
        </div>

        {/* File Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs select-none">
          {[
            { id: "all", label: "All Files" },
            { id: "image", label: "Images" },
            { id: "pdf", label: "PDFs" },
            { id: "video", label: "Videos" },
            { id: "audio", label: "Audio" },
            { id: "text", label: "Documents / Code" },
            { id: "office", label: "Office" },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-3 py-1 rounded-lg transition-colors font-medium shrink-0 ${
                selectedType === type.id
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-900/30"
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Breadcrumbs (when inside folders) */}
      {activeTab === "files" && folderPath.length > 1 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/40 px-3.5 py-2 rounded-xl border border-slate-800">
          <button
            onClick={() => handleSelectFolder(null)}
            className="hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Root</span>
          </button>
          {folderPath.slice(1).map((crumb, idx) => (
            <div key={crumb.id || idx} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <button
                onClick={() => handleSelectFolder(crumb.id, crumb.name)}
                className={`hover:text-blue-400 transition-colors ${
                  idx === folderPath.length - 2 ? "font-bold text-white" : ""
                }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New Folder Inline Form */}
      {isCreatingFolder && (
        <form 
          onSubmit={handleCreateFolderSubmit}
          className="flex items-center gap-2 p-3 bg-slate-900 border border-blue-500/40 rounded-xl animate-scale-up"
        >
          <FolderIcon className="w-4 h-4 text-amber-400 shrink-0" />
          <input 
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            autoFocus
            className="bg-transparent text-xs text-white outline-none flex-1 font-medium"
          />
          <button 
            type="button" 
            onClick={() => setIsCreatingFolder(false)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={!newFolderName.trim()}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 py-1 rounded-lg disabled:opacity-50"
          >
            Create
          </button>
        </form>
      )}

      {/* Subfolders Grid */}
      {activeTab === "files" && folders.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Folders</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {folders.map((folder) => (
              <div 
                key={folder.id}
                onClick={() => handleSelectFolder(folder.id, folder.name)}
                className="group p-3 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 hover:border-blue-500/50 rounded-xl cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FolderIcon className="w-5 h-5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-slate-200 truncate group-hover:text-white">
                    {folder.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id, folder.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-opacity"
                  title="Delete folder"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Files Display */}
      {loading ? (
        <div className="w-full flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center text-xs">
          {error}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="w-full bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-slate-800 p-4 rounded-full mb-3 text-slate-400">
            {activeTab === "trash" ? <Trash2 className="w-8 h-8 text-slate-400" /> : <FolderOpen className="w-8 h-8" />}
          </div>
          <h3 className="text-base font-semibold text-slate-200 mb-1">
            {activeTab === "trash" 
              ? "Trash is empty" 
              : activeTab === "starred" 
              ? "No starred files" 
              : searchQuery 
              ? "No matching files" 
              : "No files in this folder"}
          </h3>
          <p className="text-slate-400 text-xs max-w-sm">
            {activeTab === "trash" 
              ? "Files moved to trash will appear here. Trashed items are automatically cleaned up after 30 days." 
              : activeTab === "starred" 
              ? "Star files in your collection to quickly access your favorites here."
              : "Upload files from your device to access and synchronize them anytime."}
          </p>
        </div>
      ) : (
        <>
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pagedFiles.map((file, index) => (
              <FileItem 
                key={file.id} 
                file={file} 
                index={index} 
                isTrash={activeTab === "trash"}
                onDelete={handleDelete} 
                onPreview={(url) => setActivePreview({ file, url })}
                onUpdate={handleUpdate}
              />
            ))}
          </div>

          {/* Load More Pagination */}
          {hasMore && (
            <div className="w-full flex justify-center pt-2">
              <button
                onClick={() => setDisplayCount((prev) => prev + DEFAULT_PAGE_SIZE)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all shadow-md"
              >
                Load More Files ({filteredFiles.length - pagedFiles.length} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Full screen preview modal */}
      {activePreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 md:p-8 backdrop-blur-sm animate-backdrop-fade" 
          onClick={() => setActivePreview(null)}
        >
          <div className="relative max-w-5xl w-full flex justify-center items-center">
            <button 
              className="absolute -top-14 right-0 p-2.5 text-white/70 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-full transition-all hover:scale-110 active:scale-95 shadow-lg z-10"
              onClick={(e) => { e.stopPropagation(); setActivePreview(null); }}
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
            {renderPreviewContent()}
          </div>
        </div>
      )}
    </div>
  );
};
