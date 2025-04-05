'use client';

import { createContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/firebase';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { AuthContext, AuthContextType } from './AuthContext';
import { User } from '@/types/firebase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user ? { 
        id: user.uid, 
        email: user.email || '',
        role: 'USER', // varsayılan rol, gerçek rolü veritabanından almalısınız
        createdAt: new Date(),
        updatedAt: new Date()
      } : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    signUp
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 