"use client";

import { useEffect, useState } from "react";
import { 
  UploadCloud, 
  Download, 
  Trash2, 
  RotateCcw, 
  Share2, 
  FolderInput, 
  Star, 
  Clock, 
  Loader2,
  Activity
} from "lucide-react";
import { ActivityLog, ActivityAction } from "../lib/types";
import { getUserActivities } from "../lib/db";
import { useAuth } from "./AuthProvider";
import { formatDistanceToNow } from "date-fns";

export const ActivityFeed = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (user?.id) {
      getUserActivities(user.id, 30)
        .then((data) => {
          if (active) {
            setActivities(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.warn("Activities load error:", err);
          if (active) setLoading(false);
        });
    }
    return () => { active = false; };
  }, [user?.id]);

  const getActionBadge = (action: ActivityAction) => {
    switch (action) {
      case "upload":
        return { icon: UploadCloud, label: "Uploaded", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
      case "download":
        return { icon: Download, label: "Downloaded", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
      case "delete":
        return { icon: Trash2, label: "Trashed", color: "text-red-400 bg-red-500/10 border-red-500/20" };
      case "restore":
        return { icon: RotateCcw, label: "Restored", color: "text-teal-400 bg-teal-500/10 border-teal-500/20" };
      case "share":
        return { icon: Share2, label: "Shared", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
      case "move":
        return { icon: FolderInput, label: "Moved", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
      case "star":
        return { icon: Star, label: "Starred", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" };
      default:
        return { icon: Activity, label: "Activity", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Recent Activity</h3>
        <span className="text-xs text-slate-400">{activities.length} event{activities.length === 1 ? '' : 's'}</span>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
          No file activities recorded yet. When you upload, move, share, or delete files, your history will appear here.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {activities.map((item) => {
            const badge = getActionBadge(item.action);
            const Icon = badge.icon;
            const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

            return (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg border shrink-0 ${badge.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">
                      <span className="font-semibold text-white mr-1.5">{badge.label}</span>
                      {item.target_name}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{timeAgo}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
