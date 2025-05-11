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
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  });

  const withTemporaryLayoutChange = async <T,>(action: () => Promise<T>): Promise<T> => {
    const appLayoutMain = document.querySelector('main.flex-1');
    const originalMainClass = appLayoutMain?.className;
    if (appLayoutMain) {
      appLayoutMain.className = 'p-0 m-0 overflow-visible';
    }

    try {
      return await action();
    } finally {
      if (appLayoutMain && originalMainClass) {
        appLayoutMain.className = originalMainClass;
      }
    }
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
          toast({ title: "Download Error", description: "Failed to generate PDF for download.", variant: "destructive" });
        }
      });
    }
  };

  const handlePrintPdf = async () => {
    if (!invoice || !invoicePreviewRef.current) return;

    const element = invoicePreviewRef.current;
    const opt = commonPdfOptions(invoice.invoiceNumber);
    let blobUrl = ''; // Keep blobUrl in a broader scope for cleanup

    await withTemporaryLayoutChange(async () => {
      try {
        blobUrl = await html2pdf().from(element).set(opt).output('bloburl');
        
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none'; // Keep it hidden

        // It's generally better to set up handlers before src
        iframe.onload = () => {
          setTimeout(() => { // Ensure PDF is rendered in iframe
            try {
              if (iframe.contentWindow && typeof iframe.contentWindow.print === 'function') {
                iframe.contentWindow.focus(); // Focus the iframe's content window
                iframe.contentWindow.print(); // Trigger print dialog
              } else {
                console.error("Print Error: Iframe content window or print function not available.");
                toast({ title: "Print Error", description: "Failed to prepare document for printing.", variant: "destructive" });
              }
            } catch (printError) {
              console.error("Error during printing:", printError);
              toast({ title: "Print Error", description: "Could not initiate printing.", variant: "destructive" });
            } finally {
              // Cleanup iframe and blob URL
              // Use a timeout to ensure print dialog isn't interrupted
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
                if (blobUrl) { 
                  URL.revokeObjectURL(blobUrl);
                }
              }, 1000); // Delay cleanup slightly
            }
          }, 500); // Timeout for PDF rendering in iframe
        };

        iframe.onerror = (errEvt) => {
          // errEvt could be an Event or string depending on browser
          console.error("Error loading PDF into iframe:", errEvt);
          toast({ title: "Print Error", description: "Failed to load PDF for printing.", variant: "destructive" });
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }
        };
        
        iframe.src = blobUrl;
        document.body.appendChild(iframe);

      } catch (err) {
        console.error("Error generating PDF for printing:", err);
        toast({ title: "PDF Error", description: "Failed to generate PDF for printing.", variant: "destructive" });
        if (blobUrl) { // If blobUrl was created before an error in iframe handling
          URL.revokeObjectURL(blobUrl);
        }
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
