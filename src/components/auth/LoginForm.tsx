
"use client";

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { APP_NAME } from '@/lib/constants';
import LogoIcon from '@/components/icons/LogoIcon';
import { Loader2 } from 'lucide-react';

const pinSchema = z.object({
  pin: z.string().length(5, "PIN must be 5 digits").regex(/^\d{5}$/, "PIN must be 5 digits"),
});

type PinFormValues = z.infer<typeof pinSchema>;

export default function LoginForm() {
  const { login, setupPin, isPinSet, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PinFormValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      pin: '',
    },
  });

  const onSubmit: SubmitHandler<PinFormValues> = async (data) => {
    setIsSubmitting(true);
    if (isPinSet) {
      await login(data.pin);
    } else {
      await setupPin(data.pin);
    }
    setIsSubmitting(false);
    form.reset();
  };

  const effectiveIsLoading = authLoading || isSubmitting;

  return (
    <Card className="w-full shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 text-primary">
           <LogoIcon className="h-full w-full" />
        </div>
        <CardTitle className="text-2xl font-bold">{isPinSet ? `Welcome to ${APP_NAME}` : `Setup PIN for ${APP_NAME}`}</CardTitle>
        <CardDescription>
          {isPinSet ? 'Enter your 5-digit PIN to access your account.' : 'Create a 5-digit PIN to secure your account.'}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="pin">PIN</FormLabel>
                  <FormControl>
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="•••••"
                      {...field}
                      className="text-center text-lg tracking-[0.5em]"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={effectiveIsLoading}>
              {effectiveIsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPinSet ? 'Login' : 'Setup PIN'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
