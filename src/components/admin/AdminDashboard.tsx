
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation'; 
import { Loader2, Trash2, ShieldAlert, UserCog, Ban } from 'lucide-react';
import type { AdminPanelUser, UserRole } from '@/types/user';
import { getAllUsers, updateUserRole, deleteUser, banUser, CHATS_COLLECTION } from '@/services/adminService';
import { Timestamp } from 'firebase/firestore';

const OWNER_ROLE: UserRole = "dono";
const ADMIN_ROLE: UserRole = "admin";
const POSSIBLE_ROLES: UserRole[] = ["admin", "vip", "user", "ban"]; 

export default function AdminDashboard() {
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<AdminPanelUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); 

  const isAuthorizedAdmin = currentUser?.role === ADMIN_ROLE || currentUser?.role === OWNER_ROLE;

  const fetchUsers = useCallback(async () => {
    if (!isAuthorizedAdmin) {
        setIsLoadingUsers(false);
        return;
    }
    setIsLoadingUsers(true);
    try {
      const fetchedUsers = await getAllUsers();
      fetchedUsers.sort((a, b) => {
        if (a.role === OWNER_ROLE && b.role !== OWNER_ROLE) return -1;
        if (a.role !== OWNER_ROLE && b.role === OWNER_ROLE) return 1;
        if (a.role === ADMIN_ROLE && b.role !== ADMIN_ROLE) return -1;
        if (a.role !== ADMIN_ROLE && b.role === ADMIN_ROLE) return 1;
        
         const emailA = a.email.toLowerCase();
         const emailB = b.email.toLowerCase();
         if (emailA < emailB) return -1;
         if (emailA > emailB) return 1;
         return 0;
      });
      setUsers(fetchedUsers);
    } catch (error) {
      toast({ title: 'Erro ao Carregar Usuários', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast, isAuthorizedAdmin]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        toast({ title: 'Acesso Negado', description: 'Você precisa estar logado para acessar o painel admin.', variant: 'destructive' });
        router.push('/'); 
        return;
      }
      if (!isAuthorizedAdmin) {
        toast({ title: 'Acesso Negado', description: 'Você não tem permissão para acessar esta página.', variant: 'destructive' });
        router.push('/');
        return;
      }
      fetchUsers();
    }
  }, [currentUser, authLoading, router, toast, fetchUsers, isAuthorizedAdmin]);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (uid === currentUser?.uid && newRole !== currentUser.role && currentUser.role !== OWNER_ROLE) {
         toast({ title: 'Ação não Permitida', description: 'Administradores não podem rebaixar o próprio cargo.', variant: 'destructive'});
         return;
    }

    setIsProcessing(true);
    try {
      await updateUserRole(uid, newRole);
      toast({ title: 'Sucesso', description: `Cargo do usuário atualizado para ${newRole}.` });
      fetchUsers(); 
    } catch (error) {
      toast({ title: 'Erro ao Atualizar Cargo', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (uid: string, userEmail: string) => {
    setIsProcessing(true);
    try {
      await deleteUser(uid);
      toast({ title: 'Sucesso', description: `Usuário ${userEmail} excluído.` });
      fetchUsers(); 
    } catch (error) {
      toast({ title: 'Erro ao Excluir Usuário', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBanUser = async (uid: string, userEmail: string) => {
    setIsProcessing(true);
    try {
      await banUser(uid);
      toast({ title: 'Sucesso', description: `Usuário ${userEmail} banido.` });
      fetchUsers(); 
    } catch (error) {
      toast({ title: 'Erro ao Banir Usuário', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || (!isAuthorizedAdmin && !authLoading)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Verificando autorização...</p>
      </div>
    );
  }
  
  if (!isAuthorizedAdmin) {
     return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <p className="text-xl font-semibold text-destructive">Acesso Negado</p>
        <p className="text-muted-foreground">Você não tem permissão para ver esta página.</p>
        <Button onClick={() => router.push('/')} className="mt-6">Voltar para Home</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 md:px-6 lg:px-8 max-w-5xl">
      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl font-bold text-primary flex items-center"><UserCog className="mr-2 md:mr-3 h-6 w-6 md:h-7 md:w-7"/>Gerenciamento de Usuários</CardTitle>
          <CardDescription className="text-xs md:text-sm">Visualize e gerencie os usuários do sistema. Usuários "dono" não podem ser modificados por este painel.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Carregando usuários...</p>
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Nenhum usuário encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Email</TableHead>
                    <TableHead className="text-xs sm:text-sm">Nome</TableHead>
                    <TableHead className="min-w-[120px] sm:min-w-[150px] text-xs sm:text-sm">Cargo</TableHead>
                    <TableHead className="text-right min-w-[160px] sm:min-w-[200px] text-xs sm:text-sm">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid} className={user.role === 'ban' ? 'bg-destructive/10' : ''}>
                      <TableCell className="font-medium truncate max-w-[150px] sm:max-w-xs text-xs sm:text-sm">{user.email}</TableCell>
                      <TableCell className="truncate max-w-[100px] sm:max-w-xs text-xs sm:text-sm">{user.name || <span className="text-muted-foreground/70">N/A</span>}</TableCell>
                      <TableCell>
                        {user.role === OWNER_ROLE ? (
                          <span className="font-semibold text-primary text-xs sm:text-sm">{user.role.toUpperCase()}</span>
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(newRole) => handleRoleChange(user.uid, newRole as UserRole)}
                            disabled={isProcessing || user.role === OWNER_ROLE || currentUser?.uid === user.uid && currentUser.role !== OWNER_ROLE}
                          >
                            <SelectTrigger className="w-[100px] sm:w-[120px] h-8 sm:h-9 text-xs" disabled={isProcessing || user.role === OWNER_ROLE || (currentUser?.uid === user.uid && currentUser.role !== OWNER_ROLE)}>
                              <SelectValue placeholder="Cargo" />
                            </SelectTrigger>
                            <SelectContent>
                              {POSSIBLE_ROLES.map(r => (
                                <SelectItem key={r} value={r} className="text-xs">
                                  {r.toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1 sm:space-x-2">
                        {user.role !== 'ban' && user.role !== OWNER_ROLE && (
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-yellow-600 border-yellow-600 hover:bg-yellow-500 hover:text-white h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm" 
                                disabled={isProcessing || user.role === OWNER_ROLE}
                              >
                                <Ban className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5"/>Banir
                               </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Banimento</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja banir o usuário {user.email}? Esta ação mudará o cargo dele para "ban".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleBanUser(user.uid, user.email)} 
                                  disabled={isProcessing}
                                  className="bg-yellow-500 hover:bg-yellow-600"
                                >
                                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar Banimento
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                         {user.role === 'ban' && user.role !== OWNER_ROLE && (
                            <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-500 hover:text-white h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                                onClick={() => handleRoleChange(user.uid, 'user')} 
                                disabled={isProcessing || user.role === OWNER_ROLE}>
                                Desbanir
                            </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                              disabled={isProcessing || user.role === OWNER_ROLE}
                            >
                              <Trash2 className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir permanentemente o usuário {user.email} e todos os seus dados de chat? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteUser(user.uid, user.email)} 
                                disabled={isProcessing}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                               {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar Exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
       <Card className="mt-6 shadow-lg w-full">
        <CardHeader>
            <CardTitle className="flex items-center text-base md:text-lg"><ShieldAlert className="mr-2 h-5 w-5 text-primary" />Regras de Segurança e Observações</CardTitle>
        </CardHeader>
        <CardContent className="text-xs md:text-sm text-muted-foreground space-y-2">
            <p>
                <strong className="text-foreground">Gerenciamento de Cargos:</strong> Usuários com o cargo "dono" possuem o nível mais alto de acesso e não podem ter seu cargo alterado ou serem excluídos através deste painel.
                O cargo "dono" não pode ser atribuído a outros usuários por aqui.
            </p>
            <p>
                <strong className="text-foreground">Exclusão de Usuário:</strong> A exclusão de um usuário removerá seu registro do Firestore e todos os históricos de chat associados a ele. Esta ação é irreversível.
            </p>
            <p>
                <strong className="text-foreground">Banimento de Usuário:</strong> Banir um usuário mudará seu cargo para "ban". Usuários banidos podem ter o acesso restrito conforme implementado no frontend e nas regras de segurança.
            </p>
            <p>
                <strong className="text-foreground">Segurança do Firestore:</strong> É crucial configurar as Regras de Segurança do Firestore adequadamente. As regras devem permitir que apenas "admin" ou "dono" realizem operações de escrita na coleção de usuários e chats, e que usuários normais só possam ler/escrever seus próprios dados de chat.
            </p>
            <p className="font-semibold text-foreground">Exemplo de Regras de Segurança do Firestore (para `firestore.rules`):</p>
            <pre className="bg-muted/50 p-2 sm:p-3 rounded-md text-[10px] sm:text-xs overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && 
                    (request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'dono');
      
      allow create: if request.auth != null && request.auth.uid == userId;
      
      allow update: if request.auth != null && 
                      (
                        (request.auth.uid == userId && !(request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']))) ||
                        ((get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
                          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'dono') &&
                         resource.data.role != 'dono' && 
                         request.resource.data.role != 'dono') 
                      );
      
      allow delete: if request.auth != null &&
                      (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'dono') &&
                      resource.data.role != 'dono';
    }

    match /PegasusChatsV1/{chatId} {
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.userId;
      
      allow read, update: if request.auth != null && 
                             request.auth.uid == resource.data.userId;
      
      allow delete: if request.auth != null && 
                      (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'dono');

      match /messages/{messageId} {
        allow create: if request.auth != null &&
                         request.auth.uid == get(/databases/$(database)/documents/PegasusChatsV1/$(chatId)).data.userId;

        allow read: if request.auth != null &&
                       request.auth.uid == get(/databases/$(database)/documents/PegasusChatsV1/$(chatId)).data.userId;
        
        allow delete: if request.auth != null && 
                        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
                         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'dono');
      }
    }
  }
}`}
            </pre>
        </CardContent>
       </Card>
    </div>
  );
}
