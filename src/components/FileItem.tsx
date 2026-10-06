"use client";

import { useState, useEffect } from "react";
import { 
  Download, 
  Trash2, 
  File, 
  Loader2, 
  Eye, 
  FileImage, 
  FileText, 
  Video, 
  Music, 
  FileSpreadsheet, 
  FileCode,
  Smartphone,
  Tablet as TabletIcon,
  Monitor,
  Laptop,
  Pencil,
  Star,
  Share2,
  FolderInput,
  RotateCcw,
  Info
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FileMetadata } from "../lib/types";
import { getFileDownloadURL, deleteFileFromStorage } from "../lib/storage";
import { 
  deleteFileMetadata, 
  updateFileMetadata, 
  softDeleteFile, 
  restoreFileFromTrash, 
  toggleStarFile 
} from "../lib/db";
import { formatBytes } from "../lib/config";
import { ShareModal } from "./ShareModal";
import { MoveFolderModal } from "./MoveFolderModal";
import { FileDetailsModal } from "./FileDetailsModal";
import { useAuth } from "./AuthProvider";

// Detect file type category based on extension
export const getFileType = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  if (['mp4', 'webm', 'ogv', 'mov', 'mkv'].includes(ext)) return 'video';
  if (['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'go', 'rs', 'sh', 'yaml', 'yml', 'xml', 'csv', 'ini', 'conf', 'log'].includes(ext)) return 'text';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office';
  return 'unknown';
};

// Map file types to appropriate Lucide icons and Tailwind styles
export const getFileIconInfo = (filename: string) => {
  const type = getFileType(filename);
  switch (type) {
    case 'image':
      return { icon: FileImage, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    case 'pdf':
      return { icon: FileText, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    case 'audio':
      return { icon: Music, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
    case 'video':
      return { icon: Video, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' };
    case 'text':
      return { icon: FileCode, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    case 'office': {
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      if (['xls', 'xlsx'].includes(ext)) {
        return { icon: FileSpreadsheet, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' };
      }
      return { icon: FileText, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    }
    default:
      return { icon: File, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
  }
};

// Parse encoded device type from storage path
const getDeviceFromPath = (path: string): 'PC' | 'Mobile' | 'Tablet' | 'Unknown' => {
  if (path.includes('_dev-Mobile_') || path.includes('_[Mobile]_')) return 'Mobile';
  if (path.includes('_dev-Tablet_') || path.includes('_[Tablet]_')) return 'Tablet';
  if (path.includes('_dev-PC_') || path.includes('_[PC]_')) return 'PC';
  return 'Unknown';
};

const getDeviceBadgeInfo = (deviceType: 'PC' | 'Mobile' | 'Tablet' | 'Unknown') => {
  switch (deviceType) {
    case 'PC':
      return { icon: Monitor, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };
    case 'Mobile':
      return { icon: Smartphone, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' };
    case 'Tablet':
      return { icon: TabletIcon, color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' };
    default:
      return { icon: Laptop, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
  }
};

// TextPreview component to load and safely render text content in dark mode styling
export const TextPreview = ({ url, filename }: { url: string; filename: string }) => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load text content");
        const text = await res.text();
        setContent(text.slice(0, 1024 * 1024)); 
      } catch (err) {
        console.error(err);
        setError("Could not load text content.");
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [url]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 w-full" onClick={(e) => e.stopPropagation()}>
        <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
        <p>Loading document content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-center p-8 w-full" onClick={(e) => e.stopPropagation()}>
        {error}
      </div>
    );
  }

  return (
    <div 
      className="w-full max-w-4xl flex flex-col bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-2xl animate-scale-up"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-slate-950 px-4 py-2.5 text-xs text-slate-400 border-b border-slate-800 flex justify-between items-center shrink-0">
        <span className="font-medium">{filename}</span>
        <span>Text Preview</span>
      </div>
      <pre className="w-full max-h-[70vh] overflow-auto text-left p-6 text-slate-300 font-mono text-sm whitespace-pre-wrap leading-relaxed select-text">
        {content}
      </pre>
    </div>
  );
};

interface FileItemProps {
  file: FileMetadata;
  index: number;
  isTrash?: boolean;
  onDelete: (fileId: string) => void;
  onPreview: (url: string) => void;
  onUpdate: (updatedFile: FileMetadata) => void;
}

export const FileItem = ({ 
  file, 
  index, 
  isTrash = false, 
  onDelete, 
  onPreview, 
  onUpdate 
}: FileItemProps) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Modals state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Edit details behind flip
  const [isEditing, setIsEditing] = useState(false);
  const [editedBaseName, setEditedBaseName] = useState("");
  const [editedExpiryOption, setEditedExpiryOption] = useState("keep");
  const [isSaving, setIsSaving] = useState(false);

  const extIndex = file.filename.lastIndexOf('.');
  const ext = extIndex !== -1 ? file.filename.substring(extIndex) : "";

  const isImage = getFileType(file.filename) === 'image';
  const isPreviewable = getFileType(file.filename) !== 'unknown';
  const deviceType = getDeviceFromPath(file.storage_path);
  const deviceBadge = getDeviceBadgeInfo(deviceType);
  const DeviceIcon = deviceBadge.icon;

  useEffect(() => {
    let active = true;
    if (isImage) {
      getFileDownloadURL(file.storage_path)
        .then((url) => {
          if (active) setThumbnailUrl(url);
        })
        .catch(console.warn);
    }
    return () => { active = false; };
  }, [file.storage_path, isImage]);

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = !file.is_starred;
      onUpdate({ ...file, is_starred: newStatus });
      await toggleStarFile(file.id, newStatus);
    } catch (err) {
      console.error("Star toggle error:", err);
      onUpdate(file); // revert
    }
  };

  const handleSaveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editedBaseName.trim()) {
      alert("Filename cannot be empty.");
      return;
    }
    const newFilename = `${editedBaseName.trim()}${ext}`;

    let newExpiresAt: string | null | undefined = undefined;
    if (editedExpiryOption === "1h") {
      newExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    } else if (editedExpiryOption === "6h") {
      newExpiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    } else if (editedExpiryOption === "24h") {
      newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (editedExpiryOption === "never") {
      newExpiresAt = null;
    }

    try {
      setIsSaving(true);
      const updatedFile = await updateFileMetadata(file.id, newFilename, newExpiresAt);
      setIsEditing(false);
      onUpdate(updatedFile);
    } catch (err) {
      console.error("Failed to update file:", err);
      alert("Failed to update file details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      alert("Failed to download file. It may have expired.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Trash handling: Soft delete or Permanent delete
  const handleDeleteAction = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isTrash) {
      // Permanent Delete
      if (!confirm(`Permanently delete "${file.filename}"? This action cannot be undone.`)) return;
      try {
        setIsDeleting(true);
        await deleteFileFromStorage(file.storage_path);
        await deleteFileMetadata(file.id);
        onDelete(file.id);
      } catch (err) {
        console.error("Permanent delete failed:", err);
        alert("Failed to permanently delete file.");
      } finally {
        setIsDeleting(false);
      }
    } else {
      // Soft Delete -> Move to Trash
      try {
        setIsDeleting(true);
        if (user) {
          await softDeleteFile(file.id, user.id, file.filename);
        }
        onDelete(file.id);
      } catch (err) {
        console.error("Move to trash failed:", err);
        alert("Failed to move file to trash.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Restore from Trash
  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsDeleting(true);
      if (user) {
        await restoreFileFromTrash(file.id, user.id, file.filename);
      }
      onDelete(file.id);
    } catch (err) {
      console.error("Restore failed:", err);
      alert("Failed to restore file.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isImage && thumbnailUrl) {
      onPreview(thumbnailUrl);
      return;
    }

    try {
      setIsPreviewLoading(true);
      const url = await getFileDownloadURL(file.storage_path);
      onPreview(url);
    } catch (error) {
      console.error("Preview failed:", error);
      alert("Failed to load preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const dateObj = new Date(file.uploaded_at);
  const timeAgo = !isNaN(dateObj.getTime()) 
    ? formatDistanceToNow(dateObj, { addSuffix: true }) 
    : 'recently';

  const iconInfo = getFileIconInfo(file.filename);
  const IconComponent = iconInfo.icon;

  return (
    <>
      <div 
        style={{ animationDelay: `${index * 50}ms` }}
        className="perspective-1000 w-full h-64 relative select-none animate-slide-up-fade"
      >
        <div 
          className={`w-full h-full relative transition-transform duration-500 ease-in-out preserve-3d ${
            isExpanded ? 'rotate-y-180' : ''
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* FRONT FACE */}
          <div className="backface-hidden absolute inset-0 w-full h-full bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/60 hover:border-slate-500 rounded-2xl p-4 flex flex-col justify-between shadow-md transition-all duration-300">
            {/* Top Bar: Device badge & Star button */}
            <div className="flex items-center justify-between shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${deviceBadge.color}`}>
                <DeviceIcon className="w-3.5 h-3.5" />
                <span>{deviceType}</span>
              </div>

              {!isTrash && (
                <button
                  onClick={handleToggleStar}
                  className={`p-1.5 rounded-lg transition-colors ${
                    file.is_starred 
                      ? "text-amber-400 hover:text-amber-300 bg-amber-400/10" 
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/40"
                  }`}
                  title={file.is_starred ? "Remove from starred" : "Star file"}
                >
                  <Star className={`w-4 h-4 ${file.is_starred ? "fill-amber-400" : ""}`} />
                </button>
              )}
            </div>

            {/* Thumbnail preview / Icon */}
            <div className="flex-1 flex items-center justify-center min-h-0 py-1">
              {isImage && thumbnailUrl ? (
                <img 
                  src={thumbnailUrl} 
                  alt={file.filename} 
                  className="max-h-24 max-w-full object-contain rounded-xl shadow-md transition-transform hover:scale-105" 
                  onClick={(e) => e.stopPropagation()} 
                />
              ) : (
                <div className={`p-4 rounded-2xl border shrink-0 transition-transform hover:scale-105 ${iconInfo.color}`}>
                  <IconComponent className="w-9 h-9" />
                </div>
              )}
            </div>

            {/* Middle: Title & Size info */}
            <div className="flex flex-col min-w-0 shrink-0 text-center px-1">
              <span className="text-slate-200 font-semibold text-xs sm:text-sm truncate" title={file.filename}>
                {file.filename}
              </span>
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                <span>{formatBytes(file.file_size)}</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full" />
                <span>{timeAgo}</span>
              </div>
            </div>

            {/* Bottom Actions Toolbar */}
            <div className="flex items-center justify-between border-t border-slate-700/40 pt-2.5 mt-2 shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsDetailsOpen(true); }}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 rounded-lg transition-colors"
                  title="File details"
                >
                  <Info className="w-4 h-4" />
                </button>
                {!isTrash && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="Share / Cross-device transfer"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsMoveOpen(true); }}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                      title="Move to folder"
                    >
                      <FolderInput className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                {isTrash ? (
                  <>
                    <button
                      onClick={handleRestore}
                      disabled={isDeleting}
                      className="px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors flex items-center gap-1 font-medium"
                      title="Restore file"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={handleDeleteAction}
                      disabled={isDeleting}
                      className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Permanently delete"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </>
                ) : (
                  <>
                    {isPreviewable && (
                      <button
                        onClick={handlePreview}
                        disabled={isDeleting || isDownloading || isPreviewLoading}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                        title="Preview"
                      >
                        {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading || isDeleting}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="Download"
                    >
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleDeleteAction}
                      disabled={isDeleting || isDownloading}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Move to trash"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* BACK FACE (Flip Card for Fast Inline Edit) */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="backface-hidden rotate-y-180 absolute inset-0 w-full h-full bg-slate-900 border border-blue-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
              <span className="text-slate-200 text-xs font-semibold uppercase tracking-wider">
                {isEditing ? "Edit File Details" : "Quick Actions"}
              </span>
              <div className="flex items-center gap-1.5">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="text-white bg-blue-600 hover:bg-blue-500 text-xs px-2.5 py-1 rounded font-medium flex items-center gap-1"
                    >
                      {isSaving && <Loader2 className="w-3 h-3 animate-spin" />} Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      const lastDot = file.filename.lastIndexOf('.');
                      setEditedBaseName(lastDot !== -1 ? file.filename.substring(0, lastDot) : file.filename);
                      setIsEditing(true);
                    }}
                    className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-2.5 my-auto text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Rename File</label>
                  <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-700">
                    <input
                      type="text"
                      value={editedBaseName}
                      onChange={(e) => setEditedBaseName(e.target.value)}
                      className="bg-transparent text-slate-200 outline-none w-full"
                    />
                    <span className="text-slate-500 font-mono">{ext}</span>
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">New Expiry Option</label>
                  <select
                    value={editedExpiryOption}
                    onChange={(e) => setEditedExpiryOption(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none"
                  >
                    <option value="keep">Keep Current Expiry</option>
                    <option value="1h">Expire in 1 Hour</option>
                    <option value="6h">Expire in 6 Hours</option>
                    <option value="24h">Expire in 24 Hours</option>
                    <option value="never">Never Expire</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 my-auto text-xs text-slate-300">
                <p className="truncate"><strong>Filename:</strong> {file.filename}</p>
                <p><strong>Size:</strong> {formatBytes(file.file_size)}</p>
                <p><strong>Uploaded:</strong> {new Date(file.uploaded_at).toLocaleDateString()}</p>
                <p><strong>Device:</strong> {deviceType}</p>
              </div>
            )}

            <button
              onClick={() => setIsExpanded(false)}
              className="w-full py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg text-center font-medium"
            >
              Flip Back to Preview
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ShareModal 
        file={file} 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
      />

      <MoveFolderModal 
        file={file} 
        isOpen={isMoveOpen} 
        onClose={() => setIsMoveOpen(false)} 
        onMoved={(updated) => onUpdate(updated)} 
      />

      <FileDetailsModal 
        file={file} 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
      />
    </>
  );
};
