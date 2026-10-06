"use client";

import { useEffect, useState, use } from "react";
import { 
  Download, 
  File, 
  Loader2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  ExternalLink 
} from "lucide-react";
import Link from "next/link";
import { getFileShareByToken, incrementShareDownload } from "@/lib/db";
import { getFileDownloadURL } from "@/lib/storage";
import { formatBytes } from "@/lib/config";
import { FileMetadata, FileShare } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [shareData, setShareData] = useState<(FileShare & { file: FileMetadata }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchShare = async () => {
      try {
        setLoading(true);
        const data = await getFileShareByToken(token);
        if (!data) {
          setError("This transfer link is invalid, expired, or has been revoked.");
        } else if (data.is_revoked) {
          setError("This transfer link has been revoked by the owner.");
        } else if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
          setError("This transfer link has expired.");
        } else {
          setShareData(data);
        }
      } catch (err) {
        console.error("Error fetching share:", err);
        setError("Could not load shared file.");
      } finally {
        setLoading(false);
      }
    };

    fetchShare();
  }, [token]);

  const handleDownload = async () => {
    if (!shareData?.file) return;
    try {
      setIsDownloading(true);
      const downloadUrl = await getFileDownloadURL(shareData.file.storage_path);
      await incrementShareDownload(shareData.id);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = shareData.file.filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed. The file may have expired or been removed.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Mini Brand Nav */}
      <header className="border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
          <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            FS
          </span>
          <span>FileSync</span>
        </Link>
        <Link 
          href="/dashboard" 
          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-medium"
        >
          <span>Open Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm">Retrieving secure transfer...</p>
          </div>
        ) : error ? (
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center flex flex-col items-center gap-4 shadow-2xl">
            <div className="p-3 bg-red-500/10 rounded-full text-red-400 border border-red-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-white">Transfer Unavailable</h2>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{error}</p>
            <Link 
              href="/"
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium underline"
            >
              Go to FileSync Home
            </Link>
          </div>
        ) : shareData && (
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl backdrop-blur-sm animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Cross-Device File Transfer</span>
              </div>
              {shareData.expires_at && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires {formatDistanceToNow(new Date(shareData.expires_at), { addSuffix: true })}</span>
                </div>
              )}
            </div>

            {/* File Info Card */}
            <div className="flex flex-col items-center text-center p-6 bg-slate-950/60 rounded-xl border border-slate-800/80 gap-3">
              <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow-inner">
                <File className="w-12 h-12" />
              </div>
              <div className="w-full">
                <h1 className="text-lg font-bold text-white truncate max-w-sm" title={shareData.file.filename}>
                  {shareData.file.filename}
                </h1>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-1">
                  <span>{formatBytes(shareData.file.file_size)}</span>
                  <span>•</span>
                  <span>{shareData.download_count} previous downloads</span>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold py-3.5 rounded-xl transition-all shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing Download...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download File ({formatBytes(shareData.file.file_size)})</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center p-6 text-xs text-slate-500">
        FileSync — Fast, seamless cross-device file transfer
      </footer>
    </div>
  );
}
