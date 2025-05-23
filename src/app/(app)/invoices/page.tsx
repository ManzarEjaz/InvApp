
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppState } from "@/contexts/AppStateContext";
import Link from "next/link";
import { PlusCircle, Edit3, Eye, Trash2, Search, FileText, Printer, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import type { Invoice } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import InvoicePreview from "@/components/invoices/InvoicePreview"; 
import html2pdf from 'html2pdf.js';
import * as ReactDOMClient from 'react-dom/client'; 

export default function InvoicesPage() {
  const { invoices, deleteInvoice, logAction } = useAppState();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState<string | null>(null); 

  const filteredInvoices = invoices
    .filter(invoice => {
      if (!invoice) return false; 
      const searchTermLower = searchTerm.toLowerCase();
      const invoiceNumberMatch = typeof invoice.invoiceNumber === 'string' && invoice.invoiceNumber.toLowerCase().includes(searchTermLower);
      const customerNameMatch = typeof invoice.customerName === 'string' && invoice.customerName.toLowerCase().includes(searchTermLower);
      return invoiceNumberMatch || customerNameMatch;
    })
    .sort((a, b) => {
      const dateA = a && a.date ? new Date(a.date).getTime() : 0;
      const dateB = b && b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });


  const handleDelete = (invoiceId: string, invoiceNumber: string) => {
    deleteInvoice(invoiceId);
    logAction(`Deleted invoice ${invoiceNumber}`);
    toast({ title: "Invoice Deleted", description: `Invoice ${invoiceNumber} has been deleted.`});
  };

  const commonPdfOptions = (invoiceNumber: string) => ({
    margin: 0.5, 
    filename: `invoice-${invoiceNumber || 'unknown'}.pdf`, 
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  });

  const handleDirectPrint = async (invoiceToPrint: Invoice) => {
    if (!invoiceToPrint || !invoiceToPrint.id || isPrinting === invoiceToPrint.id) return;
    setIsPrinting(invoiceToPrint.id);

    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.left = '-9999px'; 
    printContainer.style.top = '-9999px';
    printContainer.style.width = '210mm'; 
    printContainer.style.height = '297mm'; 
    document.body.appendChild(printContainer);

    let reactRoot: ReactDOMClient.Root | null = null;
    if (typeof ReactDOMClient.createRoot === 'function') {
        reactRoot = ReactDOMClient.createRoot(printContainer);
        reactRoot.render(<InvoicePreview invoice={invoiceToPrint} />);
    } else {
        toast({ title: "Print Error", description: "Unsupported React version for printing.", variant: "destructive" });
        if (printContainer.parentNode === document.body) document.body.removeChild(printContainer);
        setIsPrinting(null);
        return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500)); 

    const opt = commonPdfOptions(invoiceToPrint.invoiceNumber);
    let blobUrl = '';

    const appLayoutMain = document.querySelector('main.flex-1');
    let originalMainClass: string | undefined;
    if (appLayoutMain) {
      originalMainClass = appLayoutMain.className;
      appLayoutMain.className = 'p-0 m-0 overflow-visible';
    }

    try {
      const contentToPrint = printContainer.firstChild;
      if (!contentToPrint) {
        throw new Error("Invoice content not found for printing.");
      }

      const pdfBlob = await html2pdf().from(contentToPrint).set(opt).output('blob');
      blobUrl = URL.createObjectURL(pdfBlob);

      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          try {
            if (!printWindow.closed) {
              printWindow.focus();
              printWindow.print();
            }
          } catch (e) {
            console.error("Error initiating print in new window (onload):", e);
            toast({
              title: "Print Ready",
              description: "Invoice opened. Use browser's print (Ctrl/Cmd+P).",
            });
          }
        };
         setTimeout(() => {
            if (printWindow && !printWindow.closed) {
                try {
                    if (typeof printWindow.print === 'function') {
                        printWindow.focus();
                        printWindow.print();
                    }
                } catch (e) {
                     console.error("Error initiating print in new window (timeout fallback):", e);
                     if (!(toast.toasts && toast.toasts.find(t => t.title === "Print Ready"))) {
                        toast({
                            title: "Print Ready",
                            description: "Invoice opened. Use browser's print (Ctrl/Cmd+P).",
                        });
                     }
                }
            }
        }, 1200);
      } else {
        toast({ title: "Print Error", description: "Could not open print window. Check pop-up blocker.", variant: "destructive" });
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('Error generating or printing PDF:', error);
      let description = 'Unknown error during print preparation';
      const errString = String(error).toLowerCase();

      if (error instanceof Error) {
        description = error.message;
      }
      
      if (errString.includes('networkerror') || (error instanceof Error && error.message.toLowerCase().includes('networkerror'))) {
        description = "A network error occurred while preparing the PDF for printing, possibly when fetching an image. Please check your connection.";
      }
      
      toast({ title: "Print Error", description: `Failed: ${description}`, variant: "destructive" });
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    } finally {
      if (appLayoutMain && originalMainClass !== undefined) {
        appLayoutMain.className = originalMainClass;
      }
      if (reactRoot) reactRoot.unmount();
      if (printContainer.parentNode === document.body) { 
          document.body.removeChild(printContainer);
      }
      setIsPrinting(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage and track all your customer invoices.</p>
        </div>
        <Button asChild>
          <Link href="/invoices/create">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Invoice
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>A summary of all your invoices.</CardDescription>
           <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search by Invoice # or Customer..."
              className="pl-10 w-full sm:w-1/2 lg:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-xl font-semibold">No Invoices Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? "Try adjusting your search." : "Get started by creating a new invoice."}
              </p>
              {!searchTerm && (
                <Button asChild className="mt-4">
                  <Link href="/invoices/create">Create Invoice</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    if (!invoice || !invoice.id) {
                        console.warn("Skipping rendering of invalid invoice data in list:", invoice);
                        return null;
                    }
                    const statusDisplay = typeof invoice.status === 'string'
                        ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)
                        : 'Unknown';
                    
                    return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber || 'N/A'}</TableCell>
                      <TableCell>{invoice.customerName || 'N/A'}</TableCell>
                      <TableCell>{invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>{(invoice.grandTotal ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          invoice.status === 'paid' ? 'default' : 
                          invoice.status === 'sent' ? 'secondary' : 
                          invoice.status === 'draft' ? 'outline' : 
                          'destructive'
                        } className={
                          invoice.status === 'paid' ? 'bg-green-500 text-white' : ''
                        }>
                          {statusDisplay}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" asChild title="View">
                          <Link href={`/invoices/${invoice.id}/preview`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Edit">
                          <Link href={`/invoices/${invoice.id}/edit`}><Edit3 className="h-4 w-4" /></Link>
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDirectPrint(invoice)} 
                            disabled={isPrinting === invoice.id}
                            title="Print Invoice"
                        >
                          {isPrinting === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete invoice {invoice.invoiceNumber || 'N/A'}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(invoice.id, invoice.invoiceNumber || 'N/A')} className="bg-destructive hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {filteredInvoices.length > 0 && (
          <CardFooter className="text-sm text-muted-foreground">
            Showing {filteredInvoices.length} of {invoices.length} invoices.
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

