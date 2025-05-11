
"use client";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit3, Trash2, Search, Package } from "lucide-react";
import { useAppState } from "@/contexts/AppStateContext";
import type { InventoryItem as AppInventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const inventoryItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  price: z.number().min(0, "Price cannot be negative"), // Price before tax
  finalPrice: z.number().min(0, "Final price cannot be negative"), // Price after tax
  quantity: z.number().min(0, "Quantity cannot be negative").int("Quantity must be a whole number"),
  cgstRate: z.number().min(0).max(100).optional().default(0),
  sgstRate: z.number().min(0).max(100).optional().default(0),
  description: z.string().optional(),
});
type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

export default function InventoryPage() {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, logAction } = useAppState();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AppInventoryItem | null>(null);
  const [lastEditedField, setLastEditedField] = useState<'price' | 'finalPrice' | null>(null);
  const { toast } = useToast();

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    // Default values will be set in useEffect based on isFormOpen and editingItem
  });

  const { watch, setValue, getValues, reset } = form;

  const watchedPrice = watch('price');
  const watchedFinalPrice = watch('finalPrice');
  const watchedCgstRate = watch('cgstRate');
  const watchedSgstRate = watch('sgstRate');

  // Effect for initializing form when dialog opens or editingItem changes
  useEffect(() => {
    if (isFormOpen) {
      let defaultValues: InventoryItemFormValues;
      if (editingItem) {
        const p = editingItem.price;
        const cgst = editingItem.cgstRate || 0;
        const sgst = editingItem.sgstRate || 0;
        const totalTaxRate = (cgst / 100) + (sgst / 100);
        const calculatedFinalPrice = parseFloat((p * (1 + totalTaxRate)).toFixed(2));
        defaultValues = {
          name: editingItem.name,
          price: p,
          quantity: editingItem.quantity ?? 0,
          cgstRate: cgst,
          sgstRate: sgst,
          description: editingItem.description || '',
          finalPrice: calculatedFinalPrice,
        };
      } else {
        // Default for new item
        const initialPrice = 0;
        const initialCgst = 0;
        const initialSgst = 0;
        const initialFinalPrice = parseFloat((initialPrice * (1 + (initialCgst / 100) + (initialSgst / 100))).toFixed(2));
        defaultValues = {
          name: '',
          price: initialPrice,
          quantity: 0,
          cgstRate: initialCgst,
          sgstRate: initialSgst,
          description: '',
          finalPrice: initialFinalPrice,
        };
      }
      reset(defaultValues);
      setLastEditedField(null); 
    }
  }, [editingItem, reset, isFormOpen]);


  // Calculate finalPrice when price or tax rates change
  useEffect(() => {
    if (!isFormOpen || lastEditedField === 'finalPrice') return;

    const currentPrice = getValues('price');
    const currentCgst = getValues('cgstRate');
    const currentSgst = getValues('sgstRate');

    const p = typeof currentPrice === 'number' ? currentPrice : 0;
    const cgst = typeof currentCgst === 'number' ? currentCgst : 0;
    const sgst = typeof currentSgst === 'number' ? currentSgst : 0;

    const totalTaxRate = (cgst / 100) + (sgst / 100);
    const newFinalPrice = parseFloat((p * (1 + totalTaxRate)).toFixed(2));
    
    const currentFinalPriceValue = getValues('finalPrice');
    if (typeof currentFinalPriceValue !== 'number' || Math.abs(currentFinalPriceValue - newFinalPrice) > 0.001) {
      setValue('finalPrice', newFinalPrice, { shouldValidate: true });
    }
  }, [watchedPrice, watchedCgstRate, watchedSgstRate, setValue, getValues, lastEditedField, isFormOpen]);

  // Calculate price when finalPrice or tax rates change (and finalPrice was the last edited)
  useEffect(() => {
    if (!isFormOpen || lastEditedField !== 'finalPrice') return;

    const currentFinalPrice = getValues('finalPrice');
    const currentCgst = getValues('cgstRate');
    const currentSgst = getValues('sgstRate');
    
    const fp = typeof currentFinalPrice === 'number' ? currentFinalPrice : 0;
    const cgst = typeof currentCgst === 'number' ? currentCgst : 0;
    const sgst = typeof currentSgst === 'number' ? currentSgst : 0;

    const totalTaxRate = (cgst / 100) + (sgst / 100);
    let newPrice = 0;
    if (1 + totalTaxRate !== 0) {
      newPrice = parseFloat((fp / (1 + totalTaxRate)).toFixed(2));
    }
    
    const currentPriceValue = getValues('price');
    if (typeof currentPriceValue !== 'number' || Math.abs(currentPriceValue - newPrice) > 0.001) {
      setValue('price', newPrice, { shouldValidate: true });
    }
  }, [watchedFinalPrice, watchedCgstRate, watchedSgstRate, setValue, getValues, lastEditedField, isFormOpen]);


  const filteredInventory = inventory.map(item => ({
    ...item,
    quantity: item.quantity ?? 0, 
  })).filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFormSubmit: SubmitHandler<InventoryItemFormValues> = (data) => {
    // We store 'price' (before tax), 'finalPrice' is for form calculation only.
    const { finalPrice, ...itemDataToStore } = data; 

    if (editingItem) {
      updateInventoryItem({ ...editingItem, ...itemDataToStore });
      logAction(`Updated inventory item: ${itemDataToStore.name}`);
      toast({ title: "Item Updated", description: `${itemDataToStore.name} has been updated.` });
    } else {
      addInventoryItem(itemDataToStore);
      logAction(`Added inventory item: ${itemDataToStore.name}`);
      toast({ title: "Item Added", description: `${itemDataToStore.name} has been added to inventory.` });
    }
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (itemId: string, itemName: string) => {
    deleteInventoryItem(itemId);
    logAction(`Deleted inventory item: ${itemName}`);
    toast({ title: "Item Deleted", description: `${itemName} has been deleted.` });
  };

  const openEditForm = (item: AppInventoryItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };
  
  const openNewForm = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
         <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">Add, edit, and manage your products and services.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingItem(null); // Reset editing item when dialog closes
        }}>
          <DialogTrigger asChild>
            <Button onClick={openNewForm}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update the details of this inventory item." : "Fill in the details for the new inventory item."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl><Input placeholder="e.g., T-Shirt, Consultation" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Price (before tax)</FormLabel>
                        <FormControl><Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                            onChange={e => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                setLastEditedField('price');
                            }}
                            onFocus={() => setLastEditedField('price')}
                             />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="finalPrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Final Price (incl. tax)</FormLabel>
                        <FormControl><Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                            onChange={e => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                setLastEditedField('finalPrice');
                            }}
                            onFocus={() => setLastEditedField('finalPrice')}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantity in Stock</FormLabel>
                        <FormControl><Input 
                            type="number" 
                            step="1" 
                            placeholder="0" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="cgstRate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>CGST Rate (%)</FormLabel>
                        <FormControl><Input 
                            type="number" 
                            step="0.01" 
                            placeholder="e.g., 9" 
                            {...field} 
                            onChange={e => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                setLastEditedField(null); // Recalculate finalPrice from price
                            }}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="sgstRate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>SGST Rate (%)</FormLabel>
                        <FormControl><Input 
                            type="number" 
                            step="0.01" 
                            placeholder="e.g., 9" 
                            {...field} 
                            onChange={e => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                setLastEditedField(null); // Recalculate finalPrice from price
                            }}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     {/* Empty cell for layout consistency if needed */}
                 </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Input placeholder="Additional details about the item" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">{editingItem ? "Save Changes" : "Add Item"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Inventory List</CardTitle>
          <CardDescription>All your products and services.</CardDescription>
           <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search by item name..."
              className="pl-10 w-full sm:w-1/2 lg:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredInventory.length === 0 ? (
             <div className="text-center py-10">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-xl font-semibold">No Inventory Items</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? "No items match your search." : "Get started by adding an item to your inventory."}
              </p>
              {!searchTerm && (
                 <Button onClick={openNewForm} className="mt-4">
                    Add New Item
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price (before tax)</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>CGST %</TableHead>
                  <TableHead>SGST %</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.price.toFixed(2)}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.cgstRate !== undefined ? `${item.cgstRate.toFixed(2)}%` : 'N/A'}</TableCell>
                    <TableCell>{item.sgstRate !== undefined ? `${item.sgstRate.toFixed(2)}%` : 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{item.description || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(item)} title="Edit">
                        <Edit3 className="h-4 w-4" />
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
                                This action cannot be undone. This will permanently delete the item "{item.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id, item.name)} className="bg-destructive hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
         {filteredInventory.length > 0 && (
          <CardFooter className="text-sm text-muted-foreground">
            Showing {filteredInventory.length} of {inventory.length} items.
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

