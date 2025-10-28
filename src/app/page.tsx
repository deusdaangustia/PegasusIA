
"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Link from 'next/link';
import { PromptForm } from "@/components/prompt-form";
import { ActiveChatDisplay } from "@/components/active-chat-display";
import { generateText, type GenerateTextInput } from "@/ai/flows/generate-text-from-prompt";
import { generateImage, type GenerateImageInput } from "@/ai/flows/generate-image-from-prompt";
import { performWebSearch, type PerformWebSearchInput } from "@/ai/flows/perform-web-search-flow";
import { useToast } from "@/hooks/use-toast";
import { ChatHistory } from "@/components/chat-history";
import type { ChatListItem, ChatMessage, InteractionData } from "@/services/chatHistoryService"; 
import { logInteraction, getChatListForUser, getMessagesForChat } from "@/services/chatHistoryService"; 
import { performInvestigation } from "@/services/investigationService";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldCheck, MessageSquarePlus, MessageSquare } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Timestamp } from 'firebase/firestore';
import type { UserRole } from "@/types/user";
import { LoadingScreen } from '@/components/layout/LoadingScreen';

export const maxDuration = 120;

interface PromptFormValues {
  prompt: string;
  generateImage?: boolean; 
  performInvestigation?: boolean; 
  consultationType?: string;
  performSearch?: boolean;
}

const DEFAULT_QUERY_LIMIT = 5;
const VIP_QUERY_LIMIT = 100;
const ADMIN_DONO_QUERY_LIMIT = Infinity; 

export default function Home() {
  const [isLoadingText, setIsLoadingText] = useState(false); 
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [isChatListLoading, setIsChatListLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();

  const [queryCount, setQueryCount] = useState(0);
  const [currentQueryLimit, setCurrentQueryLimit] = useState(DEFAULT_QUERY_LIMIT);
  const [userDisplayRole, setUserDisplayRole] = useState<string>("");


  useEffect(() => {
    if (currentUser) {
      const role: UserRole | undefined = currentUser.role;
      let limit = DEFAULT_QUERY_LIMIT;
      let displayRoleText = "";

      if (role === 'vip') {
        limit = VIP_QUERY_LIMIT;
        displayRoleText = "(VIP)";
      } else if (role === 'admin' || role === 'dono') {
        limit = ADMIN_DONO_QUERY_LIMIT;
        displayRoleText = role === 'admin' ? "(Admin)" : "(Dono)";
      }
      
      setCurrentQueryLimit(limit);
      setUserDisplayRole(displayRoleText);

      if (limit !== ADMIN_DONO_QUERY_LIMIT) {
        const storedCount = localStorage.getItem(`queryCount_${currentUser.uid}`);
        setQueryCount(storedCount ? parseInt(storedCount, 10) : 0);
      } else {
        setQueryCount(0); 
      }

    } else {
      setCurrentQueryLimit(DEFAULT_QUERY_LIMIT);
      setUserDisplayRole("");
      setQueryCount(0); 
      setActiveChatId(null);
      setMessages([]);
    }
  }, [currentUser]);

  const fetchAndSetMessages = useCallback(async (chatId: string | null) => {
    if (!chatId) {
      setMessages([]);
      setIsMessagesLoading(false);
      return;
    }
    setIsMessagesLoading(true);
    try {
      const fetchedMessages = await getMessagesForChat(chatId);
      setMessages(fetchedMessages);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Erro ao carregar mensagens do chat", description: err.message, variant: "destructive" });
      setMessages([]);
    } finally {
      setIsMessagesLoading(false);
    }
  }, [toast]);

  const loadChatList = useCallback(async () => {
    if (!currentUser) {
      setChatList([]);
      setIsChatListLoading(false);
      return;
    }
    setIsChatListLoading(true);
    try {
      const userChatList = await getChatListForUser();
      setChatList(userChatList);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      toast({ title: "Erro ao carregar lista de chats", description: err.message, variant: "destructive" });
      setChatList([]);
    } finally {
      setIsChatListLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!authLoading && currentUser) {
        loadChatList();
    } else if (!currentUser && !authLoading) {
        setChatList([]);
        setIsChatListLoading(false);
        setMessages([]); 
        setActiveChatId(null);
    }
  }, [currentUser, authLoading, loadChatList]);

  useEffect(() => {
    fetchAndSetMessages(activeChatId);
  }, [activeChatId, fetchAndSetMessages]);


  const checkQueryLimit = (actionType: 'text' | 'image' | 'investigation' | 'search'): boolean => {
    if (!currentUser) { 
        if (actionType === 'text' && !activeChatId) return true; 
        toast({
            title: "Acesso Negado",
            description: "Você precisa estar logado para esta funcionalidade.",
            variant: "destructive",
        });
        return false;
    }
    
    if (currentQueryLimit === ADMIN_DONO_QUERY_LIMIT) return true;

    if (queryCount >= currentQueryLimit) {
      toast({
        title: "Limite de Consultas Atingido",
        description: `Você atingiu seu limite de ${currentQueryLimit} consultas. ${currentUser.role === 'vip' ? "Seu limite VIP será resetado no próximo ciclo." : "Para mais consultas, considere o status VIP."} (Simulado)`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const incrementQueryCount = () => {
    if (currentUser && currentQueryLimit !== ADMIN_DONO_QUERY_LIMIT) {
      const newCount = queryCount + 1;
      setQueryCount(newCount);
      localStorage.setItem(`queryCount_${currentUser.uid}`, newCount.toString());
    }
  };

  const handleSubmit = async (values: PromptFormValues) => {
    const currentPrompt = values.prompt;
    const shouldGenerateImage = values.generateImage; 
    const shouldInvestigate = values.performInvestigation; 
    const currentConsultationType = values.consultationType;
    const shouldPerformSearch = values.performSearch;

    const interactionPayload: InteractionData = { userPrompt: currentPrompt };
    let actionTakenOverall = false;
    let localError = null; 

    setIsLoadingText(false);
    setIsImageLoading(false);
    setIsInvestigating(false);
    setIsSearching(false);

    if (shouldPerformSearch) { 
      if (!checkQueryLimit('search')) return;
      actionTakenOverall = true;
      setIsSearching(true);
      try {
        const searchInput: PerformWebSearchInput = { query: currentPrompt };
        const resultFromFlow = await performWebSearch(searchInput);
        interactionPayload.aiSearchResults = resultFromFlow.results;
        interactionPayload.aiSearchSummary = resultFromFlow.summary;
        if (resultFromFlow.summary || (resultFromFlow.results && resultFromFlow.results.length > 0)) {
          incrementQueryCount();
        } else {
           localError = "Nenhum resultado encontrado ou a pesquisa não produziu um resumo.";
           interactionPayload.aiSearchError = localError;
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        localError = err.message;
        interactionPayload.aiSearchError = err.message;
      } finally {
        setIsSearching(false);
      }
    } else if (shouldInvestigate && currentConsultationType) {
      if (!checkQueryLimit('investigation')) return;
      actionTakenOverall = true;
      setIsInvestigating(true);
      interactionPayload.consultationType = currentConsultationType;
      try {
        const resultFromService = await performInvestigation(currentPrompt, currentConsultationType);
        if (resultFromService.success && resultFromService.data) {
          interactionPayload.aiInvestigationData = resultFromService.data;
          incrementQueryCount();
        } else if (resultFromService.error) {
          localError = resultFromService.error;
          interactionPayload.aiInvestigationError = resultFromService.error;
          if (resultFromService.data !== undefined) { 
            interactionPayload.aiInvestigationData = resultFromService.data;
          }
        } else { 
             const errorMsg = `Investigação para '${currentConsultationType}' não retornou dados claros.`;
             localError = errorMsg;
             interactionPayload.aiInvestigationError = errorMsg;
             if (resultFromService.data !== undefined) {
                interactionPayload.aiInvestigationData = resultFromService.data;
             }
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        localError = err.message;
        interactionPayload.aiInvestigationError = err.message; 
      } finally {
        setIsInvestigating(false);
      }
    }
    
    const shouldGenerateTextFallback = !shouldPerformSearch && !shouldInvestigate ||
        (shouldInvestigate && (interactionPayload.aiInvestigationData === undefined && interactionPayload.aiInvestigationError === undefined)) ||
        (shouldPerformSearch && (interactionPayload.aiSearchSummary === undefined && (!interactionPayload.aiSearchResults || interactionPayload.aiSearchResults.length === 0)) && interactionPayload.aiSearchError === undefined);

    if (shouldGenerateTextFallback) {
        if (!checkQueryLimit('text')) return;
        actionTakenOverall = true;
        setIsLoadingText(true);
        try {
            const textInput: GenerateTextInput = { prompt: currentPrompt };
            const aiTextResult = await generateText(textInput);
            interactionPayload.aiTextResponse = aiTextResult.generatedText;
            if(!shouldInvestigate && !shouldPerformSearch && !shouldGenerateImage) incrementQueryCount();
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            localError = err.message;
            interactionPayload.aiTextResponse = `Erro ao gerar texto: ${err.message}`; 
        } finally {
            setIsLoadingText(false);
        }
    }

    if (shouldGenerateImage && !shouldInvestigate && !shouldPerformSearch) {
      if (!checkQueryLimit('image')) return;
      actionTakenOverall = true;
      setIsImageLoading(true);
      try {
        const imageInput: GenerateImageInput = { prompt: currentPrompt };
        const imageResult = await generateImage(imageInput);
        interactionPayload.aiImageUri = imageResult.imageDataUri;
        incrementQueryCount(); 
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        localError = err.message;
        interactionPayload.aiImageUri = `Erro ao gerar imagem: ${err.message}`; 
      } finally {
        setIsImageLoading(false);
      }
    }

    let finalChatIdToRefresh = activeChatId;

    if (currentUser && actionTakenOverall) { 
        try {
            const newChatId = await logInteraction(activeChatId, currentUser.uid, interactionPayload);
            finalChatIdToRefresh = newChatId; 
            if (!activeChatId || activeChatId !== newChatId) {
                setActiveChatId(newChatId); 
                await loadChatList(); 
            } else {
                 await fetchAndSetMessages(activeChatId); 
            }
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            toast({ title: "Erro ao salvar no histórico", description: err.message, variant: "destructive" });
        }
    } else if (!currentUser && actionTakenOverall) {
        const tempAnonymousMessage: ChatMessage = {
            sender: 'user',
            prompt: interactionPayload.userPrompt,
            timestamp: new Timestamp(Math.floor(Date.now() / 1000), 0)
        };
        const tempAiResponses: ChatMessage[] = [];
        if(interactionPayload.aiTextResponse) tempAiResponses.push({ sender: 'ai', response: interactionPayload.aiTextResponse, timestamp: new Timestamp(Math.floor(Date.now() / 1000), 0) });
        if(interactionPayload.aiImageUri) tempAiResponses.push({ sender: 'ai', image_uri: interactionPayload.aiImageUri, timestamp: new Timestamp(Math.floor(Date.now() / 1000), 0) });
        if(interactionPayload.aiInvestigationData || interactionPayload.aiInvestigationError) tempAiResponses.push({ sender: 'ai', investigation_data: interactionPayload.aiInvestigationData, investigation_error: interactionPayload.aiInvestigationError, consultation_type: interactionPayload.consultationType, timestamp: new Timestamp(Math.floor(Date.now() / 1000), 0) });
        if(interactionPayload.aiSearchSummary || interactionPayload.aiSearchResults || interactionPayload.aiSearchError) tempAiResponses.push({ sender: 'ai', search_summary: interactionPayload.aiSearchSummary, search_results: interactionPayload.aiSearchResults, search_error: interactionPayload.aiSearchError, timestamp: new Timestamp(Math.floor(Date.now() / 1000), 0) });
        
        setMessages(prev => [...prev, tempAnonymousMessage, ...tempAiResponses]);
        toast({ title: "Sessão Anônima", description: "Faça login para salvar seu histórico.", variant: "default" });
    }


    if (localError) {
        toast({ title: "Erro na Solicitação", description: localError, variant: "destructive" });
    } else if (!actionTakenOverall && values.prompt ) {
         toast({
            title: "Nenhuma Ação Selecionada",
            description: "Por favor, selecione uma ação (gerar texto, imagem, investigar ou navegar) ou verifique se os pré-requisitos foram atendidos.",
            variant: "default",
        });
    } else if (actionTakenOverall && !localError && finalChatIdToRefresh && currentUser) { 
      await fetchAndSetMessages(finalChatIdToRefresh); 
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]); 
    toast({ title: "Novo Chat Iniciado", description: "Seu próximo prompt iniciará uma nova conversa."});
  };

  const handleSelectChat = (chatId: string) => {
    if (activeChatId === chatId) return; 
    setActiveChatId(chatId); 
    toast({ title: "Chat Selecionado", description: `Exibindo chat ID: ${chatId.substring(0,8)}...`});
  };

  const combinedIsLoading = isLoadingText || isImageLoading || isInvestigating || isSearching;

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 w-full md:grid md:grid-cols-[auto_1fr] overflow-hidden">
        <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
           <SidebarHeader className="p-3 pb-2 flex flex-col gap-2">
             {currentUser && (
                <div className="text-xs text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
                    {currentQueryLimit !== ADMIN_DONO_QUERY_LIMIT ? 
                      `Consultas restantes: ${currentQueryLimit - queryCount} / ${currentQueryLimit}` :
                      "Consultas: Ilimitadas"
                    } {userDisplayRole}
                </div>
             )}
             <Button
                variant="outline"
                size="sm"
                className="w-full group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:p-0"
                onClick={handleNewChat}
                disabled={combinedIsLoading}
              >
                <MessageSquarePlus className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
                <span className="group-data-[collapsible=icon]:hidden">Novo Chat</span>
              </Button>
           </SidebarHeader>
          <SidebarContent className="flex flex-col flex-1 p-0">
            {(currentUser?.role === 'admin' || currentUser?.role === 'dono') && !authLoading && (
              <div className="p-2 border-b border-sidebar-border">
                <Link href="/admin" passHref>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 px-3 text-left rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4 text-sidebar-primary flex-shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Painel Admin</span>
                  </Button>
                </Link>
              </div>
            )}
            <div className="flex-1 overflow-y-auto"> 
              {authLoading ? (
                  <div className="flex flex-col items-center justify-center h-full p-4">
                      <Loader2 className="h-8 w-8 animate-spin text-sidebar-primary" />
                      <p className="mt-2 text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">Carregando...</p>
                  </div>
              ) : currentUser ? (
                <ChatHistory 
                  chatList={chatList} 
                  isLoading={isChatListLoading} 
                  onSelectChat={handleSelectChat}
                  activeChatId={activeChatId}
                />
              ) : (
                   <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                     <MessageSquare className="h-8 w-8 text-sidebar-primary mb-3 opacity-70 flex-shrink-0"/>
                      <p className="text-sm font-medium text-sidebar-foreground group-data-[collapsible=icon]:hidden">Faça login</p>
                      <p className="text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">Para ver e salvar seu histórico e acessar funcionalidades.</p>
                  </div>
              )}
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex flex-1 flex-col overflow-hidden md:min-w-0 h-full md:relative"> 
          <div className="flex flex-1 flex-col items-stretch min-h-0 h-full w-full max-w-full"> 
            <Suspense fallback={
              <div className="h-full flex flex-col w-full flex-1 bg-muted/10 rounded-xl shadow-inner items-center justify-center p-6">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg text-muted-foreground">Carregando interface...</p>
              </div>
            }>
               <ActiveChatDisplay 
                messages={messages} 
                isMessagesLoading={isMessagesLoading} 
                currentUser={currentUser}
              />
            </Suspense>
            <div className="mt-auto sticky bottom-0 px-4 md:px-6 pt-2 pb-3 bg-background border-t border-border">
              <PromptForm
                onSubmit={handleSubmit}
                isLoading={combinedIsLoading}
                isImageLoading={isImageLoading}
                isInvestigating={isInvestigating}
                isSearching={isSearching}
                isUserLoggedIn={!!currentUser} 
              />
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

    