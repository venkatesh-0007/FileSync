"use client";

import { HardDrive, AlertTriangle, ShieldCheck } from "lucide-react";
import { formatBytes, getStorageLimitBytes } from "../lib/config";

interface StorageCardProps {
  usedBytes: number;
  totalFiles: number;
}

export const StorageCard = ({ usedBytes, totalFiles }: StorageCardProps) => {
  const quotaBytes = getStorageLimitBytes();
  const percentUsed = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
  const remainingBytes = Math.max(0, quotaBytes - usedBytes);

  let barColor = "from-blue-500 to-indigo-500";
  let statusText = "Good storage headroom";
  let StatusIcon = ShieldCheck;
  let statusColor = "text-emerald-400";

  if (percentUsed >= 90) {
    barColor = "from-red-500 to-rose-600";
    statusText = "Storage nearly full";
    StatusIcon = AlertTriangle;
    statusColor = "text-rose-400";
  } else if (percentUsed >= 75) {
    barColor = "from-amber-500 to-orange-500";
    statusText = "Approaching storage limit";
    StatusIcon = AlertTriangle;
    statusColor = "text-amber-400";
  }

  return (
    <div className="w-full bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 shadow-lg flex flex-col gap-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Cloud Storage</h3>
            <p className="text-xs text-slate-400">{totalFiles} active file{totalFiles === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${statusColor}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Storage Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="w-full bg-slate-900/80 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
          <div 
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500 ease-out`}
            style={{ width: `${Math.max(3, percentUsed)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
          <span className="font-medium text-slate-200">
            {formatBytes(usedBytes)} <span className="text-slate-400 font-normal">used</span>
          </span>
          <span>
            {formatBytes(remainingBytes)} <span className="text-slate-500">remaining of</span> {formatBytes(quotaBytes)}
          </span>
        </div>
      </div>
    </div>
  );
};
