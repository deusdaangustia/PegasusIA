
'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { AuthError } from 'firebase/auth';

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres.' }),
});

const signupSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem.",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

interface AuthFormProps {
  initialMode?: 'login' | 'signup';
  onSuccess?: () => void;
}

export function AuthForm({ initialMode = 'login', onSuccess }: AuthFormProps) {
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const currentSchema = isLoginMode ? loginSchema : signupSchema;
  type CurrentFormValues = z.infer<typeof currentSchema>;

  const form = useForm<CurrentFormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      email: '',
      password: '',
      ...( !isLoginMode && { confirmPassword: '' }),
    },
  });

  useEffect(() => {
    setIsLoginMode(initialMode === 'login');
    form.reset({
        email: '',
        password: '',
        ...(initialMode !== 'login' && { confirmPassword: '' }),
    });
  }, [initialMode, form]);

  const onSubmit: SubmitHandler<CurrentFormValues> = async (data) => {
    setIsLoading(true);
    try {
      if (isLoginMode) {
        await signIn(data.email, data.password);
        toast({ title: 'Login bem-sucedido!', description: 'Bem-vindo de volta.' });
      } else {
        await signUp(data.email, (data as SignupFormValues).password);
        toast({ title: 'Cadastro realizado!', description: 'Sua conta foi criada com sucesso.' });
      }
      form.reset();
      onSuccess?.();
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = 'Ocorreu um erro. Tente novamente.';
      if (authError.code) {
        switch (authError.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential': 
            errorMessage = 'Email ou senha incorretos.';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'Este email já está em uso.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Email inválido.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Senha muito fraca. Tente uma mais forte.';
            break;
          case 'auth/configuration-not-found':
            errorMessage = 'Configuração de autenticação não encontrada. Verifique as configurações do Firebase (especialmente se "Email/Senha" está ativo) ou contate o suporte.';
            console.error("Firebase Auth Error: 'auth/configuration-not-found'.", authError);
            break;
          default:
            errorMessage = `Erro desconhecido (${authError.code}): ${authError.message}`.substring(0, 200) ;
        }
      } else {
        errorMessage = (error as Error).message || errorMessage;
      }
      toast({ title: isLoginMode ? 'Erro no Login' : 'Erro no Cadastro', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="seu@email.com" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isLoginMode && (
          <FormField
            control={form.control}
            name={"confirmPassword" as keyof CurrentFormValues}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Senha</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoginMode ? 'Entrar' : 'Cadastrar'}
        </Button>
        <Button
          type="button"
          variant="link"
          className="w-full text-sm pt-2"
          onClick={() => {
            setIsLoginMode(!isLoginMode);
            form.reset({
                email: '',
                password: '',
                ...(!isLoginMode === false && { confirmPassword: '' }),
            });
          }}
          disabled={isLoading}
        >
          {isLoginMode ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
        </Button>
      </form>
    </Form>
  );
}
