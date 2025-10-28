import { collection, addDoc, query, orderBy, getDocs, Timestamp, serverTimestamp, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import type { WebSearchResultItem } from '@/ai/flows/perform-web-search-flow';

export const CHATS_COLLECTION = 'PegasusChatsV1';
const MESSAGES_SUBCOLLECTION = 'messages';

export interface ChatListItem {
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatMessage {
  id?: string;
  sender: 'user' | 'ai';
  prompt?: string;
  response?: string;
  image_uri?: string;
  investigation_data?: any;
  investigation_error?: string;
  consultation_type?: string;
  search_results?: WebSearchResultItem[];
  search_summary?: string;
  search_error?: string | null;
  timestamp: Timestamp | any;
}

export interface InteractionData {
  userPrompt: string;
  aiTextResponse?: string;
  aiImageUri?: string;
  aiInvestigationData?: any;
  aiInvestigationError?: string;
  consultationType?: string;
  aiSearchResults?: WebSearchResultItem[];
  aiSearchSummary?: string;
  aiSearchError?: string | null; 
}


const getCurrentUserId = (): string | null => {
  return auth.currentUser ? auth.currentUser.uid : null;
};

export async function createNewChat(userId: string, title: string): Promise<string> {
  if (!userId) {
    throw new Error("Usuário não autenticado. Não é possível iniciar novo chat.");
  }
  if (!db) {
    throw new Error("Banco de dados não inicializado.");
  }
  
  const safeTitle = (title && title.trim() !== "") ? title.substring(0, 100) : "Novo Chat";


  try {
    const chatRef = await addDoc(collection(db, CHATS_COLLECTION), {
      userId,
      title: safeTitle, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return chatRef.id;
  } catch (error) {
    const specificError = error instanceof Error ? error.message : "Erro desconhecido.";
    throw new Error(`Falha ao criar novo chat: ${specificError}`);
  }
}

export async function addMessageToChat(chatId: string, messageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any }): Promise<string> {
  if (!chatId) {
    throw new Error("ID do Chat é obrigatório para adicionar mensagem.");
  }
  if (!db) {
    throw new Error("Banco de dados não inicializado.");
  }
  
  try {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION);
    const fullMessageData = { ...messageData, timestamp: messageData.timestamp || serverTimestamp() };
    
    Object.keys(fullMessageData).forEach(key => {
      if (fullMessageData[key as keyof typeof fullMessageData] === undefined) {
        delete fullMessageData[key as keyof typeof fullMessageData];
      }
    });

    const messageDocRef = await addDoc(messagesRef, fullMessageData);

    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    await updateDoc(chatDocRef, {
      updatedAt: serverTimestamp(),
    });
    return messageDocRef.id;
  } catch (error) {
    const specificError = error instanceof Error ? error.message : "Erro desconhecido.";
    throw new Error(`Falha ao adicionar mensagem ao chat: ${specificError}`);
  }
}


export async function logInteraction(
  currentChatId: string | null,
  userId: string,
  interactionData: InteractionData
): Promise<string> {
  if (!userId) {
    throw new Error("User ID is required to log interaction.");
  }
  if (!db) {
    throw new Error("Firestore database is not initialized.");
  }

  let chatId = currentChatId;

  try {
    if (!chatId) {
      const chatTitle = interactionData.userPrompt && interactionData.userPrompt.trim() !== "" ? interactionData.userPrompt.substring(0, 50) : "Novo Chat";
      chatId = await createNewChat(userId, chatTitle);
    }

    await addMessageToChat(chatId, {
      sender: 'user',
      prompt: interactionData.userPrompt || "Prompt do Usuário",
      timestamp: serverTimestamp(),
    });

    if (interactionData.aiTextResponse) {
      await addMessageToChat(chatId, {
        sender: 'ai',
        response: interactionData.aiTextResponse,
        timestamp: serverTimestamp(),
      });
    }

    if (interactionData.aiImageUri) {
      await addMessageToChat(chatId, {
        sender: 'ai',
        image_uri: interactionData.aiImageUri,
        timestamp: serverTimestamp(),
      });
    }

    if (interactionData.aiInvestigationData || interactionData.aiInvestigationError || interactionData.consultationType) {
      const investigationPayload: Partial<ChatMessage> & { sender: 'ai', timestamp: any } = {
        sender: 'ai',
        timestamp: serverTimestamp(),
        ...(interactionData.aiInvestigationData !== undefined && { investigation_data: interactionData.aiInvestigationData }),
        ...(interactionData.aiInvestigationError && { investigation_error: interactionData.aiInvestigationError }),
        ...(interactionData.consultationType && { consultation_type: interactionData.consultationType }),
      };
      
      if (Object.keys(investigationPayload).length > 2) { 
         await addMessageToChat(chatId, investigationPayload as Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any });
      }
    }
    
    const hasSearchInfo = interactionData.aiSearchSummary || 
                          (interactionData.aiSearchResults && interactionData.aiSearchResults.length > 0) || 
                          interactionData.aiSearchError !== undefined;

    if (hasSearchInfo) {
      const searchPayload: Partial<ChatMessage> & { sender: 'ai', timestamp: any } = {
        sender: 'ai',
        timestamp: serverTimestamp(),
        ...(interactionData.aiSearchSummary && { search_summary: interactionData.aiSearchSummary }),
        ...(interactionData.aiSearchResults && interactionData.aiSearchResults.length > 0 && { search_results: interactionData.aiSearchResults }),
        ...(interactionData.aiSearchError !== undefined && { search_error: interactionData.aiSearchError }),
      };

       if (Object.keys(searchPayload).length > 2 || (Object.keys(searchPayload).length === 3 && searchPayload.search_error === null)) {
        await addMessageToChat(chatId, searchPayload as Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any });
      }
    }

    return chatId;
  } catch (error) {
    const specificError = error instanceof Error ? error.message : "Erro desconhecido.";
    throw new Error(`Falha ao registrar interação: ${specificError}`);
  }
}


export async function getChatListForUser(): Promise<ChatListItem[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }
  if (!db) {
    throw new Error("Banco de dados não inicializado.");
  }

  try {
    const q = query(
      collection(db, CHATS_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const chatList: ChatListItem[] = [];
    querySnapshot.forEach((doc) => {
      chatList.push({ id: doc.id, ...doc.data() } as ChatListItem);
    });
    return chatList;
  } catch (error) {
    const specificError = error instanceof Error ? error.message : "Erro desconhecido.";
    throw new Error(`Falha ao buscar lista de chats: ${specificError}`);
  }
}

export async function getMessagesForChat(chatId: string): Promise<ChatMessage[]> {
    if (!chatId) {
        return [];
    }
    if (!db) {
        throw new Error("Banco de dados não inicializado.");
    }

    try {
        const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const querySnapshot = await getDocs(q);
        const messages: ChatMessage[] = [];
        querySnapshot.forEach((docSnap) => { 
            const data = docSnap.data();
            const message: ChatMessage = {
              id: docSnap.id,
              sender: data.sender,
              timestamp: data.timestamp as Timestamp,
              ...(data.prompt !== undefined && { prompt: data.prompt }),
              ...(data.response !== undefined && { response: data.response }),
              ...(data.image_uri !== undefined && { image_uri: data.image_uri }),
              ...(data.investigation_data !== undefined && { investigation_data: data.investigation_data }),
              ...(data.investigation_error !== undefined && { investigation_error: data.investigation_error }),
              ...(data.consultation_type !== undefined && { consultation_type: data.consultation_type }),
              ...(data.search_results !== undefined && { search_results: data.search_results }),
              ...(data.search_summary !== undefined && { search_summary: data.search_summary }),
              ...(data.search_error !== undefined && { search_error: data.search_error }),
            };
            
            messages.push(message);
        });
        return messages;
    } catch (error) {
        const specificError = error instanceof Error ? error.message : "Erro desconhecido.";
        throw new Error(`Falha ao buscar mensagens do chat ${chatId}: ${specificError}`);
    }
}

    