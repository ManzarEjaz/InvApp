
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/useLocalStorage';
import { PIN_STORAGE_KEY, USER_DATA_STORAGE_KEY, DEFAULT_REDIRECT_AUTHENTICATED, DEFAULT_REDIRECT_UNAUTHENTICATED } from '@/lib/constants';
import type { User } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  setupPin: (pin: string) => Promise<boolean>;
  isPinSet: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useLocalStorage<User | null>(USER_DATA_STORAGE_KEY, null);
  const [storedPin, setStoredPin] = useLocalStorage<string | null>(PIN_STORAGE_KEY, null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const isAuthenticated = !!user && user.pinSetup;
  const isPinSet = !!storedPin;

  useEffect(() => {
    setIsLoading(false);
  }, [user, storedPin]);

  const login = async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    if (storedPin === pin) {
      const userData: User = { pinSetup: true };
      setUser(userData);
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push(DEFAULT_REDIRECT_AUTHENTICATED);
      setIsLoading(false);
      return true;
    }
    toast({ title: "Login Failed", description: "Invalid PIN.", variant: "destructive" });
    setIsLoading(false);
    return false;
  };

  const setupPin = async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    if (pin.length !== 5 || !/^\d+$/.test(pin)) {
        toast({ title: "PIN Setup Failed", description: "PIN must be 5 digits.", variant: "destructive" });
        setIsLoading(false);
        return false;
    }
    setStoredPin(pin);
    const userData: User = { pinSetup: true };
    setUser(userData);
    toast({ title: "PIN Setup Successful", description: "You can now log in with your new PIN." });
    router.push(DEFAULT_REDIRECT_UNAUTHENTICATED); // Redirect to login to use the new PIN
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    // Optionally clear PIN too, or keep it for next login setup
    // setStoredPin(null); // Uncomment if PIN should be reset on logout
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push(DEFAULT_REDIRECT_UNAUTHENTICATED);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, logout, setupPin, isPinSet }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
