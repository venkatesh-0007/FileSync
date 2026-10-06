"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Radio, 
  ArrowRight, 
  Download, 
  File, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  ExternalLink 
} from "lucide-react";
import Link from "next/link";
import { getFileShareByCode, incrementShareDownload } from "@/lib/db";
import { getFileDownloadURL } from "@/lib/storage";
import { formatBytes } from "@/lib/config";
import { FileMetadata, FileShare } from "@/lib/types";

function TransferContent() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code") || "";
  const [code, setCode] = useState(codeParam.toUpperCase());
  const [loading, setLoading] = useState(false);
  const [fileShare, setFileShare] = useState<(FileShare & { file: FileMetadata }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleLookup = async (lookupCode: string) => {
    const clean = lookupCode.trim().toUpperCase();
    if (!clean || clean.length < 4) {
      setError("Please enter a valid transfer code.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setFileShare(null);
      const data = await getFileShareByCode(clean);

      if (!data) {
        setError("Invalid or expired transfer code. Please check and try again.");
      } else if (data.is_revoked) {
        setError("This transfer code has been revoked by the owner.");
      } else if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
        setError("This transfer code has expired.");
      } else {
        setFileShare(data);
      }
    } catch (err) {
      console.error("Lookup error:", err);
      setError("Could not retrieve file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!codeParam) return;
    let active = true;
    const clean = codeParam.trim().toUpperCase();
    if (!clean || clean.length < 4) return;

    getFileShareByCode(clean)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setError("Invalid or expired transfer code. Please check and try again.");
        } else if (data.is_revoked) {
          setError("This transfer code has been revoked by the owner.");
        } else if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
          setError("This transfer code has expired.");
        } else {
          setFileShare(data);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Lookup error:", err);
          setError("Could not retrieve file. Please try again.");
        }
      });

    return () => {
      active = false;
    };
  }, [codeParam]);

  const handleDownload = async () => {
    if (!fileShare?.file) return;
    try {
      setIsDownloading(true);
      const downloadUrl = await getFileDownloadURL(fileShare.file.storage_path);
      await incrementShareDownload(fileShare.id);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileShare.file.filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed. The file may have expired.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-6">
      {/* Code Input Card */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm flex flex-col gap-5">
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 mb-2">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold text-white">Receive File</h1>
          <p className="text-xs text-slate-400">
            Enter the 6-character code shown on the sender device
          </p>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup(code);
          }}
          className="flex flex-col gap-3"
        >
          <div className="relative">
            <input 
              type="text" 
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="e.g. A3F9K2"
              className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3.5 text-center text-2xl font-mono font-bold tracking-widest text-white uppercase outline-none transition-all placeholder:text-slate-600 placeholder:text-lg"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !code}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Retrieve File</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs animate-slide-up-fade">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Found File Card */}
      {fileShare && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-scale-up">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>File Ready for Transfer</span>
          </div>

          <div className="flex items-center gap-3 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <File className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate" title={fileShare.file.filename}>
                {fileShare.file.filename}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {formatBytes(fileShare.file.file_size)}
              </p>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download to This Device</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function TransferPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
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

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col justify-center items-center">
        <Suspense fallback={<Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}>
          <TransferContent />
        </Suspense>
      </main>

      <footer className="text-center p-6 text-xs text-slate-500">
        FileSync — Instant cross-device code transfer
      </footer>
    </div>
  );
}
