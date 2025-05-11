
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/shared/AppHeader';
// import AppSidebar from '@/components/shared/AppSidebar'; // Using shadcn sidebar
import { DEFAULT_REDIRECT_UNAUTHENTICATED } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarProvider, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import AppSidebar from '@/components/shared/AppSidebar'; // Using the custom AppSidebar adapting shadcn's
import ThemeApplicator from '@/components/shared/ThemeApplicator';


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(DEFAULT_REDIRECT_UNAUTHENTICATED);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // This case should ideally be handled by the redirect, but as a fallback:
    return (
       <div className="flex h-screen w-screen items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
        <ThemeApplicator />
        <AppSidebar className="print:hidden" />
        <SidebarRail className="print:hidden" />
        
        <SidebarInset className="print:!p-0 print:!m-0 print:border-none print:shadow-none">
            <AppHeader className="print:hidden" />
            <main 
                className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto print:!p-0 print:!m-0 print:overflow-visible"
            >
                {children}
            </main>
        </SidebarInset>
    </SidebarProvider>
  );
}

