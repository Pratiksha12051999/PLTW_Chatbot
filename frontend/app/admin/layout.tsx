'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Show login modal instead of redirecting
      setShowLogin(true);
    }
  }, [isAuthenticated, isLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const result = await login(email, password);
      if (result.isSignedIn) {
        setShowLogin(false);
      } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setLoginError('You need to change your password. Please contact support.');
      } else {
        setLoginError('Unexpected login state. Please try again.');
      }
    } catch (error: unknown) {
      const err = error as Error;
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCancel = () => {
    setShowLogin(false);
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated && showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-lg border border-gray-200">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
            <p className="text-sm text-gray-600 mt-2">Sign in to access the admin dashboard</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-gray-900"
                placeholder="admin@pltw.org"
                required
                disabled={isLoggingIn}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-gray-900"
                placeholder="••••••••"
                required
                disabled={isLoggingIn}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isLoggingIn}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}