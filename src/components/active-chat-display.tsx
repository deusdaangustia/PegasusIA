
"use client";

import type { ChatMessage } from "@/services/chatHistoryService";
import type { FirebaseUser } from "@/services/authService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Bot, Loader2, AlertCircle, SearchCheck, SearchX, Sailboat, Link as LinkIcon, ImageIcon as ImageIconLucide, Wand2, MessageSquare } from "lucide-react";
import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import Link from "next/link";
import React, { useEffect, useRef } from "react";

interface ActiveChatDisplayProps {
  messages: ChatMessage[];
  isMessagesLoading: boolean;
  currentUser: FirebaseUser | null;
}

export function ActiveChatDisplay({ messages, isMessagesLoading, currentUser }: ActiveChatDisplayProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages]);


  if (isMessagesLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-muted-foreground bg-muted/10 rounded-xl shadow-inner">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Carregando mensagens...</p>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground/80 bg-muted/10 rounded-xl shadow-inner h-full">
        <MessageSquare size={64} className="mb-6 opacity-40 text-primary" data-ai-hint="chat bubble" />
        <p className="text-xl font-medium text-foreground/90">Nenhuma conversa ainda...</p>
        <p className="text-sm text-muted-foreground">Comece uma nova conversa ao lado ou selecione uma existente!</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col w-full flex-1 bg-muted/10 rounded-xl shadow-inner overflow-hidden min-h-0">
      <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollAreaRef}>
        <div ref={viewportRef} className="space-y-6">
          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const displayTimestamp = msg.timestamp instanceof Timestamp
              ? msg.timestamp.toDate()
              : (msg.timestamp instanceof Date ? msg.timestamp : new Date());

            return (
              <div
                key={msg.id || `msg-${index}`}
                className={cn(
                  "flex items-end gap-3 w-full",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                {!isUser && (
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex-shrink-0">
                    <AvatarFallback><Bot size={18} /></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[75%] p-3 rounded-xl shadow-md break-words", 
                    isUser
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-card text-card-foreground rounded-bl-none border border-border"
                  )}
                >
                  {isUser && msg.prompt && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.prompt}</p>
                  )}

                  {!isUser && msg.response && (
                     <Card className="bg-transparent border-none shadow-none p-0 m-0">
                      <CardHeader className="p-0 mb-1">
                        <CardTitle className="flex items-center text-base text-inherit"><Wand2 className="mr-1.5 h-4 w-4" />Resposta</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans break-words">{msg.response}</pre>
                      </CardContent>
                    </Card>
                  )}

                  {!isUser && msg.image_uri && (
                    <Card className="mt-2">
                      <CardHeader className="pb-2 pt-3 px-3">
                         <CardTitle className="flex items-center text-base text-primary"><ImageIconLucide className="mr-1.5 h-4 w-4" />Imagem Gerada</CardTitle>
                      </CardHeader>
                      <CardContent className="p-2">
                        <img src={msg.image_uri} alt="Imagem gerada pela IA" data-ai-hint="generated art" className="rounded-md max-w-full h-auto object-contain" />
                      </CardContent>
                    </Card>
                  )}

                  {!isUser && (msg.investigation_data || msg.investigation_error) && (
                    <Card className="mt-2">
                       <CardHeader className="pb-2 pt-3 px-3">
                        <CardTitle className="flex items-center text-base text-primary">
                          {msg.investigation_error ? <SearchX className="mr-1.5 h-4 w-4"/> : <SearchCheck className="mr-1.5 h-4 w-4"/>}
                          Investigação: {msg.consultation_type || 'Resultado'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-2 text-xs">
                        {msg.investigation_error ? (
                           <Alert variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3" />
                            <AlertTitle className="text-xs font-semibold">Erro</AlertTitle>
                            <AlertDescription className="text-xs">{msg.investigation_error}</AlertDescription>
                          </Alert>
                        ) : (
                          <pre className="whitespace-pre-wrap bg-muted/50 p-2 rounded-md border border-border font-mono text-xs">{JSON.stringify(msg.investigation_data, null, 2)}</pre>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {!isUser && (msg.search_summary || (msg.search_results && msg.search_results.length > 0) || msg.search_error) && (
                     <Card className="mt-2">
                       <CardHeader className="pb-2 pt-3 px-3">
                        <CardTitle className="flex items-center text-base text-primary">
                          {msg.search_error ? <Sailboat className="mr-1.5 h-4 w-4"/> : <Sailboat className="mr-1.5 h-4 w-4"/>}
                          Navegação Web
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-2 space-y-2 text-xs">
                        {msg.search_error && (
                          <Alert variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3" />
                            <AlertTitle className="text-xs font-semibold">Erro na Navegação</AlertTitle>
                            <AlertDescription className="text-xs">{msg.search_error}</AlertDescription>
                          </Alert>
                        )}
                        {msg.search_summary && (
                          <div>
                            <h4 className="font-semibold mb-0.5 text-xs text-foreground/90">Resumo:</h4>
                            <p className="text-xs text-foreground/80 whitespace-pre-wrap">{msg.search_summary}</p>
                          </div>
                        )}
                        {msg.search_results && msg.search_results.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-1 text-xs text-foreground/90">Fontes:</h4>
                            <ul className="space-y-1.5">
                              {msg.search_results.map((item, idx) => (
                                <li key={idx} className="p-1.5 border border-border rounded-md bg-background/30 hover:shadow-sm transition-shadow text-xs">
                                  <Link href={item.link} target="_blank" rel="noopener noreferrer" className="group">
                                    <h5 className="text-xs font-medium text-primary group-hover:underline mb-0 flex items-center">
                                      <LinkIcon className="h-2.5 w-2.5 mr-1 text-muted-foreground flex-shrink-0"/> {item.title}
                                    </h5>
                                  </Link>
                                  <p className="text-xs text-muted-foreground truncate my-0.5">{item.link}</p>
                                  <p className="text-xs text-foreground/70">{item.snippet}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <p className={cn(
                    "text-xs mt-1.5",
                    isUser ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {formatDistanceToNow(displayTimestamp, { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                {isUser && currentUser && (
                  <Avatar className="h-8 w-8 bg-accent text-accent-foreground flex-shrink-0">
                     <AvatarImage src="https://files.catbox.moe/mm2ril.jpg" alt={currentUser.displayName || currentUser.email || 'User Avatar'} data-ai-hint="user avatar" />
                    <AvatarFallback><User size={18} /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
