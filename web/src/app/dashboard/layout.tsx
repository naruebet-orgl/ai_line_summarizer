'use client';

import Link from 'next/link';
import { MessageSquare, Users, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

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
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-300">
        <div className="p-6">
          <h1 className="text-lg font-normal text-gray-800">
            ORGL Notes Bot
          </h1>
          <p className="text-sm text-gray-600">AI Analytics Dashboard</p>
        </div>
        
        <nav className="mt-6">
          <Button variant="ghost" className="w-full justify-start px-6 py-3 h-auto" asChild>
            <Link href="/dashboard">
              <MessageSquare className="w-5 h-5 mr-3" />
              All Sessions
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start px-6 py-3 h-auto" asChild>
            <Link href="/dashboard/groups">
              <Users className="w-5 h-5 mr-3" />
              Group Chats
            </Link>
          </Button>
        </nav>
        
        <div className="absolute bottom-0 w-64 p-6 border-t">
          <Button variant="ghost" className="w-full justify-start p-0 h-auto text-gray-700 hover:text-red-600" asChild>
            <Link href="/login">
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-300 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-normal text-gray-800">
              Talk with me
            </h2>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                AI
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