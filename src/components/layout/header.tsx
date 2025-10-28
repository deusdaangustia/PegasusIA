import { Brain } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserAuthDisplay } from '@/components/auth/UserAuthDisplay';

export function Header() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm shadow-md sticky top-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <Brain className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold italic tracking-tight text-foreground">
            Pegasus v1
          </h1>
        </div>
        <UserAuthDisplay />
      </div>
    </header>
  );
}
