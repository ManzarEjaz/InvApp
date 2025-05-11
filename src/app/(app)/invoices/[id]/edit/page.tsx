
"use client";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppState } from "@/contexts/AppStateContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Invoice } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { getInvoiceById } = useAppState();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined); // undefined for loading, null if not found

  const invoiceId = typeof params.id === 'string' ? params.id : undefined;

  useEffect(() => {
    if (invoiceId) {
      const foundInvoice = getInvoiceById(invoiceId);
      setInvoice(foundInvoice);
    } else {
      router.replace("/invoices"); // Or show an error
    }
  }, [invoiceId, getInvoiceById, router]);

  if (invoice === undefined) {
    return (
       <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-3/4" />
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-5 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <Skeleton className="h-10 w-1/4 mt-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invoice === null) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Invoice Not Found</h2>
        <p className="text-muted-foreground">The invoice you are trying to edit does not exist or could not be loaded.</p>
        <Button onClick={() => router.push('/invoices')} className="mt-6">
          Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Invoice #{invoice.invoiceNumber}</h1>
          <p className="text-muted-foreground">Modify the details for this invoice.</p>
        </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>Update customer information, line items, and payment terms.</CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceForm existingInvoice={invoice} />
        </CardContent>
      </Card>
    </div>
  );
}
