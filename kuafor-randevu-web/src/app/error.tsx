'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 p-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <h2 className="text-lg font-semibold">Bir şeyler yanlış gitti</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Üzgünüz, bir hata oluştu. Lütfen daha sonra tekrar deneyin veya sayfayı yenileyin.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
} 