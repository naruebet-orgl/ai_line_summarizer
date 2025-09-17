'use client';

import Link from 'next/link';
import { FileText, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [current_date, set_current_date] = useState<string>('');
  
  useEffect(() => {
    set_current_date(new Date().toLocaleDateString());
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-800">
            Complaint System
          </h1>
          <p className="text-sm text-gray-600">HR Dashboard</p>
        </div>
        
        <nav className="mt-6">
          <Link 
            href="/dashboard"
            className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
          >
            <FileText className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
        </nav>
        
        <div className="absolute bottom-0 w-64 p-6 border-t">
          <Link 
            href="/login"
            className="flex items-center text-gray-700 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800">
              HR Dashboard
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {current_date}
              </span>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                HR
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}