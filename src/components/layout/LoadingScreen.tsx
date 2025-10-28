'use client';

import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black text-foreground">
      <div className="flex flex-col items-center gap-6">
        <div className="h-24 w-24 relative">
          <Image 
            src="https://blackstorage.store/midia/1761404455125.jpg" 
            alt="Pegasus Logo" 
            layout="fill"
            objectFit="cover"
            className="rounded-full"
            data-ai-hint="pegasus logo"
          />
        </div>
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-lg text-muted-foreground">Carregando Pegasus...</p>
        </div>
      </div>
    </div>
  );
}
