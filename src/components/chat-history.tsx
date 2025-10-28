
"use client";

import type { ChatListItem } from "@/services/chatHistoryService";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale'; 
import { Button } from "@/components/ui/button";
import { MessageSquareText, ChevronRight, Circle } from "lucide-react";
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface ChatHistoryProps {
  chatList: ChatListItem[];
  isLoading: boolean;
  onSelectChat: (chatId: string) => void;
  activeChatId: string | null;
}

export function ChatHistory({ chatList, isLoading, onSelectChat, activeChatId }: ChatHistoryProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!chatList || chatList.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
        <p className="text-xs text-muted-foreground/70">Seu histórico de conversas aparecerá aqui.</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
        <div className="space-y-1 p-2">
          {chatList.map((item) => {
            const displayTimestamp = item.updatedAt instanceof Timestamp 
                                      ? item.updatedAt.toDate() 
                                      : (item.updatedAt instanceof Date ? item.updatedAt : new Date());
            const isActive = item.id === activeChatId;

            return (
              <Button 
                key={item.id} 
                variant="ghost" 
                className={cn(
                  "w-full justify-between items-center h-auto py-2 px-3 text-left rounded-lg transition-colors duration-150 ease-in-out group",
                  isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                onClick={() => onSelectChat(item.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="flex items-start gap-2 w-full truncate"> 
                  {isActive ? (
                     <Circle className="mt-1 h-3 w-3 flex-shrink-0 text-primary fill-current" />
                  ) : (
                     <MessageSquareText className="mt-1 h-4 w-4 text-muted-foreground flex-shrink-0 group-hover:text-sidebar-accent-foreground" />
                  )}
                  <div className="truncate flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.title || "Chat sem título"}
                    </p>
                    <p className="text-xs text-muted-foreground group-hover:text-sidebar-accent-foreground/80">
                      {formatDistanceToNow(displayTimestamp, { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
              </Button>
            );
          })}
        </div>
    </div>
  );
}
