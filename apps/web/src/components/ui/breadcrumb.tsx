'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb() {
  const pathname = usePathname();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean);

    if (pathname === '/dashboard' || pathname === '/dashboard/groups') {
      return [{ label: 'Groups', href: '/dashboard/groups' }];
    }

    if (pathname.includes('/dashboard/groups/') && pathname.endsWith('/sessions')) {
      const groupName = decodeURIComponent(paths[2]);
      return [
        { label: 'Groups', href: '/dashboard/groups' },
        { label: groupName, href: `/dashboard/groups/${encodeURIComponent(groupName)}/sessions` }
      ];
    }

    if (pathname.includes('/dashboard/sessions/')) {
      const sessionId = paths[2];
      // For session details, we need to make an assumption about the group name
      // In a real app, you'd fetch this data, but for now we'll show a generic path
      return [
        { label: 'Groups', href: '/dashboard/groups' },
        { label: 'Session Details' }
      ];
    }

    return [{ label: 'Groups', href: '/dashboard/groups' }];
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600">
      <Link
        href="/dashboard/groups"
        className="flex items-center hover:text-gray-900 transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}