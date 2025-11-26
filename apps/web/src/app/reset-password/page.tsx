'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Infinity, Eye, EyeOff, Check, X, CheckCircle, ArrowLeft } from 'lucide-react';

/**
 * Reset Password Form Component
 * @description Handles the password reset form logic
 */
function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Password validation rules
  const passwordRules = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'Contains number', valid: /\d/.test(password) },
  ];

  const isPasswordValid = passwordRules.every(rule => rule.valid);
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [token]);

  /**
   * Handle form submission
   * @param e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
      return;
    }

    if (!isPasswordValid) {
      setError('Please meet all password requirements');
      return;
    }

    if (!doPasswordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    console.log('🔐 Resetting password');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Password reset successful');
        setSuccess(true);
      } else {
        console.log('❌ Password reset failed:', data.error);
        setError(data.error || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('❌ Password reset error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md w-full px-8">
          <Card className="border-gray-300">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <h2 className="text-xl font-normal text-gray-800 mb-2">
                  Password reset successful
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
                <Link href="/login">
                  <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                    Sign in
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

      {/* Right side - Reset Password Form */}
      <div className="flex-1 flex items-center justify-center bg-white border-l border-gray-300">
        <div className="max-w-md w-full px-8">
          <Card className="border-gray-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-normal text-gray-800">Set new password</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Create a strong password for your account.
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="password" className="text-sm font-normal text-gray-700">
                    New Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="border-gray-300 focus:border-gray-400 pr-10"
                      disabled={!token}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={!token}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Password requirements */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {passwordRules.map((rule, index) => (
                        <div
                          key={index}
                          className={`flex items-center text-xs ${
                            rule.valid ? 'text-green-600' : 'text-gray-500'
                          }`}
                        >
                          {rule.valid ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <X className="w-3 h-3 mr-1" />
                          )}
                          {rule.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-normal text-gray-700">
                    Confirm New Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={`border-gray-300 focus:border-gray-400 pr-10 ${
                        confirmPassword.length > 0 && !doPasswordsMatch
                          ? 'border-red-300 focus:border-red-400'
                          : ''
                      }`}
                      disabled={!token}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={!token}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !doPasswordsMatch && (
                    <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                  )}
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
                    disabled={loading || !isPasswordValid || !doPasswordsMatch || !token}
                  >
                    {loading ? 'Resetting password...' : 'Reset password'}
                  </Button>
                </div>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm text-gray-600 hover:text-gray-800 hover:underline inline-flex items-center"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to login
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

/**
 * Reset Password Page Component
 * @description Wrapped with Suspense for useSearchParams
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
