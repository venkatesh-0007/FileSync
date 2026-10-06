"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Clock, 
  QrCode, 
  Radio, 
  Loader2, 
  ShieldAlert, 
  Download, 
  AlertCircle 
} from "lucide-react";
import QRCode from "qrcode";
import { FileMetadata, FileShare } from "../lib/types";
import { createFileShare, revokeFileShare } from "../lib/db";
import { useAuth } from "./AuthProvider";
import { formatBytes } from "../lib/config";

interface ShareModalProps {
  file: FileMetadata;
  isOpen: boolean;
  onClose: () => void;
}

const generateTransferCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const ShareModal = ({ file, isOpen, onClose }: ShareModalProps) => {
  const { user } = useAuth();
  const [expiryHours, setExpiryHours] = useState<number | null>(24);
  const [activeShare, setActiveShare] = useState<FileShare | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(true);

  useEffect(() => {
    let active = true;
    if (isOpen && user?.id) {
      const code = generateTransferCode();

      createFileShare(file.id, user.id, expiryHours, null, code)
        .then(async (share) => {
          if (!active) return;
          setActiveShare(share);
          setError(null);

          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const shareUrl = `${origin}/share/${share.share_token}`;
          const qr = await QRCode.toDataURL(shareUrl, {
            width: 280,
            margin: 2,
            color: {
              dark: "#0f172a",
              light: "#ffffff",
            },
          });
          if (active) setQrDataUrl(qr);
        })
        .catch((err) => {
          if (active) {
            console.error("Failed to create file share:", err);
            setError(err instanceof Error ? err.message : "Failed to create share link.");
          }
        })
        .finally(() => {
          if (active) setIsGenerating(false);
        });
    }

    return () => {
      active = false;
    };
  }, [isOpen, user?.id, file.id, expiryHours]);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = activeShare ? `${origin}/share/${activeShare.share_token}` : "";

  const handleRevoke = async () => {
    if (!activeShare) return;
    try {
      await revokeFileShare(activeShare.id);
      setActiveShare((prev) => prev ? { ...prev, is_revoked: true } : null);
    } catch (err) {
      console.error("Failed to revoke share:", err);
      alert("Failed to revoke share.");
    }
  };

  const copyToClipboard = (text: string, type: "link" | "code") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-backdrop-fade"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-slate-200 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Share & Cross-Device Transfer</h2>
              <p className="text-xs text-slate-400 truncate max-w-[280px]" title={file.filename}>
                {file.filename} ({formatBytes(file.file_size)})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-xs bg-red-400/10 text-red-400 border border-red-400/20 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isGenerating ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs">Generating secure link and transfer code...</p>
          </div>
        ) : activeShare ? (
          <div className="flex flex-col gap-4">
            {activeShare.is_revoked ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>This share link has been revoked and can no longer be accessed.</span>
              </div>
            ) : (
              <>
                {/* 6-Digit Transfer Code Card */}
                <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-xl p-4 flex flex-col items-center text-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-blue-300 font-medium">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-blue-400" />
                    <span>Quick Device Transfer Code</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-3xl font-extrabold tracking-widest text-white px-3 py-1 bg-slate-950/60 rounded-lg border border-slate-700/80 select-all">
                      {activeShare.transfer_code}
                    </span>
                    <button
                      onClick={() => copyToClipboard(activeShare.transfer_code || "", "code")}
                      className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-colors flex items-center gap-1 text-xs font-medium shadow-md shadow-blue-900/20"
                      title="Copy code"
                    >
                      {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter this code on any device at <span className="font-mono text-slate-300">/transfer</span>
                  </p>
                </div>

                {/* Share Link Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-300">Direct Share Link</label>
                  <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl p-1.5 pl-3">
                    <input 
                      type="text" 
                      readOnly 
                      value={shareUrl}
                      className="bg-transparent text-xs text-slate-300 outline-none w-full font-mono select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(shareUrl, "link")}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* QR Code Collapsible */}
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setShowQr(!showQr)}
                    className="w-full flex items-center justify-between p-3 bg-slate-950/40 hover:bg-slate-950/60 text-xs font-medium text-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-blue-400" />
                      <span>Instant Mobile QR Transfer</span>
                    </div>
                    <span className="text-slate-500">{showQr ? "Hide" : "Show"}</span>
                  </button>

                  {showQr && qrDataUrl && (
                    <div className="p-4 flex flex-col items-center justify-center bg-slate-950/80 gap-2.5">
                      <div className="p-2 bg-white rounded-xl shadow-lg">
                        <img src={qrDataUrl} alt="Transfer QR Code" className="w-44 h-44 object-contain" />
                      </div>
                      <p className="text-[11px] text-slate-400 text-center">
                        Scan with your phone&apos;s camera to instantly download this file
                      </p>
                    </div>
                  )}
                </div>

                {/* Expiry & Download Statistics & Actions */}
                <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {expiryHours ? `Expires in ${expiryHours} hours` : "Never expires"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> {activeShare.download_count} downloads
                    </span>
                    <button
                      onClick={handleRevoke}
                      className="text-red-400 hover:text-red-300 font-medium hover:underline"
                    >
                      Revoke Link
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-medium">Link Expiration</label>
              <div className="flex items-center gap-2 bg-slate-950/60 rounded-xl px-3 py-2 border border-slate-800">
                <Clock className="w-4 h-4 text-slate-400" />
                <select 
                  value={expiryHours === null ? "never" : expiryHours}
                  onChange={(e) => setExpiryHours(e.target.value === "never" ? null : parseInt(e.target.value))}
                  className="bg-transparent text-xs text-slate-200 outline-none w-full"
                >
                  <option value={1} className="bg-slate-900">1 Hour</option>
                  <option value={24} className="bg-slate-900">24 Hours</option>
                  <option value={168} className="bg-slate-900">7 Days</option>
                  <option value="never" className="bg-slate-900">Never Expires</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
