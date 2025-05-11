
"use client";
import React, { useState } from 'react';
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
  price: z.number().min(0, "Price cannot be negative"),
  quantity: z.number().min(0, "Quantity cannot be negative").int("Quantity must be a whole number"),
  cgstRate: z.number().min(0).max(100).optional(),
  sgstRate: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
});
type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

export default function InventoryPage() {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, logAction } = useAppState();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AppInventoryItem | null>(null);
  const { toast } = useToast();

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
  });

  React.useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name,
        price: editingItem.price,
        quantity: editingItem.quantity,
        cgstRate: editingItem.cgstRate,
        sgstRate: editingItem.sgstRate,
        description: editingItem.description,
      });
    } else {
      form.reset({ name: '', price: 0, quantity: 0, cgstRate: 0, sgstRate: 0, description: '' });
    }
  }, [editingItem, form, isFormOpen]);

  const filteredInventory = inventory.map(item => ({
    ...item,
    quantity: item.quantity ?? 0, // Ensure quantity is not undefined for display
  })).filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFormSubmit: SubmitHandler<InventoryItemFormValues> = (data) => {
    if (editingItem) {
      updateInventoryItem({ ...editingItem, ...data });
      logAction(`Updated inventory item: ${data.name}`);
      toast({ title: "Item Updated", description: `${data.name} has been updated.` });
    } else {
      addInventoryItem(data);
      logAction(`Added inventory item: ${data.name}`);
      toast({ title: "Item Added", description: `${data.name} has been added to inventory.` });
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
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
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
                        <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantity in Stock</FormLabel>
                        <FormControl><Input type="number" step="1" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="cgstRate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>CGST Rate (%)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 9" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="sgstRate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>SGST Rate (%)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 9" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
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
                  <TableHead>Price</TableHead>
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
