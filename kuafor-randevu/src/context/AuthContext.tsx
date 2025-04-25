"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  updateProfile as updateFirebaseProfile,
  User as FirebaseUser 
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { User } from "../types";

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userType: 'customer' | 'barber';
  barberType?: 'male' | 'female' | 'mixed';
  address?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: UserData | null;
  signUp: (email: string, password: string, newUserData: Omit<UserData, 'createdAt' | 'updatedAt'>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<(FirebaseUser & UserData) | null>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signUp(email: string, password: string, newUserData: Omit<UserData, 'createdAt' | 'updatedAt'>) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile with display name
      await updateFirebaseProfile(user, {
        displayName: `${newUserData.firstName} ${newUserData.lastName}`
      });

      // Create user document in Firestore
      const userDoc: UserData = {
        ...newUserData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "users", user.uid), userDoc);
      setUserData(userDoc);
      toast.success("Kayıt başarılı!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        setCurrentUser({ ...userCredential.user, ...userData });
        return { ...userCredential.user, ...userData };
      }
      return null;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  async function logout() {
    try {
      await signOut(auth);
      setUserData(null);
      toast.success("Çıkış yapıldı!");
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  }

  async function resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Şifre sıfırlama e-postası gönderildi!");
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  }

  async function updateUserProfile(data: Partial<UserData>) {
    if (!currentUser) return;

    try {
      const updateData: Partial<UserData> = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      // Update Firestore document
      await setDoc(doc(db, "users", currentUser.uid), updateData, { merge: true });
      setUserData(prev => prev ? { ...prev, ...updateData } : null);

      // Update auth profile if name changed
      if (data.firstName || data.lastName) {
        await updateFirebaseProfile(currentUser, {
          displayName: `${data.firstName || ''} ${data.lastName || ''}`.trim()
        });
      }

      toast.success("Profil güncellendi!");
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  }

  const value = {
    currentUser,
    userData,
    signUp,
    signIn,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 