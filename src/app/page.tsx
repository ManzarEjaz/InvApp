
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_REDIRECT_AUTHENTICATED, DEFAULT_REDIRECT_UNAUTHENTICATED } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';


export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace(DEFAULT_REDIRECT_AUTHENTICATED);
      } else {
        router.replace(DEFAULT_REDIRECT_UNAUTHENTICATED);
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-lg" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <p className="text-muted-foreground animate-pulse">Loading InvoiceFlow...</p>
      </div>
    </div>
  );
}
