"use client";

import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { logoutUser } from "../lib/auth";

export const Navbar = () => {
  const { userProfile } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white hover:text-blue-400 transition-colors">
          <Image src="/logo.png" alt="FileSync Logo" width={24} height={24} className="rounded-full" />
          <span>FileSync</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/transfer"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-xl border border-blue-500/20 font-medium transition-colors"
          >
            Receive File
          </Link>

          {userProfile && (
            <div className="flex items-center gap-4">
              <span className="text-slate-300 text-sm hidden sm:inline-block">
                Welcome, <span className="font-semibold text-white">{userProfile.username}</span>
              </span>
              <button
                onClick={() => logoutUser()}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors p-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline-block">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
