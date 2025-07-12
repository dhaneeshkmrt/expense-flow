'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, updateProfile } from 'firebase/auth';
import { auth } from './firebase'; 
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      router.push('/dashboard');
      return userCredential;
    } catch (error) {
      console.error("Error signing in with email: ", error);
      setLoading(false);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        if (userCredential.user) {
            await updateProfile(userCredential.user, { displayName: name });
        }
        // Force a reload of the user to get the new display name
        await userCredential.user?.reload();
        setUser(auth.currentUser);
        router.push('/dashboard');
        return userCredential;
    } catch (error) {
        console.error("Error signing up with email: ", error);
        setLoading(false);
        throw error;
    }
  };


  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const value = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
