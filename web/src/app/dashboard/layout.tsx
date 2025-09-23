'use client';

import Link from 'next/link';
import { MessageSquare, Users, LogOut, Infinity, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [current_date, set_current_date] = useState<string>('');
  const [sidebarWidth, setSidebarWidth] = useState(200); // 200px - smaller default
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { loading, requireAuth, logout } = useAuth();

  useEffect(() => {
    set_current_date(new Date().toLocaleDateString());
  }, []);

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      // Set min width to 200px and max width to 400px
      if (newWidth >= 200 && newWidth <= 400) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          bg-white border-r border-gray-300 relative flex-shrink-0 z-50
          lg:relative lg:translate-x-0
          ${isMobileMenuOpen ? 'fixed left-0 top-0 h-full translate-x-0' : 'fixed -translate-x-full lg:translate-x-0'}
          transition-transform duration-300 ease-in-out
        `}
        style={{ width: sidebarWidth }}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={closeMobileMenu}
            className="p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          <div className="flex justify-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Infinity className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <nav className="mt-6">
          <Button variant="ghost" className="w-full justify-start px-6 py-3 h-auto" asChild>
            <Link href="/dashboard" onClick={closeMobileMenu}>
              <MessageSquare className="w-5 h-5 mr-3" />
              All Sessions
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start px-6 py-3 h-auto" asChild>
            <Link href="/dashboard/groups" onClick={closeMobileMenu}>
              <Users className="w-5 h-5 mr-3" />
              Group Chats
            </Link>
          </Button>
        </nav>
        
        <div className="absolute bottom-0 p-6 border-t" style={{ width: sidebarWidth }}>
          <Button
            variant="ghost"
            className="w-full justify-start p-0 h-auto text-gray-700 hover:text-red-600"
            onClick={() => {
              logout();
              closeMobileMenu();
            }}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>

        {/* Resize Handle - Hidden on mobile */}
        <div
          className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-400 transition-colors"
          onMouseDown={handleMouseDown}
          style={{
            background: isResizing ? '#9CA3AF' : 'transparent',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-300 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Burger Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden p-2"
                onClick={toggleMobileMenu}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-normal text-gray-800">
                ORGL-Summarizer Ai
              </h2>
            </div>
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