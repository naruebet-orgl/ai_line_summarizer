'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Infinity, Eye, EyeOff, Check, X } from 'lucide-react';

/**
 * Registration Page Component
 * @description User registration page with form validation
 */
export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Password validation rules
  const passwordRules = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'Contains number', valid: /\d/.test(password) },
  ];

  const isPasswordValid = passwordRules.every(rule => rule.valid);
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;

  /**
   * Handle form submission
   * @param e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!isPasswordValid) {
      setError('Please meet all password requirements');
      return;
    }

    if (!doPasswordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    console.log('📝 Attempting registration for:', email);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Registration successful');
        router.push('/dashboard');
      } else {
        console.log('❌ Registration failed:', data.error);
        setError(data.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
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

      {/* Right side - Registration Form */}
      <div className="flex-1 flex items-center justify-center bg-white border-l border-gray-300">
        <div className="max-w-md w-full px-8">
          <Card className="border-gray-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-normal text-gray-800">Create your account</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="name" className="text-sm font-normal text-gray-700">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1 border-gray-300 focus:border-gray-400"
                  />
                </div>

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
                  <Label htmlFor="password" className="text-sm font-normal text-gray-700">
                    Password
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
                      placeholder="Create a password"
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
                    Confirm Password
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
                      placeholder="Confirm your password"
                      className={`border-gray-300 focus:border-gray-400 pr-10 ${
                        confirmPassword.length > 0 && !doPasswordsMatch
                          ? 'border-red-300 focus:border-red-400'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
                    disabled={loading || !isPasswordValid || !doPasswordsMatch}
                  >
                    {loading ? 'Creating account...' : 'Create account'}
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-gray-800 font-medium hover:underline"
                  >
                    Sign in
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
