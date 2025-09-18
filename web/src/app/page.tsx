import { redirect } from 'next/navigation';

// Homepage component - force rebuild
export default function HomePage() {
  // Bypass login for MVP testing - go directly to dashboard
  redirect('/dashboard');
}