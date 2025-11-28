'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Infinity, Eye, EyeOff, AlertCircle, UserX, Lock, ServerCrash, WifiOff, Database } from 'lucide-react';

/**
 * Error state interface for login errors
 * @property message - Human readable error message
 * @property code - Error code from backend
 * @property icon - Icon component to display
 * @property variant - Alert variant (destructive, warning, etc.)
 */
interface LoginError {
  message: string;
  code: string;
  icon: React.ReactNode;
  variant: 'destructive' | 'warning';
}

/**
 * Get error display configuration based on error code
 * @param error_code - Error code from backend
 * @param error_message - Error message from backend
 * @param lock_minutes - Minutes until account unlock (for ACCOUNT_LOCKED)
 * @returns LoginError configuration object
 */
function get_error_config(error_code: string, error_message: string, lock_minutes?: number): LoginError {
  switch (error_code) {
    case 'USER_NOT_FOUND':
      return {
        message: 'No account found with this email. Please check your email or sign up.',
        code: error_code,
        icon: <UserX className="h-4 w-4" />,
        variant: 'destructive'
      };
    case 'INVALID_PASSWORD':
      return {
        message: 'Incorrect password. Please try again or reset your password.',
        code: error_code,
        icon: <Lock className="h-4 w-4" />,
        variant: 'destructive'
      };
    case 'ACCOUNT_LOCKED':
      return {
        message: lock_minutes
          ? `Too many failed attempts. Account locked for ${lock_minutes} minute${lock_minutes > 1 ? 's' : ''}.`
          : 'Account temporarily locked. Please try again later.',
        code: error_code,
        icon: <Lock className="h-4 w-4" />,
        variant: 'warning'
      };
    case 'ACCOUNT_INACTIVE':
      return {
        message: 'Your account is not active. Please contact support for assistance.',
        code: error_code,
        icon: <UserX className="h-4 w-4" />,
        variant: 'warning'
      };
    case 'DATABASE_ERROR':
    case 'DATABASE_QUOTA_EXCEEDED':
      return {
        message: 'Service temporarily unavailable. Please try again in a moment.',
        code: error_code,
        icon: <Database className="h-4 w-4" />,
        variant: 'warning'
      };
    case 'CONNECTION_ERROR':
      return {
        message: 'Unable to connect to server. Please check your internet connection.',
        code: error_code,
        icon: <WifiOff className="h-4 w-4" />,
        variant: 'destructive'
      };
    case 'SERVER_ERROR':
      return {
        message: 'An unexpected error occurred. Please try again.',
        code: error_code,
        icon: <ServerCrash className="h-4 w-4" />,
        variant: 'destructive'
      };
    case 'MISSING_CREDENTIALS':
      return {
        message: 'Please enter both email and password.',
        code: error_code,
        icon: <AlertCircle className="h-4 w-4" />,
        variant: 'destructive'
      };
    default:
      return {
        message: error_message || 'Login failed. Please try again.',
        code: error_code || 'UNKNOWN',
        icon: <AlertCircle className="h-4 w-4" />,
        variant: 'destructive'
      };
  }
}

/**
 * Login Page Component
 * @description User login page with email and password authentication
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const router = useRouter();

  /**
   * Handle form submission
   * @param e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
        console.log('❌ Login failed:', data.error_code, data.error);
        setError(get_error_config(data.error_code, data.error, data.lock_minutes));
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError(get_error_config('CONNECTION_ERROR', 'Network error'));
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
                  <Alert
                    variant={error.variant === 'warning' ? 'default' : 'destructive'}
                    className={error.variant === 'warning'
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-red-300 bg-red-50'
                    }
                  >
                    <div className="flex items-start gap-2">
                      <span className={error.variant === 'warning' ? 'text-amber-600' : 'text-red-600'}>
                        {error.icon}
                      </span>
                      <AlertDescription className="text-sm">
                        {error.message}
                      </AlertDescription>
                    </div>
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
