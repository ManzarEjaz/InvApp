
"use client";
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DEFAULT_REDIRECT_AUTHENTICATED } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(DEFAULT_REDIRECT_AUTHENTICATED);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || (!isLoading && isAuthenticated)) {
    // Show a loading state or skeleton while checking auth / redirecting
    return (
        <div className="w-full max-w-md space-y-6">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-full mx-auto" />
            <div className="space-y-4 pt-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full mt-4" />
        </div>
    );
  }

  return <LoginForm />;
}
