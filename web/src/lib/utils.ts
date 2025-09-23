import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  if (!date) return 'Unknown date';

  const d = new Date(date);

  // Check if date is valid
  if (isNaN(d.getTime())) {
    console.warn('Invalid date received:', date);
    return 'Invalid date';
  }

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatRelativeTime(date: Date | string) {
  if (!date) return 'Unknown date';

  const d = new Date(date);

  // Check if date is valid
  if (isNaN(d.getTime())) {
    console.warn('Invalid date received:', date);
    return 'Invalid date';
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(date);
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'open':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'submitted':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case 'open':
      return '🟡';
    case 'submitted':
      return '✅';
    default:
      return '⭕';
  }
}