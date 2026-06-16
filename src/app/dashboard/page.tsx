"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    // Increment to trigger a re-fetch in FileList
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-8">
          <header className="mb-2">
            <h1 className="text-3xl font-bold text-white">Your Files</h1>
            <p className="text-slate-400 mt-1">Upload, download, and manage your files securely.</p>
          </header>

          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">
            <section className="w-full lg:col-span-5 sticky lg:top-6">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </section>

            <section className="w-full lg:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-200">Recent Uploads</h2>
              </div>
              
              <FileList refreshTrigger={refreshTrigger} />
            </section>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
