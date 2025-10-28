'use client';

import type { User as FirebaseUserOriginal, AuthError } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as onFirebaseAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import type { UserRole } from '@/types/user';

export interface FirebaseUser extends FirebaseUserOriginal {
  role?: UserRole;
  name?: string;
}

export async function signUpWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user as FirebaseUser;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error as AuthError;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user as FirebaseUser;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error as AuthError;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error as AuthError;
  }
}

export { onFirebaseAuthStateChanged };
export type { AuthError };
