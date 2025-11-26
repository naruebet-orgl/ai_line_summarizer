'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Infinity, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

/**
 * Forgot Password Page Component
 * @description Request password reset email
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  /**
   * Handle form submission
   * @param e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔑 Requesting password reset for:', email);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Password reset email sent');
        setSuccess(true);
      } else {
        console.log('❌ Password reset request failed:', data.error);
        setError(data.error || 'Failed to send reset email. Please try again.');
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
                  Check your email
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  If an account with <span className="font-medium">{email}</span> exists,
                  we&apos;ve sent password reset instructions to that address.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      setSuccess(false);
                      setEmail('');
                    }}
                    variant="outline"
                    className="w-full border-gray-300"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Try another email
                  </Button>
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      className="w-full text-gray-600 hover:text-gray-800"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to login
                    </Button>
                  </Link>
                </div>
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

      {/* Right side - Forgot Password Form */}
      <div className="flex-1 flex items-center justify-center bg-white border-l border-gray-300">
        <div className="max-w-md w-full px-8">
          <Card className="border-gray-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-normal text-gray-800">Reset your password</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Enter your email address and we&apos;ll send you instructions to reset your password.
              </p>
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
                    {loading ? 'Sending...' : 'Send reset instructions'}
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
