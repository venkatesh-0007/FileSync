"use client";

import Link from "next/link";
import { Cloud, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900"></div>
        
        <div className="max-w-3xl flex flex-col items-center">
          <div className="bg-blue-500/10 p-4 rounded-3xl mb-8">
            <Cloud className="w-16 h-16 text-blue-500" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            Your files, <span className="text-blue-500">everywhere.</span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-xl mb-12">
            Upload files on one device and instantly access them anywhere. 
            No email required, just a simple username and password.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link 
              href="/register" 
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-lg transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group"
            >
              Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              href="/login" 
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-medium text-lg transition-colors flex items-center justify-center"
            >
              Log In
            </Link>
          </div>
        </div>
        
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl w-full text-left">
          <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-2">Cross-Device</h3>
            <p className="text-slate-400">Access your files from your phone, tablet, or computer seamlessly.</p>
          </div>
          <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-2">Private</h3>
            <p className="text-slate-400">Your files are secured and only accessible when you are logged in.</p>
          </div>
          <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-2">Simple</h3>
            <p className="text-slate-400">No complex settings or email verifications. Just a username and you're in.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
