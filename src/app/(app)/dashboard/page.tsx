
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, FileText, Package, Settings } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome to InvoiceFlow</CardTitle>
          <CardDescription className="text-lg">
            Manage your invoices, inventory, and settings all in one place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            This is your central hub for all invoicing activities. Get started by creating a new invoice, managing your inventory, or configuring your organization's settings.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-medium">
              New Invoice
            </CardTitle>
            <PlusCircle className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription>Create and send professional invoices to your clients quickly and easily.</CardDescription>
          </CardContent>
          <CardContent>
             <Button asChild className="w-full">
                <Link href="/invoices/create">Create Invoice</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-medium">
              Manage Invoices
            </CardTitle>
            <FileText className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription>View, edit, and track the status of all your existing invoices.</CardDescription>
          </CardContent>
           <CardContent>
             <Button asChild className="w-full" variant="secondary">
                <Link href="/invoices">View Invoices</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-medium">
              Inventory
            </CardTitle>
            <Package className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription>Keep track of your products and services, manage stock levels, and set prices.</CardDescription>
          </CardContent>
           <CardContent>
             <Button asChild className="w-full" variant="secondary">
                <Link href="/inventory">Manage Inventory</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-medium">
              Settings
            </CardTitle>
            <Settings className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription>Configure your organization details, view action logs, and customize app preferences.</CardDescription>
          </CardContent>
           <CardContent>
             <Button asChild className="w-full" variant="secondary">
                <Link href="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
