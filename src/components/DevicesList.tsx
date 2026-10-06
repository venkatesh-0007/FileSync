"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone, Tablet as TabletIcon, Laptop, Clock, Loader2 } from "lucide-react";
import { UserDevice } from "../lib/types";
import { getUserDevices, registerCurrentDevice } from "../lib/devices";
import { useAuth } from "./AuthProvider";
import { formatDistanceToNow } from "date-fns";

export const DevicesList = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (user?.id) {
      registerCurrentDevice(user.id)
        .then(() => getUserDevices(user.id))
        .then((data) => {
          if (active) {
            setDevices(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.warn("Device load error:", err);
          if (active) setLoading(false);
        });
    }
    return () => { active = false; };
  }, [user?.id]);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "Mobile":
        return Smartphone;
      case "Tablet":
        return TabletIcon;
      case "PC":
        return Monitor;
      default:
        return Laptop;
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
        <h3 className="text-base font-semibold text-white">Active Device Sessions</h3>
        <span className="text-xs text-slate-400">{devices.length} registered</span>
      </div>

      {devices.length === 0 ? (
        <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
          No other devices recorded yet. Log into FileSync from your other devices to see them here.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {devices.map((device) => {
            const Icon = getDeviceIcon(device.device_type);
            const timeAgo = formatDistanceToNow(new Date(device.last_active_at), { addSuffix: true });

            return (
              <div 
                key={device.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  device.is_current 
                    ? "bg-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-900/10" 
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-3 rounded-xl ${device.is_current ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-400"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-white truncate">
                        {device.device_name}
                      </p>
                      {device.is_current && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Active {timeAgo}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                    {device.device_type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
