import { supabase } from "./supabase";
import { UserDevice } from "./types";
import { getDeviceType } from "./storage";

const getBrowserName = (ua: string): string => {
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/")) return "Safari";
  if (ua.includes("Opera/") || ua.includes("OPR/")) return "Opera";
  return "Browser";
};

const getOSName = (ua: string): string => {
  if (ua.includes("Mac OS X") || ua.includes("Macintosh")) return "macOS";
  if (ua.includes("Windows NT 10.0")) return "Windows 10/11";
  if (ua.includes("Windows NT")) return "Windows";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Linux")) return "Linux";
  return "Unknown OS";
};

export const getOrCreateDeviceId = (): string => {
  if (typeof window === "undefined") return "server-device";
  let id = localStorage.getItem("filesync_device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
    localStorage.setItem("filesync_device_id", id);
  }
  return id;
};

/**
 * Registers or updates the current device in public.user_devices
 */
export const registerCurrentDevice = async (userId: string): Promise<void> => {
  if (typeof window === "undefined" || !userId) return;

  const deviceId = getOrCreateDeviceId();
  const ua = window.navigator.userAgent;
  const deviceType = getDeviceType();
  const browser = getBrowserName(ua);
  const os = getOSName(ua);
  const deviceName = `${os} (${browser})`;

  try {
    await supabase.from("user_devices").upsert(
      {
        user_id: userId,
        device_id: deviceId,
        device_name: deviceName,
        device_type: deviceType,
        browser,
        os,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" }
    );
  } catch (err) {
    console.warn("Device registration notice:", err);
  }
};

/**
 * Fetches all registered devices for the user
 */
export const getUserDevices = async (userId: string): Promise<UserDevice[]> => {
  if (!userId) return [];
  const currentDeviceId = typeof window !== "undefined" ? getOrCreateDeviceId() : "";

  const { data, error } = await supabase
    .from("user_devices")
    .select("*")
    .eq("user_id", userId)
    .order("last_active_at", { ascending: false });

  if (error) {
    console.warn("Could not query user_devices:", error.message);
    return [];
  }

  return (data || []).map((d: UserDevice) => ({
    ...d,
    is_current: d.device_id === currentDeviceId,
  }));
};
