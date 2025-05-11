
import InvoiceForm from "@/components/invoices/InvoiceForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateInvoicePage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
          <p className="text-muted-foreground">Fill in the details below to generate a new invoice.</p>
        </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>New Invoice Details</CardTitle>
          <CardDescription>Enter customer information, add line items, and set payment terms.</CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceForm />
        </CardContent>
      </Card>
    </div>
  );
}
