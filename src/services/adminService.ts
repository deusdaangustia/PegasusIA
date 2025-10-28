
'use server';

import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where, serverTimestamp, getDoc } from 'firebase/firestore';
import type { AdminPanelUser, UserRole } from '@/types/user';

const USERS_COLLECTION = 'users';
export const CHATS_COLLECTION = 'PegasusChatsV1';

export async function getAllUsers(): Promise<AdminPanelUser[]> {
  try {
    const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const usersList: AdminPanelUser[] = usersSnapshot.docs.map(docSnap => ({
      uid: docSnap.id,
      ...docSnap.data()
    } as AdminPanelUser));
    console.log('[AdminService] Fetched all users:', usersList.length);
    return usersList;
  } catch (error) {
    console.error('[AdminService] Error fetching all users:', error);
    throw new Error('Falha ao buscar todos os usuários.');
  }
}

export async function updateUserRole(uid: string, newRole: UserRole): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data()?.role === 'dono') {
      console.warn(`[AdminService] Attempted to change role of 'dono' user ${uid}. Operation denied.`);
      throw new Error('Não é possível alterar o cargo de um "dono".');
    }
    if (newRole === 'dono') {
        console.warn(`[AdminService] Attempted to assign 'dono' role to user ${uid}. Operation denied.`);
        throw new Error('Não é possível atribuir o cargo de "dono" a outros usuários.');
    }

    await updateDoc(userDocRef, { role: newRole, updatedAt: serverTimestamp() });
    console.log(`[AdminService] Updated role for user ${uid} to ${newRole}`);
  } catch (error) {
    console.error(`[AdminService] Error updating role for user ${uid}:`, error);
    const message = error instanceof Error ? error.message : 'Falha ao atualizar cargo do usuário.';
    throw new Error(message);
  }
}

export async function deleteUser(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data()?.role === 'dono') {
      console.warn(`[AdminService] Attempted to delete 'dono' user ${uid}. Operation denied.`);
      throw new Error('Não é possível excluir um usuário "dono".');
    }

    const batch = writeBatch(db);

    const chatsQuery = query(collection(db, CHATS_COLLECTION), where('userId', '==', uid));
    const chatsSnapshot = await getDocs(chatsQuery);

    for (const chatDoc of chatsSnapshot.docs) {
      const messagesCollectionRef = collection(db, CHATS_COLLECTION, chatDoc.id, 'messages');
      const messagesSnapshot = await getDocs(messagesCollectionRef);
      messagesSnapshot.forEach(messageDoc => {
        batch.delete(messageDoc.ref);
      });
      batch.delete(chatDoc.ref);
    }
    
    batch.delete(userDocRef);

    await batch.commit();
    console.log(`[AdminService] Deleted user ${uid} and their associated data from Firestore.`);
  } catch (error) {
    console.error(`[AdminService] Error deleting user ${uid}:`, error);
    const message = error instanceof Error ? error.message : 'Falha ao excluir usuário.';
    throw new Error(message);
  }
}

export async function banUser(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data()?.role === 'dono') {
      console.warn(`[AdminService] Attempted to ban 'dono' user ${uid}. Operation denied.`);
      throw new Error('Não é possível banir um usuário "dono".');
    }

    await updateDoc(userDocRef, { role: 'ban', updatedAt: serverTimestamp() });
    console.log(`[AdminService] Banned user ${uid}`);
  } catch (error) {
    console.error(`[AdminService] Error banning user ${uid}:`, error);
    const message = error instanceof Error ? error.message : 'Falha ao banir usuário.';
    throw new Error(message);
  }
}
