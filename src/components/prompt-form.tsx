
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form"; 
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Wand2, ImageIcon, Search, LogIn, Sailboat } from "lucide-react";
import { consultationOptions } from "@/config/investigationOptions"; 
import React from "react";

const formSchema = z.object({
  prompt: z.string().max(5000, { 
    message: "O prompt não pode exceder 5000 caracteres."
  }).refine(data => data.trim().length > 0, {
    message: "O prompt não pode estar vazio.",
  }),
  generateImage: z.boolean().optional().default(false),
  performInvestigation: z.boolean().optional().default(false),
  consultationType: z.string().optional(),
  performSearch: z.boolean().optional().default(false),
}).refine(
  (data) => {
    if (data.performInvestigation && !data.consultationType) {
      return false; 
    }
    return true;
  },
  {
    message: "Selecione um tipo de consulta para investigar.",
    path: ["consultationType"], 
  }
);

type PromptFormValues = z.infer<typeof formSchema>;

interface PromptFormProps {
  onSubmit: (values: PromptFormValues) => void;
  isLoading: boolean; 
  isImageLoading?: boolean;
  isInvestigating?: boolean;
  isSearching?: boolean;
  isUserLoggedIn: boolean;
}

export function PromptForm({ onSubmit, isLoading, isImageLoading, isInvestigating, isSearching, isUserLoggedIn }: PromptFormProps) {
  const form = useForm<PromptFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      generateImage: false,
      performInvestigation: false,
      consultationType: undefined,
      performSearch: false,
    },
  });

  const performInvestigationWatch = form.watch('performInvestigation');
  const generateImageWatch = form.watch('generateImage');
  const performSearchWatch = form.watch('performSearch');

  React.useEffect(() => {
    if (performInvestigationWatch) {
      if (generateImageWatch) form.setValue('generateImage', false);
      if (performSearchWatch) form.setValue('performSearch', false);
    }
    if (generateImageWatch) {
      if (performInvestigationWatch) form.setValue('performInvestigation', false);
      if (performSearchWatch) form.setValue('performSearch', false);
    }
    if (performSearchWatch) {
      if (performInvestigationWatch) form.setValue('performInvestigation', false);
      if (generateImageWatch) form.setValue('generateImage', false);
    }

    if (!isUserLoggedIn) {
        form.setValue('generateImage', false);
        form.setValue('performInvestigation', false);
        form.setValue('performSearch', false);
    }
  }, [performInvestigationWatch, generateImageWatch, performSearchWatch, form, isUserLoggedIn]);


  const effectiveIsLoading = isLoading || (isImageLoading ?? false) || (isInvestigating ?? false) || (isSearching ?? false);
  const currentPrompt = form.watch('prompt');
  
  let placeholderText = "Pergunte à Pegasus...";
  if (isUserLoggedIn) {
    if (performInvestigationWatch) {
      placeholderText = "Digite o dado para o tipo de consulta selecionado...";
    } else if (performSearchWatch) {
      placeholderText = "O que você deseja pesquisar na web?";
    } 
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3"> 
        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <div className="relative flex w-full items-end">
                <FormControl>
                  <Textarea
                    placeholder={placeholderText}
                    className="min-h-[56px] flex-1 resize-none text-base bg-muted/30 border-input focus:border-primary pr-[calc(theme(width.10)_*_2_+_theme(space.1.5)_*_2_)] rounded-xl shadow-sm placeholder:text-muted-foreground/70" 
                    {...field}
                    disabled={effectiveIsLoading}
                    aria-label="Área de entrada do prompt"
                    onKeyDown={(e) => {
                      const isSubmitReady = currentPrompt.trim().length > 0;
                      if (e.key === 'Enter' && !e.shiftKey && !effectiveIsLoading && isSubmitReady && !(performInvestigationWatch && isUserLoggedIn && !form.getValues('consultationType'))) {
                        e.preventDefault();
                        form.handleSubmit(onSubmit)();
                      }
                    }}
                  />
                </FormControl>
                
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-lg text-muted-foreground hover:text-primary"
                        disabled={effectiveIsLoading}
                        aria-label="Opções de IA"
                      >
                        <Wand2 className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="end" className="w-auto p-2">
                      <TooltipProvider>
                        <div className="flex items-center space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant={form.watch('generateImage') ? "secondary" : "ghost"}
                                size="icon"
                                className="h-10 w-10"
                                onClick={() => form.setValue('generateImage', !form.watch('generateImage'), { shouldValidate: true, shouldDirty: true })}
                                disabled={effectiveIsLoading || !isUserLoggedIn} 
                                aria-pressed={form.watch('generateImage')}
                              >
                                <ImageIcon className="h-5 w-5" />
                                <span className="sr-only">Gerar Imagem</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={5}>
                              {!isUserLoggedIn ? (
                                <p className="flex items-center"><LogIn className="mr-1 h-3 w-3" /> Faça login para gerar imagem</p>
                              ) : (
                                <p>Gerar Imagem</p>
                              )}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant={performInvestigationWatch ? "secondary" : "ghost"}
                                size="icon"
                                className="h-10 w-10"
                                onClick={() => form.setValue('performInvestigation', !performInvestigationWatch, { shouldValidate: true, shouldDirty: true })}
                                disabled={effectiveIsLoading || !isUserLoggedIn}
                                aria-pressed={performInvestigationWatch}
                              >
                                <Search className="h-5 w-5" />
                                <span className="sr-only">Investigar Consulta</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={5}>
                               {!isUserLoggedIn ? (
                                <p className="flex items-center"><LogIn className="mr-1 h-3 w-3" /> Faça login para investigar</p>
                              ) : (
                                <p>Investigar Dado</p>
                              )}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant={performSearchWatch ? "secondary" : "ghost"}
                                size="icon"
                                className="h-10 w-10"
                                onClick={() => form.setValue('performSearch', !performSearchWatch, { shouldValidate: true, shouldDirty: true })}
                                disabled={effectiveIsLoading || !isUserLoggedIn}
                                aria-pressed={performSearchWatch}
                              >
                                <Sailboat className="h-5 w-5" /> 
                                <span className="sr-only">Navegar na Web</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={5}>
                               {!isUserLoggedIn ? (
                                <p className="flex items-center"><LogIn className="mr-1 h-3 w-3" /> Faça login para navegar</p>
                              ) : (
                                <p>Navegar na Web</p>
                              )}
                            </TooltipContent>
                          </Tooltip>

                        </div>
                      </TooltipProvider>
                    </PopoverContent>
                  </Popover>

                  <Button 
                    type="submit" 
                    disabled={effectiveIsLoading || currentPrompt.trim().length === 0 || (performInvestigationWatch && isUserLoggedIn && !form.watch('consultationType'))}
                    size="icon" 
                    className="h-10 w-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                    aria-label="Enviar prompt"
                  >
                    {effectiveIsLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
              <FormMessage className="pt-1 text-xs" />
            </FormItem>
          )}
        />

        {performInvestigationWatch && isUserLoggedIn && (
          <FormField
            control={form.control}
            name="consultationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Tipo de Investigação</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={effectiveIsLoading}>
                  <FormControl>
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="Selecione o tipo de consulta..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {consultationOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </form>
    </Form>
  );
}
