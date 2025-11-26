import { redirect } from 'next/navigation';

// Homepage component - redirect to login for authentication
export default function HomePage() {
  // Redirect to login to enforce authentication
  redirect('/login');
}