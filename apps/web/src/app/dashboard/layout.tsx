'use client';

import Link from 'next/link';
import { Users, LogOut, Infinity, Menu, X, UserPlus, Settings, Shield, Building2, UserCheck, Tags, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Breadcrumb } from '@/components/ui/breadcrumb';

/**
 * Settings sub-navigation tabs configuration
 * @description Defines the tabs shown in the settings sub-topbar
 */
const SETTINGS_TABS = [
  { href: '/dashboard/settings/organization', label: 'Organization', icon: Building2 },
  { href: '/dashboard/settings/members', label: 'Members', icon: Users },
  { href: '/dashboard/settings/join-requests', label: 'Requests', icon: UserCheck },
  { href: '/dashboard/settings/groups', label: 'Groups', icon: Tags },
];

/**
 * Dashboard Layout Component
 * @description Main layout for authenticated dashboard pages with simplified sidebar and settings sub-topbar
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(180);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { loading, require_auth, logout, user } = useAuth();
  const pathname = usePathname();

  // Check if we're on a settings page
  const isSettingsPage = pathname.startsWith('/dashboard/settings');

  useEffect(() => {
    require_auth();
  }, [require_auth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 160 && newWidth <= 300) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

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

  /**
   * Check if a sidebar tab is active
   * @param tabPath - Path to check
   * @returns boolean indicating if tab is active
   */
  const isActiveTab = (tabPath: string) => {
    if (tabPath === '/dashboard/groups') {
      return pathname === '/dashboard' || pathname === '/dashboard/groups' || pathname.startsWith('/dashboard/groups/');
    }
    if (tabPath === '/dashboard/join-org') {
      return pathname === '/dashboard/join-org';
    }
    if (tabPath === '/dashboard/billing') {
      return pathname === '/dashboard/billing';
    }
    if (tabPath === '/dashboard/settings') {
      return pathname.startsWith('/dashboard/settings');
    }
    return pathname === tabPath;
  };

  // Loading state
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

      {/* Sidebar - Simplified */}
      <div
        className={`
          bg-white border-r border-gray-300 relative flex-shrink-0 z-50 flex flex-col
          lg:relative lg:translate-x-0
          ${isMobileMenuOpen ? 'fixed left-0 top-0 h-full translate-x-0' : 'fixed -translate-x-full lg:translate-x-0'}
          transition-transform duration-300 ease-in-out
        `}
        style={{ width: sidebarWidth }}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden absolute top-4 right-4">
          <Button variant="ghost" size="sm" onClick={closeMobileMenu} className="p-2">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Logo */}
        <div className="p-5">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <Infinity className="w-5 h-5 text-green-600" />
            </div>
            <h1 className="text-sm font-medium text-gray-800 text-center">SummaryAI</h1>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {/* Groups */}
          <NavItem
            href="/dashboard/groups"
            icon={<Users className="w-5 h-5" />}
            label="Groups"
            isActive={isActiveTab('/dashboard/groups')}
            onClick={closeMobileMenu}
          />

          {/* Join Organization */}
          <NavItem
            href="/dashboard/join-org"
            icon={<UserPlus className="w-5 h-5" />}
            label="Join Org"
            isActive={isActiveTab('/dashboard/join-org')}
            onClick={closeMobileMenu}
          />

          {/* Billing */}
          <NavItem
            href="/dashboard/billing"
            icon={<CreditCard className="w-5 h-5" />}
            label="Billing"
            isActive={isActiveTab('/dashboard/billing')}
            onClick={closeMobileMenu}
          />

          {/* Settings */}
          <NavItem
            href="/dashboard/settings/organization"
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            isActive={isActiveTab('/dashboard/settings')}
            onClick={closeMobileMenu}
          />
        </nav>

        {/* Bottom Section */}
        <div className="border-t">
          {/* Platform Admin - Only for super_admin */}
          {user?.platform_role === 'super_admin' && (
            <div className="px-3 py-2 border-b bg-gray-50">
              <Link
                href="/admin"
                onClick={closeMobileMenu}
                className="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Shield className="w-5 h-5 mr-3 text-red-600" />
                <span className="text-sm font-medium">Admin</span>
              </Link>
            </div>
          )}

          {/* Sign Out */}
          <div className="px-3 py-3">
            <button
              onClick={() => {
                logout();
                closeMobileMenu();
              }}
              className="flex items-center w-full px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-400 transition-colors"
          onMouseDown={handleMouseDown}
          style={{ background: isResizing ? '#9CA3AF' : 'transparent' }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-300 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="lg:hidden p-2" onClick={toggleMobileMenu}>
                <Menu className="w-5 h-5" />
              </Button>
              <div className="hidden md:block">
                <Breadcrumb />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div
                className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium"
                title={user?.name || 'User'}
              >
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
              </div>
            </div>
          </div>
          {/* Mobile breadcrumb */}
          <div className="md:hidden mt-2 pt-2 border-t border-gray-200">
            <Breadcrumb />
          </div>
        </header>

        {/* Settings Sub-Topbar - Only shown on settings pages */}
        {isSettingsPage && (
          <div className="bg-gray-50 border-b border-gray-200 px-4 overflow-x-auto">
            <nav className="flex space-x-1 py-2 min-w-max">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-green-700 shadow-sm border border-gray-200'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Navigation Item Component
 * @description Reusable sidebar nav item
 */
function NavItem({
  href,
  icon,
  label,
  isActive,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="relative">
      <Link
        href={href}
        onClick={onClick}
        className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
          isActive
            ? 'bg-green-50 text-green-700'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="mr-3">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </Link>
      {isActive && (
        <div className="absolute left-0 top-0 h-full w-1 bg-green-600 rounded-r"></div>
      )}
    </div>
  );
}
