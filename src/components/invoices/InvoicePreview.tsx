
"use client";
import type { Invoice, OrganizationDetails, LineItem } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from 'next/image';

interface InvoicePreviewProps {
  invoice: Partial<Invoice>; // Allow partial invoice for robustness
}

const DEFAULT_INVOICE_HEADER_COLOR = 'hsl(var(--primary))'; 

export default function InvoicePreview({ invoice: partialInvoice }: InvoicePreviewProps) {
  // Provide defaults for a more robust component against partial/malformed data
  const invoice: Invoice = {
    id: partialInvoice.id || `temp-id-${Math.random().toString(16).slice(2)}`,
    invoiceNumber: partialInvoice.invoiceNumber || "N/A",
    date: partialInvoice.date || new Date().toISOString(),
    customerName: partialInvoice.customerName || "N/A",
    customerAddress: partialInvoice.customerAddress || "",
    lineItems: partialInvoice.lineItems || [],
    subTotal: partialInvoice.subTotal ?? 0,
    totalTax: partialInvoice.totalTax ?? 0,
    discountAmount: partialInvoice.discountAmount ?? 0,
    grandTotal: partialInvoice.grandTotal ?? 0,
    organizationDetails: partialInvoice.organizationDetails || ({} as OrganizationDetails),
    notes: partialInvoice.notes || "",
    status: partialInvoice.status || 'draft',
  };

  const org: Partial<OrganizationDetails> = invoice.organizationDetails || {};
  const companyNameColor = org.invoiceHeaderColor || DEFAULT_INVOICE_HEADER_COLOR;

  const getItemTotal = (item: LineItem) => {
    const basePrice = (item.quantity || 0) * (item.price ?? 0);
    const cgstAmount = basePrice * ((item.cgstRate || 0) / 100);
    const sgstAmount = basePrice * ((item.sgstRate || 0) / 100);
    return basePrice + cgstAmount + sgstAmount;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg print:shadow-none print:border-none">
      <CardContent className="p-6 sm:p-10 print:p-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-8">
          <div className="mb-4 sm:mb-0">
            {org.companyLogo && (
              <Image 
                data-ai-hint="company logo"
                src={org.companyLogo.startsWith('data:image') ? org.companyLogo : `https://picsum.photos/seed/${String(org.companyName || 'default-logo-seed')}/150/50`} 
                alt={`${String(org.companyName || 'Company')} Logo`} 
                width={150} 
                height={50}
                className="h-auto max-h-[60px] w-auto object-contain mb-2"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none';}} 
              />
            )}
            <h1 
              className="text-2xl font-bold" 
              style={{ color: companyNameColor }}
            >
              {org.companyName || "Your Company"}
            </h1>
            <p className="text-sm text-muted-foreground">{org.address || ""}</p>
            <p className="text-sm text-muted-foreground">{org.contactDetails || ""}</p>
            {org.gstNumber && <p className="text-sm text-muted-foreground">GSTIN: {org.gstNumber}</p>}
          </div>
          <div className="text-left sm:text-right">
            <h2 className="text-3xl font-semibold text-foreground mb-1">INVOICE</h2>
            <p className="text-sm text-muted-foreground"><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
            <p className="text-sm text-muted-foreground"><strong>Date:</strong> {invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <h3 className="text-md font-semibold text-muted-foreground mb-1">BILL TO:</h3>
          <p className="font-medium text-foreground">{invoice.customerName}</p>
          {invoice.customerAddress && <p className="text-sm text-muted-foreground">{invoice.customerAddress}</p>}
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2 pb-1">Item Description</TableHead>
                <TableHead className="text-center pb-1">Qty</TableHead>
                <TableHead className="text-right pb-1">Unit Price</TableHead>
                <TableHead className="text-center pb-1">CGST (%)</TableHead>
                <TableHead className="text-center pb-1">SGST (%)</TableHead>
                <TableHead className="text-right pb-1">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoice.lineItems || []).map((item, index) => (
                <TableRow key={item.id || `item-${index}-${Math.random().toString(16).slice(2)}`}>
                  <TableCell>{item.itemName || "N/A"}</TableCell>
                  <TableCell className="text-center">{item.quantity || 0}</TableCell>
                  <TableCell className="text-right">{(item.price ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center">{(item.cgstRate || 0).toFixed(2)}%</TableCell>
                  <TableCell className="text-center">{(item.sgstRate || 0).toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{getItemTotal(item).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mt-8">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Subtotal:</span>
              <span className="text-sm text-foreground">{(invoice.subTotal ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Tax (CGST + SGST):</span>
              <span className="text-sm text-foreground">{(invoice.totalTax ?? 0).toFixed(2)}</span>
            </div>
            {(invoice.discountAmount ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Discount:</span>
                <span className="text-sm text-foreground">-{(invoice.discountAmount ?? 0).toFixed(2)}</span>
              </div>
            )}
            <hr className="my-1 border-border"/>
            <div className="flex justify-between font-bold text-lg">
              <span className="text-foreground">Grand Total:</span>
              <span className="text-foreground">{(invoice.grandTotal ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Notes/Terms */}
        {invoice.notes && (
            <div className="mt-8 pt-4 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Notes/Terms:</h4>
                <p className="text-xs text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
            </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-center print:block">
            <p className="text-xs text-muted-foreground">Thank you for your business!</p>
          {(org.companyName || org.contactDetails) && 
            <p className="text-xs text-muted-foreground mt-1">
                {org.companyName || ""}{ (org.companyName && org.contactDetails) ? " - " : ""}{org.contactDetails || ""}
            </p>
          }
        </div>
      </CardContent>
    </Card>
  );
}

