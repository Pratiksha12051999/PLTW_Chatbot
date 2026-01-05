'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn, signOut, getCurrentUser, SignInOutput } from 'aws-amplify/auth';
import { configureAmplify } from '@/lib/amplify-config';

interface AuthContextType {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<SignInOutput>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Configure Amplify first
    configureAmplify();

    // Then check user
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      console.log('✅ Current user:', currentUser);
      setUser(currentUser);
    } catch (error) {
      console.log('No current user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // First try to sign out any existing session
    try {
      await signOut();
      console.log('Signed out existing session');
    } catch (err) {
      console.log('No existing session to sign out');
    }

    // Now sign in
    const result = await signIn({
      username: email,
      password: password,
    });

    await checkUser();
    return result;
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};