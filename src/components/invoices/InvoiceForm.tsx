"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, PlusCircle, Trash2, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAppState } from '@/contexts/AppStateContext';
import type { Invoice, LineItem, InventoryItem as AppInventoryItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const lineItemSchema = z.object({
  id: z.string().optional(),
  inventoryItemId: z.string().optional(),
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price cannot be negative"),
  cgstRate: z.number().min(0).max(100).optional().default(0),
  sgstRate: z.number().min(0).max(100).optional().default(0),
});

const invoiceSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerAddress: z.string().optional(),
  date: z.date({ required_error: "Invoice date is required." }),
  status: z.enum(['draft', 'sent', 'paid', 'void']).default('draft'),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  discountAmount: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  existingInvoice?: Invoice;
}

export default function InvoiceForm({ existingInvoice }: InvoiceFormProps) {
  const { 
    addInvoice, 
    updateInvoice, 
    inventory, 
    getInventoryItemById, 
    logAction, 
    organizationDetails 
  } = useAppState();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInventoryPopover, setShowInventoryPopover] = useState(false);
  const [activeLineItemIndex, setActiveLineItemIndex] = useState<number | null>(null);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: existingInvoice 
      ? {
          ...existingInvoice,
          date: new Date(existingInvoice.date),
          lineItems: existingInvoice.lineItems.map(li => {
            const inventoryItem = getInventoryItemById(li.inventoryItemId || '');
            return {
              ...li,
              id: li.id || Math.random().toString(36).substr(2, 9),
              cgstRate: li.cgstRate ?? inventoryItem?.cgstRate ?? (organizationDetails?.gstNumber ? 9 : 0),
              sgstRate: li.sgstRate ?? inventoryItem?.sgstRate ?? (organizationDetails?.gstNumber ? 9 : 0),
            };
          }),
        }
      : {
          customerName: '',
          customerAddress: '',
          date: new Date(),
          status: 'draft',
          lineItems: [{ itemName: '', quantity: 1, price: 0, cgstRate: organizationDetails?.gstNumber ? 9 : 0, sgstRate: organizationDetails?.gstNumber ? 9 : 0 }],
          discountAmount: 0,
          notes: '',
        },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  useEffect(() => {
    fields.forEach((field, index) => {
      const currentLineItem = form.getValues(`lineItems.${index}`);
      if (!currentLineItem.id) { // New item likely added via append
        const inventoryItem = currentLineItem.inventoryItemId ? getInventoryItemById(currentLineItem.inventoryItemId) : null;
        form.setValue(`lineItems.${index}.cgstRate`, inventoryItem?.cgstRate ?? (organizationDetails?.gstNumber ? 9 : 0), { shouldValidate: true });
        form.setValue(`lineItems.${index}.sgstRate`, inventoryItem?.sgstRate ?? (organizationDetails?.gstNumber ? 9 : 0), { shouldValidate: true });
      }
    });
  }, [fields, organizationDetails, form, getInventoryItemById]);


  const calculateTotals = (lineItems: LineItem[], discount: number = 0) => {
    let subTotal = 0;
    let totalTax = 0;
    lineItems.forEach(item => {
      const itemTotal = item.quantity * item.price;
      subTotal += itemTotal;
      const cgst = itemTotal * ((item.cgstRate || 0) / 100);
      const sgst = itemTotal * ((item.sgstRate || 0) / 100);
      totalTax += cgst + sgst;
    });
    const grandTotal = subTotal + totalTax - discount;
    return { subTotal, totalTax, grandTotal };
  };

  const watchedLineItems = form.watch('lineItems');
  const watchedDiscount = form.watch('discountAmount') || 0;
  const totals = calculateTotals(watchedLineItems, watchedDiscount);

  const onSubmit: SubmitHandler<InvoiceFormValues> = async (data) => {
    setIsSubmitting(true);
    const invoiceData = {
      ...data,
      date: data.date.toISOString(),
      ...totals,
    };

    try {
      if (existingInvoice) {
        updateInvoice({ ...existingInvoice, ...invoiceData });
        logAction("Updated Invoice", { invoiceNumber: existingInvoice.invoiceNumber });
        toast({ title: "Invoice Updated", description: `Invoice #${existingInvoice.invoiceNumber} has been updated successfully.` });
        router.push(`/invoices/${existingInvoice.id}/preview`);
      } else {
        const newInvoice = addInvoice(invoiceData);
        logAction("Created Invoice", { invoiceNumber: newInvoice.invoiceNumber });
        toast({ title: "Invoice Created", description: `Invoice #${newInvoice.invoiceNumber} has been created successfully.` });
        router.push(`/invoices/${newInvoice.id}/preview`);
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({ title: "Error", description: "Failed to save invoice. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSelectInventoryItem = (item: AppInventoryItem, index: number) => {
    update(index, {
        ...fields[index],
        inventoryItemId: item.id,
        itemName: item.name,
        price: item.price,
        cgstRate: item.cgstRate ?? (organizationDetails?.gstNumber ? 9 : 0), 
        sgstRate: item.sgstRate ?? (organizationDetails?.gstNumber ? 9 : 0), 
    });
    setShowInventoryPopover(false);
    setSearchTerm('');
    setActiveLineItemIndex(null);
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="customerAddress"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Customer Address</FormLabel>
                <FormControl><Textarea placeholder="123 Main St, Anytown, USA" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="void">Void</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
            <CardDescription>Add products or services to this invoice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,5fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 p-3 border rounded-md items-end relative">
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.itemName`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      {index === 0 && <FormLabel>Item Name</FormLabel>}
                       <Popover open={activeLineItemIndex === index && showInventoryPopover} onOpenChange={(open) => {
                         if (!open) {
                            setActiveLineItemIndex(null);
                            setShowInventoryPopover(false);
                         }
                       }}>
                        <PopoverTrigger asChild
                            onClick={() => {
                                setActiveLineItemIndex(index);
                                setShowInventoryPopover(true);
                            }}
                        >
                            <div className="relative">
                                <Input placeholder="Product or Service" {...itemField} />
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" side="bottom" align="start">
                            <div className="p-2 border-b">
                                <Input 
                                    placeholder="Search inventory..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                            {filteredInventory.length > 0 ? (
                                filteredInventory.map(invItem => (
                                <div 
                                    key={invItem.id} 
                                    className="p-2 hover:bg-accent cursor-pointer"
                                    onClick={() => handleSelectInventoryItem(invItem, index)}
                                >
                                    <p className="font-medium">{invItem.name}</p>
                                    <p className="text-sm text-muted-foreground">{invItem.price?.toFixed(2) ?? '0.00'}</p>
                                </div>
                                ))
                            ) : (
                                <p className="p-4 text-sm text-center text-muted-foreground">No items match your search.</p>
                            )}
                            </div>
                        </PopoverContent>
                        </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.quantity`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      {index === 0 && <FormLabel>Qty</FormLabel>}
                      <Input type="number" placeholder="1" {...itemField} onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)} className="w-full min-w-[70px]" /> {/* Increased min-width for Qty */}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.price`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      {index === 0 && <FormLabel>Price</FormLabel>}
                      <Input type="number" step="0.01" placeholder="0.00" {...itemField} onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.cgstRate`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      {index === 0 && <FormLabel className="text-xs">CGST%</FormLabel>} {/* Shorter Label, smaller text */}
                      <Input type="number" step="0.01" placeholder="0" {...itemField} onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)} className="min-w-[50px]" /> {/* Reduced min-width */}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name={`lineItems.${index}.sgstRate`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      {index === 0 && <FormLabel className="text-xs">SGST%</FormLabel>} {/* Shorter Label, smaller text */}
                      <Input type="number" step="0.01" placeholder="0" {...itemField} onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)} className="min-w-[50px]" /> {/* Reduced min-width */}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive self-end mb-1">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ 
                  itemName: '', 
                  quantity: 1, 
                  price: 0, 
                  cgstRate: organizationDetails?.gstNumber ? 9 : 0, 
                  sgstRate: organizationDetails?.gstNumber ? 9 : 0 
              })}
              className="mt-2"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Notes / Terms</FormLabel>
                <FormControl><Textarea placeholder="Payment due within 30 days..." {...field} rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            <div className="space-y-2 rounded-md border p-4 md:col-span-1">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{totals.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tax:</span>
                    <span>{totals.totalTax.toFixed(2)}</span>
                </div>
                 <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                        <FormItem className="flex justify-between items-center">
                        <FormLabel className="text-muted-foreground mb-0">Discount:</FormLabel>
                        <FormControl>
                            <Input 
                            type="number" 
                            step="0.01" 
                            className="w-24 h-8 text-right" 
                            placeholder="0.00" 
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <hr className="my-2"/>
                <div className="flex justify-between font-semibold text-lg">
                    <span>Grand Total:</span>
                    <span>{totals.grandTotal.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingInvoice ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

