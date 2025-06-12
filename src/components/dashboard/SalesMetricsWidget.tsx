
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, Package as PackageIcon } from "lucide-react";
import { useAppState } from "@/contexts/AppStateContext";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { isSameMonth, parseISO } from 'date-fns';
import type { Invoice, LineItem } from '@/lib/types';

export default function SalesMetricsWidget() {
  const { invoices, logAction } = useAppState();
  const { toast } = useToast();

  const [monthlySales, setMonthlySales] = useState(0);
  const [grossIncomeThisMonth, setGrossIncomeThisMonth] = useState(0);
  const [trendingProduct, setTrendingProduct] = useState<{ name: string; quantity: number } | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  useEffect(() => {
    setIsLoadingMetrics(true);
    const currentDate = new Date();
    const currentMonthInvoices = invoices.filter(inv => inv.date && isSameMonth(parseISO(inv.date), currentDate));

    let totalSalesThisMonth = 0;
    currentMonthInvoices.forEach(inv => {
      totalSalesThisMonth += inv.grandTotal || 0;
    });
    setMonthlySales(totalSalesThisMonth);
    setGrossIncomeThisMonth(totalSalesThisMonth); // Assumption: Gross income for the month is total sales

    const productSales: Record<string, number> = {};
    currentMonthInvoices.forEach(inv => {
      (inv.lineItems || []).forEach(item => {
        productSales[item.itemName] = (productSales[item.itemName] || 0) + (item.quantity || 0);
      });
    });

    let topProduct: { name: string; quantity: number } | null = null;
    if (Object.keys(productSales).length > 0) {
      const sortedProducts = Object.entries(productSales).sort(([, qtyA], [, qtyB]) => qtyB - qtyA);
      if (sortedProducts.length > 0 && sortedProducts[0][1] > 0) {
        topProduct = { name: sortedProducts[0][0], quantity: sortedProducts[0][1] };
      }
    }
    setTrendingProduct(topProduct);
    setIsLoadingMetrics(false);
  }, [invoices]);

  const handleExport = () => {
    const dataForExport: (string | number)[][] = [];
    dataForExport.push(['Date', 'Product', 'Invoice Number', 'Quantity', 'Amount (Pre-tax)', 'CGST', 'SGST', 'Gross (Post-tax)']);

    invoices.forEach(invoice => {
      (invoice.lineItems || []).forEach(item => {
        const amount = (item.quantity || 0) * (item.price || 0);
        const cgstAmount = amount * ((item.cgstRate || 0) / 100);
        const sgstAmount = amount * ((item.sgstRate || 0) / 100);
        const gross = amount + cgstAmount + sgstAmount;
        dataForExport.push([
          invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A',
          item.itemName || 'N/A',
          invoice.invoiceNumber || 'N/A',
          item.quantity || 0,
          parseFloat(amount.toFixed(2)),
          parseFloat(cgstAmount.toFixed(2)),
          parseFloat(sgstAmount.toFixed(2)),
          parseFloat(gross.toFixed(2))
        ]);
      });
    });

    if (dataForExport.length <= 1) {
        toast({ title: "No Data to Export", description: "There is no item-wise sales data available to export.", variant: "default" });
        return;
    }

    try {
        const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ItemWiseSales');
        XLSX.writeFile(workbook, 'ItemWiseSalesExport.xlsx');
        logAction('Exported Item-wise Sales to Excel');
        toast({ title: 'Export Successful', description: 'Item-wise sales data has been downloaded.' });
    } catch (error) {
        console.error("Error exporting to Excel:", error);
        toast({ title: 'Export Failed', description: 'Could not generate the Excel file.', variant: 'destructive' });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl font-bold">Sales Metrics</CardTitle>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Item-wise Sales
            </Button>
        </div>
        <CardDescription>Overview of your sales performance for the current month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingMetrics ? (
            <div className="grid md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg bg-muted/50 animate-pulse">
                        <div className="h-6 w-1/2 bg-muted rounded mb-2"></div>
                        <div className="h-8 w-3/4 bg-muted rounded"></div>
                    </div>
                ))}
            </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg shadow-sm bg-card">
            <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
              <DollarSign className="mr-2 h-5 w-5" />
              Monthly Sales
            </div>
            <p className="text-2xl font-semibold">{formatCurrency(monthlySales)}</p>
          </div>
          <div className="p-4 border rounded-lg shadow-sm bg-card">
            <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
              <DollarSign className="mr-2 h-5 w-5" />
              Gross Income (This Month)
            </div>
            <p className="text-2xl font-semibold">{formatCurrency(grossIncomeThisMonth)}</p>
          </div>
          <div className="p-4 border rounded-lg shadow-sm bg-card">
            <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
              <PackageIcon className="mr-2 h-5 w-5" />
              Trending Product (This Month)
            </div>
            {trendingProduct ? (
              <p className="text-2xl font-semibold truncate" title={trendingProduct.name}>
                {trendingProduct.name} <span className="text-base text-muted-foreground">({trendingProduct.quantity} sold)</span>
              </p>
            ) : (
              <p className="text-2xl font-semibold text-muted-foreground">N/A</p>
            )}
          </div>
        </div>
        )}
      </CardContent>
      {invoices.length === 0 && !isLoadingMetrics && (
        <CardFooter>
            <p className="text-sm text-muted-foreground">No invoice data available to calculate metrics or export.</p>
        </CardFooter>
      )}
    </Card>
  );
}
