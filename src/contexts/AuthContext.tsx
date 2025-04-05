'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  UserCredential
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { CustomUser, UserRole } from '@/types/firebase';

export interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signInWithPhone: (phoneNumber: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => { throw new Error('Not implemented') },
  signIn: async () => { throw new Error('Not implemented') },
  signInWithPhone: async () => { throw new Error('Not implemented') },
  signOut: async () => { throw new Error('Not implemented') },
  resetPassword: async () => { throw new Error('Not implemented') }
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.data();
          
          const customUser = firebaseUser as CustomUser;
          customUser.role = userData?.role as UserRole;
          
          setUser(customUser);

          if (customUser.role === 'SALON') {
            router.push('/salon/dashboard');
          } else if (customUser.role === 'USER') {
            router.push('/');
          }
        } catch (error) {
          console.error('Kullanıcı rolü yüklenirken hata:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [router]);

  const signUp = async (email: string, password: string, displayName?: string): Promise<UserCredential> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    return userCredential;
  };

  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithPhone = async (phoneNumber: string) => {
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
          size: 'invisible',
          callback: () => {},
        }, auth);
      }
      return signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
    } catch (error) {
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signInWithPhone,
    signOut: signOutUser,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      <div id="recaptcha-container"></div>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
} 