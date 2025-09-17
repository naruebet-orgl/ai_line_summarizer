import { redirect } from 'next/navigation';

export default function HomePage() {
  // Bypass login for MVP testing - go directly to dashboard
  redirect('/dashboard');
}