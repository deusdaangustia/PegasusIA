
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config'; 
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; 
import {
  signUpWithEmail as authSignUp,
  signInWithEmail as authSignIn,
  signOutUser as authSignOut,
  onFirebaseAuthStateChanged,
  type FirebaseUser, 
  type AuthError,
} from '@/services/authService';
import type { UserRole } from '@/types/user';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<FirebaseUser>;
  signIn: (email: string, password: string) => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onFirebaseAuthStateChanged(auth, async (user) => {
      if (user) {
        const userEmail = user.email || ''; 
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        
        let userName: string | undefined = user.displayName || undefined;

        if (docSnap.exists()) {
          const data = docSnap.data();
          userName = data?.name || userName;
        } else {
          try {
            await setDoc(userDocRef, { 
              email: userEmail, 
              uid: user.uid,
              name: userName || null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } catch (createError) {
              console.error(`[AuthContext] Failed to create user document in Firestore for ${userEmail}:`, createError);
          }
        }
        setCurrentUser({ ...user, email: userEmail, name: userName });

      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string): Promise<FirebaseUser> => {
    try {
      const firebaseUserOriginal = await authSignUp(email, password);
      const userEmail = firebaseUserOriginal.email || '';
      const userDocRef = doc(db, "users", firebaseUserOriginal.uid);
      const initialName = firebaseUserOriginal.displayName || email.split('@')[0] || 'Usuário';

      try {
        await setDoc(userDocRef, { 
          email: userEmail, 
          uid: firebaseUserOriginal.uid,
          name: initialName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (createError) {
        console.error(`[AuthContext] Failed to create user document on signup for ${userEmail}:`, createError);
      }
      return { ...firebaseUserOriginal, email: userEmail, name: initialName };
    } catch (error) {
      throw error as AuthError;
    }
  };

  const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
    try {
      const user = await authSignIn(email, password); 
      return user; 
    } catch (error) {
      throw error as AuthError;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await authSignOut();
    } catch (error) {
      throw error as AuthError;
    }
  };

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
