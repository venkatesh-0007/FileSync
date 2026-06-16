"use client";

import { useState, useEffect } from "react";
import { 
  Download, 
  Trash2, 
  File, 
  Loader2, 
  Eye, 
  X,
  FileImage, 
  FileText, 
  Video, 
  Music, 
  FileSpreadsheet, 
  FileCode,
  Smartphone,
  Tablet as TabletIcon,
  Monitor,
  Laptop
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FileMetadata } from "../lib/types";
import { getFileDownloadURL, deleteFileFromStorage } from "../lib/storage";
import { deleteFileMetadata } from "../lib/db";

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
const getFileIconInfo = (filename: string) => {
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
    case 'office':
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      if (['xls', 'xlsx'].includes(ext)) {
        return { icon: FileSpreadsheet, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' };
      }
      return { icon: FileText, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
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

// Get device badge color and icon
const getDeviceBadgeInfo = (deviceType: 'PC' | 'Mobile' | 'Tablet' | 'Unknown') => {
  switch (deviceType) {
    case 'PC':
      return { icon: Monitor, color: 'text-sky-400 bg-sky-500/10 border border-sky-500/20' };
    case 'Mobile':
      return { icon: Smartphone, color: 'text-violet-400 bg-violet-500/10 border border-violet-500/20' };
    case 'Tablet':
      return { icon: TabletIcon, color: 'text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20' };
    default:
      return { icon: Laptop, color: 'text-slate-400 bg-slate-500/10 border border-slate-500/20' };
  }
};

const formatSizeInMB = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.01) return "< 0.01 MB";
  return mb.toFixed(2) + " MB";
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
        // Limit preview size to 1MB to avoid locking browser
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
  onDelete: (fileId: string) => void;
  onPreview: (url: string) => void;
}

export const FileItem = ({ file, index, onDelete, onPreview }: FileItemProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // For small image thumbnail (pre-fetched on mount)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  
  // For modal preview (fetched on click for non-images to avoid token expiration and excess requests)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const isImage = getFileType(file.filename) === 'image';
  const isPreviewable = getFileType(file.filename) !== 'unknown';
  const deviceType = getDeviceFromPath(file.storage_path);
  const deviceBadge = getDeviceBadgeInfo(deviceType);

  useEffect(() => {
    const fetchThumbnail = async () => {
      if (isImage) {
        try {
          const url = await getFileDownloadURL(file.storage_path);
          setThumbnailUrl(url);
        } catch (error) {
          console.error("Failed to load thumbnail for", file.filename, error);
        }
      }
    };
    fetchThumbnail();
  }, [file, isImage]);

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
      alert("Failed to download file. It may have been deleted.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handlePreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // If it's an image and we already have thumbnailUrl, use it
    if (isImage && thumbnailUrl) {
      onPreview(thumbnailUrl);
      return;
    }

    try {
      setIsPreviewLoading(true);
      // Generate a fresh signed URL (valid for 60 seconds)
      const url = await getFileDownloadURL(file.storage_path);
      onPreview(url);
    } catch (error) {
      console.error("Failed to load preview for", file.filename, error);
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
    <div 
      style={{ animationDelay: `${index * 60}ms` }}
      className="perspective-1000 w-full h-60 relative select-none animate-slide-up-fade"
    >
      <div 
        className={`w-full h-full relative transition-transform duration-500 ease-in-out preserve-3d ${
          isExpanded ? 'rotate-y-180' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Front Face: The main card preview and basic details */}
        <div className="backface-hidden absolute inset-0 w-full h-full bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300">
          {/* Top: Thumbnail preview / Styled File icon */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-2">
            {isImage && thumbnailUrl ? (
              <img 
                src={thumbnailUrl} 
                alt={file.filename} 
                className="max-h-24 max-w-full object-contain rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-105" 
                onClick={(e) => e.stopPropagation()} 
              />
            ) : (
              <div className={`p-4 rounded-xl border shrink-0 transition-transform duration-300 group-hover:scale-105 ${iconInfo.color}`}>
                <IconComponent className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* Middle: Title & Exact MB Size */}
          <div className="flex flex-col min-w-0 mt-2 shrink-0">
            <span className="text-slate-200 font-medium truncate text-center" title={file.filename}>
              {file.filename}
            </span>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-1">
              <span>{formatSizeInMB(file.file_size)}</span>
              <span className="w-1 h-1 bg-slate-600 rounded-full" />
              <span>{timeAgo}</span>
            </div>
          </div>

          {/* Bottom: Action Buttons */}
          <div className="flex items-center justify-between border-t border-slate-700/30 pt-3 mt-3 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 hover:underline"
              title="Show details"
            >
              Details
            </button>
            <div className="flex items-center gap-1.5">
              {isPreviewable && (
                <button
                  onClick={handlePreview}
                  disabled={isDeleting || isDownloading || isPreviewLoading}
                  className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                  title="Preview file"
                >
                  {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={handleDownload}
                disabled={isDownloading || isDeleting}
                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                title="Download file"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || isDownloading}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                title="Delete file"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Back Face: Flip Details */}
        <div 
          onClick={(e) => e.stopPropagation() /* Prevent flipping back when clicking details page */}
          className="backface-hidden rotate-y-180 absolute inset-0 w-full h-full bg-slate-900 border border-blue-500/30 rounded-xl p-4 flex flex-col justify-between shadow-lg"
        >
          {/* Top: Details title & Flip Back */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
            <span className="text-slate-200 text-xs font-semibold uppercase tracking-wider">File Details</span>
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1 rounded-md transition-colors"
              title="Back to front"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Middle: Details Grid (Storage Key Removed, Exact MB Size Added) */}
          <div className="flex-1 flex flex-col justify-start gap-2 py-3 overflow-y-auto text-xs min-h-0 select-text no-scrollbar">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-500">Device</span>
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${deviceBadge.color}`}>
                <deviceBadge.icon className="w-3.5 h-3.5" />
                {deviceType}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-500">Size (MB)</span>
              <span className="font-mono text-slate-200">{formatSizeInMB(file.file_size)}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-500">Extension</span>
              <span className="uppercase font-mono text-slate-200">{file.filename.split('.').pop() || 'None'}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-500">Uploaded</span>
              <span className="text-slate-200 text-right truncate max-w-[140px]" title={new Date(file.uploaded_at).toLocaleString()}>
                {new Date(file.uploaded_at).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Expires</span>
              <span className="text-slate-200 text-right truncate max-w-[140px]" title={file.expires_at ? new Date(file.expires_at).toLocaleString() : 'Never'}>
                {file.expires_at ? new Date(file.expires_at).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>

          {/* Bottom Part: Action Buttons */}
          <div className="border-t border-slate-800 pt-3 mt-auto shrink-0 flex justify-end gap-1.5">
            {isPreviewable && (
              <button
                onClick={handlePreview}
                disabled={isDeleting || isDownloading || isPreviewLoading}
                className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                title="Preview file"
              >
                {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={isDownloading || isDeleting}
              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
              title="Download file"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting || isDownloading}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
              title="Delete file"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};


