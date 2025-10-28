
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
    console.log('[AuthContext] useEffect mounting, setting up auth state listener.');
    if (!auth || !db) {
      console.error("[AuthContext] Firebase auth or db instance is not available. Auth state will not be monitored.");
      setLoading(false);
      return;
    }

    const unsubscribe = onFirebaseAuthStateChanged(auth, async (user) => {
      console.log('[AuthContext] onFirebaseAuthStateChanged callback triggered.');
      if (user) {
        const userEmail = user.email || ''; 
        console.log(`[AuthContext] User signed in: ${user.uid}, email: ${userEmail}`);
        const isOwnerEmail = userEmail.toLowerCase() === 'divinedoanguish@gmail.com';
        
        try {
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);
          
          let userRole: UserRole = 'user';
          let userName: string | undefined = user.displayName || undefined;

          if (docSnap.exists()) {
            const data = docSnap.data();
            userRole = data?.role as UserRole || 'user';
            userName = data?.name || userName;
            
            if (isOwnerEmail && userRole !== 'dono') {
              console.log(`[AuthContext] Owner email ${userEmail} detected. Updating role to 'dono'.`);
              userRole = 'dono';
              try {
                await setDoc(userDocRef, { role: userRole, name: userName || null, updatedAt: serverTimestamp() }, { merge: true });
                console.log(`[AuthContext] Role 'dono' set in Firestore for ${userEmail}`);
              } catch (updateError) {
                console.error(`[AuthContext] Failed to update role to 'dono' in Firestore for ${userEmail}:`, updateError);
              }
            }
          } else {
            console.log(`[AuthContext] No user document found for UID: ${user.uid}. Creating one.`);
            userRole = isOwnerEmail ? 'dono' : 'user';
            try {
              await setDoc(userDocRef, { 
                email: userEmail, 
                uid: user.uid,
                name: userName || null,
                role: userRole, 
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              console.log(`[AuthContext] User document created in Firestore for ${userEmail} with role: ${userRole}`);
            } catch (createError) {
                console.error(`[AuthContext] Failed to create user document in Firestore for ${userEmail}:`, createError);
            }
          }
          setCurrentUser({ ...user, email: userEmail, role: userRole, name: userName });
        } catch (firestoreError) {
          console.error("[AuthContext] Error fetching/setting user document from Firestore:", firestoreError);
          const currentFailedUserEmail = user.email || '';
          const currentFailedIsOwnerEmail = currentFailedUserEmail.toLowerCase() === 'divinedoanguish@gmail.com';
          const fallbackRole: UserRole = currentFailedIsOwnerEmail ? 'dono' : 'user';
          setCurrentUser({ ...user, email: currentFailedUserEmail, role: fallbackRole, name: user.displayName || undefined } as FirebaseUser); 
        }
      } else {
        console.log('[AuthContext] User signed out.');
        setCurrentUser(null);
      }
      setLoading(false);
      console.log('[AuthContext] Loading state set to false.');
    });

    return () => {
      console.log('[AuthContext] useEffect unmounting, cleaning up auth state listener.');
      unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string): Promise<FirebaseUser> => {
    console.log(`[AuthContext] Attempting to sign up user: ${email}`);
    try {
      const firebaseUserOriginal = await authSignUp(email, password);
      const userEmail = firebaseUserOriginal.email || '';
      
      const userDocRef = doc(db, "users", firebaseUserOriginal.uid);
      const initialRole: UserRole = userEmail.toLowerCase() === 'divinedoanguish@gmail.com' ? 'dono' : 'user';
      const initialName = firebaseUserOriginal.displayName || email.split('@')[0] || 'Usuário';

      try {
        await setDoc(userDocRef, { 
          email: userEmail, 
          uid: firebaseUserOriginal.uid,
          name: initialName,
          role: initialRole, 
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
         console.log(`[AuthContext] User document created on signup for ${userEmail}`);
      } catch (createError) {
        console.error(`[AuthContext] Failed to create user document on signup for ${userEmail}:`, createError);
      }
      return { ...firebaseUserOriginal, email: userEmail, role: initialRole, name: initialName };
    } catch (error) {
      console.error(`[AuthContext] SignUp failed for ${email}:`, error);
      throw error as AuthError;
    }
  };

  const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
    console.log(`[AuthContext] Attempting to sign in user: ${email}`);
    try {
      const user = await authSignIn(email, password); 
      console.log(`[AuthContext] SignIn successful for ${email}. Auth state change will trigger role fetch.`);
      return user; 
    } catch (error) {
      console.error(`[AuthContext] SignIn failed for ${email}:`, error);
      throw error as AuthError;
    }
  };

  const signOut = async (): Promise<void> => {
    const userEmail = currentUser?.email || 'Unknown user';
    console.log(`[AuthContext] Attempting to sign out user: ${userEmail}`);
    try {
      await authSignOut();
      console.log(`[AuthContext] SignOut successful for ${userEmail}`);
    } catch (error) {
      console.error(`[AuthContext] SignOut failed for ${userEmail}:`, error);
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
