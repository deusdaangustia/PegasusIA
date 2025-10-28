
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { AuthForm } from './AuthForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, UserCircle, Loader2, LogIn, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export function UserAuthDisplay() {
  const { currentUser, signOut, loading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authFormInitialMode, setAuthFormInitialMode] = useState<'login' | 'signup'>('login');
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: 'Logout bem-sucedido.' });
    } catch (error) {
      toast({ title: 'Erro ao sair', description: (error as Error).message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <Button variant="ghost" size="icon" disabled className="rounded-full w-10 h-10"><Loader2 className="h-5 w-5 animate-spin" /></Button>;
  }

  if (currentUser) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://files.catbox.moe/mm2ril.jpg" alt={currentUser.displayName || currentUser.email || 'User Avatar'} data-ai-hint="user avatar" />
              <AvatarFallback>
                <UserCircle className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Minha Conta</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {currentUser.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
      <div className="flex items-center gap-2">
        <DialogTrigger asChild>
           <Button variant="outline" onClick={() => { setAuthFormInitialMode('login'); setIsAuthModalOpen(true); }}>
            <LogIn className="mr-2 h-4 w-4" /> Entrar
          </Button>
        </DialogTrigger>
         <DialogTrigger asChild>
           <Button onClick={() => { setAuthFormInitialMode('signup'); setIsAuthModalOpen(true); }}>
             <UserPlus className="mr-2 h-4 w-4" /> Cadastrar
           </Button>
         </DialogTrigger>
      </div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
           <DialogTitle className="text-xl font-semibold text-center">
            {authFormInitialMode === 'login' ? 'Entrar na sua Conta' : 'Criar Nova Conta'}
           </DialogTitle>
           <DialogDescription className="text-center">
            {authFormInitialMode === 'login' 
              ? 'Use seu email e senha para acessar.' 
              : 'Preencha os campos para criar sua conta.'}
          </DialogDescription>
        </DialogHeader>
        <AuthForm 
          initialMode={authFormInitialMode} 
          onSuccess={() => setIsAuthModalOpen(false)} 
        />
        <DialogClose asChild>
          <button className="sr-only">Fechar</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
