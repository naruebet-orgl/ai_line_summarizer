'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Admin Layout Component
 * @description Layout for super_admin only routes with platform management navigation
 * @requires platform_role === 'super_admin'
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user, logout, require_auth } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebar_width, set_sidebar_width] = useState(220);
  const [is_resizing, set_is_resizing] = useState(false);
  const [is_mobile_menu_open, set_is_mobile_menu_open] = useState(false);
  const [is_org_menu_open, set_is_org_menu_open] = useState(false);
  const [access_denied, set_access_denied] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    require_auth();
  }, [require_auth]);

  // Check super_admin access after auth loads
  useEffect(() => {
    if (!loading && user) {
      if (user.platform_role !== 'super_admin') {
        console.log('🚫 Access denied: User is not super_admin');
        set_access_denied(true);
      }
    }
  }, [loading, user]);

  // Sidebar resize handlers
  const handle_mouse_down = (e: React.MouseEvent) => {
    set_is_resizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handle_mouse_move = (e: MouseEvent) => {
      if (!is_resizing) return;
      const new_width = e.clientX;
      if (new_width >= 200 && new_width <= 350) {
        set_sidebar_width(new_width);
      }
    };

    const handle_mouse_up = () => {
      set_is_resizing(false);
    };

    if (is_resizing) {
      document.addEventListener('mousemove', handle_mouse_move);
      document.addEventListener('mouseup', handle_mouse_up);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handle_mouse_move);
      document.removeEventListener('mouseup', handle_mouse_up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [is_resizing]);

  // Helper to check active tab
  const is_active_tab = (tab_path: string) => {
    if (tab_path === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(tab_path);
  };

  // Auto-expand org menu when on org pages
  useEffect(() => {
    if (pathname.startsWith('/admin/organizations')) {
      set_is_org_menu_open(true);
    }
  }, [pathname]);

  const toggle_mobile_menu = () => set_is_mobile_menu_open(!is_mobile_menu_open);
  const close_mobile_menu = () => set_is_mobile_menu_open(false);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (access_denied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold">Access Denied</p>
                <p>You do not have permission to access the admin panel. This area is restricted to platform super administrators.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="mt-2"
                >
                  Return to Dashboard
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {is_mobile_menu_open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={close_mobile_menu}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          bg-gray-900 text-white relative flex-shrink-0 z-50
          lg:relative lg:translate-x-0
          ${is_mobile_menu_open ? 'fixed left-0 top-0 h-full translate-x-0' : 'fixed -translate-x-full lg:translate-x-0'}
          transition-transform duration-300 ease-in-out
        `}
        style={{ width: sidebar_width }}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={close_mobile_menu}
            className="p-2 text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Logo */}
        <div className="p-6">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center mb-3">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-base font-semibold text-white text-center">
              Admin Panel
            </h1>
            <p className="text-xs text-gray-400 mt-1">Platform Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 space-y-1 px-3">
          {/* Dashboard */}
          <NavItem
            href="/admin"
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
            is_active={is_active_tab('/admin') && pathname === '/admin'}
            onClick={close_mobile_menu}
          />

          {/* Organizations Section */}
          <div className="relative">
            <button
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                is_active_tab('/admin/organizations')
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
              onClick={() => set_is_org_menu_open(!is_org_menu_open)}
            >
              <div className="flex items-center">
                <Building2 className="w-5 h-5 mr-3" />
                Organizations
              </div>
              {is_org_menu_open ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Organizations Sub-menu */}
          {is_org_menu_open && (
            <div className="ml-4 space-y-1">
              <NavItem
                href="/admin/organizations"
                icon={<Building2 className="w-4 h-4" />}
                label="All Organizations"
                is_active={pathname === '/admin/organizations'}
                onClick={close_mobile_menu}
                small
              />
            </div>
          )}

          {/* Users */}
          <NavItem
            href="/admin/users"
            icon={<Users className="w-5 h-5" />}
            label="Users"
            is_active={is_active_tab('/admin/users')}
            onClick={close_mobile_menu}
          />

          {/* Audit Logs */}
          <NavItem
            href="/admin/audit"
            icon={<ScrollText className="w-5 h-5" />}
            label="Audit Logs"
            is_active={is_active_tab('/admin/audit')}
            onClick={close_mobile_menu}
          />

          {/* Platform Settings */}
          <NavItem
            href="/admin/settings"
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            is_active={is_active_tab('/admin/settings')}
            onClick={close_mobile_menu}
          />
        </nav>

        {/* User Info & Logout */}
        <div className="absolute bottom-0 p-4 border-t border-gray-800" style={{ width: sidebar_width }}>
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={() => {
              logout();
              close_mobile_menu();
            }}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>

        {/* Resize Handle */}
        <div
          className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-600 transition-colors"
          onMouseDown={handle_mouse_down}
          style={{
            background: is_resizing ? '#4B5563' : 'transparent',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden p-2"
                onClick={toggle_mobile_menu}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-gray-900">Platform Administration</span>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Exit Admin
              </Button>
            </Link>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Navigation Item Component
 * @description Reusable nav item for sidebar
 */
function NavItem({
  href,
  icon,
  label,
  is_active,
  onClick,
  small = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  is_active: boolean;
  onClick?: () => void;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center px-3 ${small ? 'py-2' : 'py-2.5'} rounded-lg transition-colors ${
        is_active
          ? 'bg-red-600 text-white'
          : 'text-gray-300 hover:bg-gray-800'
      }`}
    >
      <span className={small ? 'mr-2' : 'mr-3'}>{icon}</span>
      <span className={small ? 'text-sm' : ''}>{label}</span>
    </Link>
  );
}
