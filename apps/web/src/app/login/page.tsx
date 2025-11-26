'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Infinity, Eye, EyeOff } from 'lucide-react';

/**
 * Login Page Component
 * @description User login page with email and password authentication
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  /**
   * Handle form submission
   * @param e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔐 Attempting login for:', email);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Login successful');
        router.push('/dashboard');
      } else {
        console.log('❌ Login failed:', data.error);
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side - Branding */}
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Infinity className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-normal text-gray-800 mb-2">
              ORGL Notes Bot
            </h1>
            <p className="text-sm text-gray-600">
              AI Analytics Dashboard
            </p>
            <p className="text-xs text-gray-500 mt-1">
              AI-Powered Chat Analytics Platform
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white border-l border-gray-300">
        <div className="max-w-md w-full px-8">
          <Card className="border-gray-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-normal text-gray-800">Sign in to your account</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="email" className="text-sm font-normal text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="mt-1 border-gray-300 focus:border-gray-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-normal text-gray-700">
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-gray-600 hover:text-gray-800 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="border-gray-300 focus:border-gray-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="border-red-300">
                    <AlertDescription className="text-sm">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-600">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/register"
                    className="text-gray-800 font-medium hover:underline"
                  >
                    Sign up
                  </Link>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-center text-gray-600 space-y-1">
                    <p className="font-medium">AI Native Team</p>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
