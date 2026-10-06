"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { StorageCard } from "@/components/StorageCard";
import { DevicesList } from "@/components/DevicesList";
import { ActivityFeed } from "@/components/ActivityFeed";
import { 
  Files, 
  Star, 
  Trash2, 
  Laptop, 
  Activity, 
  Radio 
} from "lucide-react";
import Link from "next/link";

type DashboardTab = "files" | "starred" | "trash" | "devices" | "activity";

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<DashboardTab>("files");
  const [usedBytes, setUsedBytes] = useState(0);
  const [activeFileCount, setActiveFileCount] = useState(0);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const handleUploadSuccess = () => {
    // Increment to trigger a re-fetch in FileList
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleStatsChange = (used: number, count: number) => {
    setUsedBytes(used);
    setActiveFileCount(count);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
          {/* Top Welcome & Quick Transfer Banner */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Your Cloud Drive
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Synchronize, manage, and transfer files across all your devices in real time.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/transfer"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Receive with Code</span>
              </Link>
            </div>
          </header>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs select-none border-b border-slate-800">
            {[
              { id: "files" as DashboardTab, label: "All Files", icon: Files },
              { id: "starred" as DashboardTab, label: "Starred", icon: Star },
              { id: "trash" as DashboardTab, label: "Trash", icon: Trash2 },
              { id: "devices" as DashboardTab, label: "Devices", icon: Laptop },
              { id: "activity" as DashboardTab, label: "Activity", icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all shrink-0 ${
                    isActive
                      ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : ""}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Layout */}
          {activeTab === "devices" ? (
            <div className="w-full">
              <DevicesList />
            </div>
          ) : activeTab === "activity" ? (
            <div className="w-full">
              <ActivityFeed />
            </div>
          ) : (
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Upload & Storage Card */}
              <section className="w-full lg:col-span-5 flex flex-col gap-6 sticky lg:top-6">
                <StorageCard usedBytes={usedBytes} totalFiles={activeFileCount} />
                <FileUpload 
                  onUploadSuccess={handleUploadSuccess} 
                  currentFolderId={currentFolderId} 
                />
              </section>

              {/* Right Column: Files & Organization */}
              <section className="w-full lg:col-span-7 flex flex-col">
                <FileList 
                  refreshTrigger={refreshTrigger}
                  activeTab={activeTab}
                  onStatsChange={handleStatsChange}
                  onCurrentFolderChange={setCurrentFolderId}
                />
              </section>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
