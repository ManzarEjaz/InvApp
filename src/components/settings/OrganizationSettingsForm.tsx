
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAppState } from '@/contexts/AppStateContext';
import type { OrganizationDetails } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const orgDetailsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyLogo: z.string().optional(),
  gstNumber: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  contactDetails: z.string().min(1, "Contact details are required"),
  invoiceHeaderColor: z.string()
    .regex(/^(|#[0-9a-fA-F]{6})$/, "Must be a valid hex color (e.g. #RRGGBB) or empty to use default.")
    .optional(),
  themeAccentColor: z.string()
    .regex(/^(|#[0-9a-fA-F]{6})$/, "Must be a valid hex color (e.g. #RRGGBB) or empty to use default.")
    .optional(),
});

type OrgDetailsFormValues = z.infer<typeof orgDetailsSchema>;

const DEFAULT_INVOICE_HEADER_COLOR = '#739EDC';
const DEFAULT_THEME_ACCENT_COLOR = '#149E8E';

export default function OrganizationSettingsForm() {
  const { organizationDetails, setOrganizationDetails, logAction } = useAppState();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<OrgDetailsFormValues>({
    resolver: zodResolver(orgDetailsSchema),
    defaultValues: {
      companyName: organizationDetails?.companyName || '',
      companyLogo: organizationDetails?.companyLogo || '',
      gstNumber: organizationDetails?.gstNumber || '',
      address: organizationDetails?.address || '',
      contactDetails: organizationDetails?.contactDetails || '',
      invoiceHeaderColor: organizationDetails?.invoiceHeaderColor || DEFAULT_INVOICE_HEADER_COLOR,
      themeAccentColor: organizationDetails?.themeAccentColor || DEFAULT_THEME_ACCENT_COLOR,
    },
  });

  useEffect(() => {
    if (organizationDetails) {
      form.reset({
        ...organizationDetails,
        invoiceHeaderColor: organizationDetails.invoiceHeaderColor || DEFAULT_INVOICE_HEADER_COLOR,
        themeAccentColor: organizationDetails.themeAccentColor || DEFAULT_THEME_ACCENT_COLOR,
      });
      if (organizationDetails.companyLogo) {
        setLogoPreview(organizationDetails.companyLogo);
      }
    }
  }, [organizationDetails, form]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "Logo Too Large", description: "Please select a logo smaller than 2MB.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        form.setValue('companyLogo', base64String, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit: SubmitHandler<OrgDetailsFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      // Ensure empty strings for colors are treated as undefined to trigger defaults if necessary
      const processedData = {
        ...data,
        invoiceHeaderColor: data.invoiceHeaderColor === "" ? undefined : data.invoiceHeaderColor,
        themeAccentColor: data.themeAccentColor === "" ? undefined : data.themeAccentColor,
      };
      setOrganizationDetails(processedData);
      logAction("Updated Organization Settings");
      toast({ title: "Settings Saved", description: "Your organization details have been updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Organization Details</CardTitle>
        <CardDescription>Manage your company's information for invoices and records.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl><Input placeholder="Your Company LLC" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormItem>
                <FormLabel>Company Logo</FormLabel>
                <FormControl>
                    <Input 
                        id="companyLogo"
                        type="file" 
                        accept="image/png, image/jpeg, image/svg+xml"
                        onChange={handleLogoChange}
                        className="hidden"
                    />
                </FormControl>
                <Label 
                    htmlFor="companyLogo" 
                    className={cn(
                        "mt-1 flex justify-center w-full rounded-md border-2 border-dashed border-border px-6 pt-5 pb-6 cursor-pointer hover:border-primary transition-colors",
                        logoPreview && "p-2"
                    )}
                >
                {logoPreview ? (
                    <div className="relative w-full h-32">
                        <Image data-ai-hint="company logo" src={logoPreview} alt="Logo Preview" fill objectFit="contain" />
                    </div>
                ) : (
                    <div className="space-y-1 text-center">
                        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                        <div className="flex text-sm text-muted-foreground">
                            <span>Upload a file</span>
                        </div>
                        <p className="text-xs text-muted-foreground">PNG, JPG, SVG up to 2MB</p>
                    </div>
                )}
                </Label>
                {logoPreview && (
                     <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => {
                        setLogoPreview(null);
                        form.setValue('companyLogo', '');
                        const fileInput = document.getElementById('companyLogo') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                     }}>
                        Remove Logo
                    </Button>
                )}
                <FormMessage>{form.formState.errors.companyLogo?.message}</FormMessage>
            </FormItem>


            <FormField
              control={form.control}
              name="gstNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GST Number (Optional)</FormLabel>
                  <FormControl><Input placeholder="Your Company GSTIN" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Textarea placeholder="123 Business Rd, Suite 456, City, Country" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Details (Email, Phone)</FormLabel>
                  <FormControl><Input placeholder="contact@example.com / +1 555-1234" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="invoiceHeaderColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Header Color (Company Name)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input type="color" {...field} value={field.value || DEFAULT_INVOICE_HEADER_COLOR} className="w-12 h-10 p-1" />
                        <Input 
                          type="text" 
                          value={field.value || ''} 
                          onChange={field.onChange}
                          placeholder={DEFAULT_INVOICE_HEADER_COLOR}
                          className="w-32"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Color for the company name on invoices. Cleared uses default.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="themeAccentColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme Accent Color (UI Elements)</FormLabel>
                    <FormControl>
                       <div className="flex items-center gap-2">
                        <Input type="color" {...field} value={field.value || DEFAULT_THEME_ACCENT_COLOR} className="w-12 h-10 p-1" />
                         <Input 
                          type="text" 
                          value={field.value || ''} 
                          onChange={field.onChange}
                          placeholder={DEFAULT_THEME_ACCENT_COLOR}
                          className="w-32"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Main accent color for UI elements. Cleared uses default.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

