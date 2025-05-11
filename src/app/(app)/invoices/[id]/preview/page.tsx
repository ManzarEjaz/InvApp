
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
import { useToast } from "@/hooks/use-toast";

export default function PreviewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { getInvoiceById } = useAppState();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const invoicePreviewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const invoiceId = typeof params.id === 'string' ? params.id : undefined;

  useEffect(() => {
    if (invoiceId) {
      const foundInvoice = getInvoiceById(invoiceId);
      setInvoice(foundInvoice);
    } else {
      router.replace("/invoices");
    }
  }, [invoiceId, getInvoiceById, router]);

  const commonPdfOptions = (invoiceNumber: string) => ({
    margin: 0.5, // inches
    filename: `invoice-${invoiceNumber}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  });

  const withTemporaryLayoutChange = async <T,>(action: () => Promise<T>): Promise<T> => {
    const appLayoutMain = document.querySelector('main.flex-1');
    let originalMainClass: string | undefined;
    if (appLayoutMain) {
      originalMainClass = appLayoutMain.className;
      appLayoutMain.className = 'p-0 m-0 overflow-visible'; // Critical for full capture
    }
  
    let result: T;
    try {
      result = await action();
    } finally {
      if (appLayoutMain && originalMainClass !== undefined) {
        appLayoutMain.className = originalMainClass;
      }
    }
    return result;
  };

  const handleDownloadPdf = async () => {
    if (invoice && invoicePreviewRef.current) {
      const element = invoicePreviewRef.current;
      const opt = commonPdfOptions(invoice.invoiceNumber);

      await withTemporaryLayoutChange(async () => {
        try {
          await html2pdf().from(element).set(opt).save();
        } catch (err) {
          console.error("Error generating PDF for download:", err);
          let description = "Failed to generate PDF for download.";
          const errString = String(err).toLowerCase();
          if (errString.includes('networkerror') || (err instanceof Error && err.message.toLowerCase().includes('networkerror'))) {
            description = "A network error occurred while generating the PDF. This might be due to issues fetching external images (like a default logo). Please check your internet connection and try again.";
          }
          toast({ title: "Download Error", description, variant: "destructive" });
        }
      });
    }
  };

 const handlePrintPdf = async () => {
    if (!invoice || !invoicePreviewRef.current) return;

    const element = invoicePreviewRef.current;
    const opt = commonPdfOptions(invoice.invoiceNumber);
    let blobUrl = ''; 

    await withTemporaryLayoutChange(async () => {
      try {
        const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
        blobUrl = URL.createObjectURL(pdfBlob);

        const printWindow = window.open(blobUrl, '_blank');

        if (printWindow) {
          printWindow.onload = () => {
            setTimeout(() => {
              try {
                if (!printWindow.closed) {
                  printWindow.focus();
                  printWindow.print();
                }
              } catch (e) {
                console.error("Error initiating print in the new window (onload):", e);
                toast({
                  title: "Print Ready",
                  description: "Your invoice is in a new tab. Please use the browser's print option if the dialog didn't appear automatically.",
                });
              }
            }, 500); 
          };
           setTimeout(() => {
                if (printWindow && !printWindow.closed) {
                    try {
                        if (typeof printWindow.print === 'function') {
                            printWindow.focus(); 
                            printWindow.print();
                        }
                    } catch (e) {
                         console.error("Error initiating print in the new window (timeout fallback):", e);
                         if (!toast.toasts.find(t => t.title === "Print Ready")) {
                            toast({
                                title: "Print Ready",
                                description: "Invoice opened in new tab. Use browser's print option if needed.",
                            });
                         }
                    }
                }
            }, 1200); 
        } else {
          toast({ title: "Print Error", description: "Could not open print window. Check pop-up blocker.", variant: "destructive" });
          if (blobUrl) URL.revokeObjectURL(blobUrl);
        }
      } catch (err) {
        console.error("Error generating PDF for printing:", err);
        let description = "Failed to generate PDF for printing.";
        const errString = String(err).toLowerCase();
        if (errString.includes('networkerror') || (err instanceof Error && err.message.toLowerCase().includes('networkerror'))) {
          description = "A network error occurred while generating the PDF for printing. This might be due to issues fetching external images. Please check your connection and try again.";
        }
        toast({ title: "PDF Error", description, variant: "destructive" });
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      }
    });
  };


  if (invoice === undefined) {
    return (
       <div className="space-y-6">
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-1/4" />
            <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
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
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={handlePrintPdf}>
            <Printer className="mr-2 h-4 w-4" /> Print PDF
          </Button>
        </div>
      </div>
      <div ref={invoicePreviewRef}>
        <InvoicePreview invoice={invoice} />
      </div>
    </div>
  );
}

