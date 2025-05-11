
"use client";
import InvoicePreview from "@/components/invoices/InvoicePreview";
import { useAppState } from "@/contexts/AppStateContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import type { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, AlertTriangle, Download } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import html2pdf from 'html2pdf.js';

export default function PreviewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { getInvoiceById } = useAppState();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  const invoiceId = typeof params.id === 'string' ? params.id : undefined;

  useEffect(() => {
    if (invoiceId) {
      const foundInvoice = getInvoiceById(invoiceId);
      setInvoice(foundInvoice);
    } else {
      router.replace("/invoices");
    }
  }, [invoiceId, getInvoiceById, router]);

  const handleDownloadPdf = () => {
    if (invoice && invoicePreviewRef.current) {
      const element = invoicePreviewRef.current;
      const opt = {
        margin: 0.5, // inches
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true }, // useCORS true if there are external images like logo
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      // Temporarily remove print-specific layout classes from the main app layout for PDF generation
      // This is a workaround if html2pdf still picks up some layout styles
      const appLayoutMain = document.querySelector('main.flex-1');
      const originalMainClass = appLayoutMain?.className;
      if (appLayoutMain) {
        appLayoutMain.className = 'p-0 m-0 overflow-visible'; 
      }

      html2pdf().from(element).set(opt).save().then(() => {
        // Restore original classes after PDF generation
        if (appLayoutMain && originalMainClass) {
          appLayoutMain.className = originalMainClass;
        }
      }).catch(err => {
        console.error("Error generating PDF:", err);
        // Restore original classes even if there's an error
        if (appLayoutMain && originalMainClass) {
          appLayoutMain.className = originalMainClass;
        }
      });
    }
  };

  if (invoice === undefined) {
    return (
       <div className="space-y-6">
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-1/4" />
            <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </div>
        </div>
        <Skeleton className="h-[800px] w-full" />
      </div>
    );
  }
  
  if (invoice === null) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Invoice Not Found</h2>
        <p className="text-muted-foreground">The invoice you are trying to preview does not exist.</p>
        <Button onClick={() => router.push('/invoices')} className="mt-6">
          Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>
      <div ref={invoicePreviewRef}>
        <InvoicePreview invoice={invoice} />
      </div>
    </div>
  );
}

