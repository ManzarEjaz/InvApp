
"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { OrganizationDetails, InventoryItem, Invoice, ActionLogEntry } from '@/lib/types';
import { 
  ORG_DETAILS_STORAGE_KEY, 
  INVENTORY_STORAGE_KEY, 
  INVOICES_STORAGE_KEY,
  ACTION_LOG_STORAGE_KEY
} from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

interface AppStateContextType {
  organizationDetails: OrganizationDetails | null;
  setOrganizationDetails: (details: OrganizationDetails) => void;
  
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (itemId: string) => void;
  getInventoryItemById: (itemId: string) => InventoryItem | undefined;

  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'organizationDetails'> & { organizationDetails?: OrganizationDetails }) => Invoice;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (invoiceId: string) => void;
  getInvoiceById: (invoiceId: string) => Invoice | undefined;
  getNextInvoiceNumber: () => string;

  actionLog: ActionLogEntry[];
  logAction: (action: string, details?: Record<string, any>) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

const defaultOrgDetails: OrganizationDetails = {
  companyName: '',
  companyLogo: '',
  gstNumber: '',
  address: '',
  contactDetails: '',
  invoiceHeaderColor: '#739EDC', // Default to current primary color
  themeAccentColor: '#149E8E', // Default to current accent color (HSL 155 80% 40%)
};

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [organizationDetails, setOrgDetailsStorage] = useLocalStorage<OrganizationDetails | null>(
    ORG_DETAILS_STORAGE_KEY,
    defaultOrgDetails
  );
  
  const [rawInventory, setInventoryStorage] = useLocalStorage<InventoryItem[]>(INVENTORY_STORAGE_KEY, []);
  const [invoices, setInvoicesStorage] = useLocalStorage<Invoice[]>(INVOICES_STORAGE_KEY, []);
  const [actionLog, setActionLogStorage] = useLocalStorage<ActionLogEntry[]>(ACTION_LOG_STORAGE_KEY, []);

  // Ensure inventory items always have a quantity (for items loaded from older local storage)
  const inventory = React.useMemo(() => {
    return rawInventory.map(item => ({
      ...item,
      quantity: item.quantity ?? 0, // Default to 0 if quantity is undefined
    }));
  }, [rawInventory]);


  const setOrganizationDetails = (details: OrganizationDetails) => {
    setOrgDetailsStorage(prevDetails => ({
      ...defaultOrgDetails, // Ensure all fields from default are present
      ...prevDetails,      // Spread previous details
      ...details           // Override with new details
    }));
    logAction("Updated Organization Settings", details);
  };

  // Inventory Management
  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem = { ...item, id: uuidv4(), quantity: item.quantity ?? 0 };
    setInventoryStorage(prev => [...prev, newItem]);
    logAction("Added Inventory Item", { name: newItem.name, id: newItem.id });
  };

  const updateInventoryItem = (updatedItem: InventoryItem) => {
    const itemWithQuantity = { ...updatedItem, quantity: updatedItem.quantity ?? 0 };
    setInventoryStorage(prev => prev.map(item => item.id === itemWithQuantity.id ? itemWithQuantity : item));
    logAction("Updated Inventory Item", { name: itemWithQuantity.name, id: itemWithQuantity.id });
  };

  const deleteInventoryItem = (itemId: string) => {
    const itemToDelete = inventory.find(item => item.id === itemId);
    setInventoryStorage(prev => prev.filter(item => item.id !== itemId));
    if (itemToDelete) {
      logAction("Deleted Inventory Item", { name: itemToDelete.name, id: itemId });
    }
  };
  
  const getInventoryItemById = (itemId: string) => inventory.find(item => item.id === itemId);

  // Invoice Management
  const getNextInvoiceNumber = (): string => {
    const latestInvoiceNumber = invoices.reduce((max, inv) => {
        const numPart = parseInt(inv.invoiceNumber.replace(/[^0-9]/g, ''), 10);
        return numPart > max ? numPart : max;
    }, 0);
    return `INV-${(latestInvoiceNumber + 1).toString().padStart(4, '0')}`;
  };
  
  const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'organizationDetails'> & { organizationDetails?: OrganizationDetails }) => {
    const currentOrgDetails = organizationDetails || defaultOrgDetails;
    const newInvoice: Invoice = {
      ...invoiceData,
      id: uuidv4(),
      invoiceNumber: getNextInvoiceNumber(),
      organizationDetails: invoiceData.organizationDetails || currentOrgDetails,
    };
    setInvoicesStorage(prev => [...prev, newInvoice]);
    logAction("Created Invoice", { invoiceNumber: newInvoice.invoiceNumber, id: newInvoice.id });
    return newInvoice;
  };

  const updateInvoice = (updatedInvoice: Invoice) => {
    setInvoicesStorage(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    logAction("Updated Invoice", { invoiceNumber: updatedInvoice.invoiceNumber, id: updatedInvoice.id });
  };

  const deleteInvoice = (invoiceId: string) => {
    const invoiceToDelete = invoices.find(inv => inv.id === invoiceId);
    setInvoicesStorage(prev => prev.filter(inv => inv.id !== invoiceId));
    if (invoiceToDelete) {
      logAction("Deleted Invoice", { invoiceNumber: invoiceToDelete.invoiceNumber, id: invoiceId });
    }
  };

  const getInvoiceById = (invoiceId: string) => invoices.find(inv => inv.id === invoiceId);

  // Action Log Management
  const logAction = (action: string, details?: Record<string, any>) => {
    const newLogEntry: ActionLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action,
      details,
    };
    setActionLogStorage(prev => [newLogEntry, ...prev].slice(0, 100)); // Keep last 100 logs
  };
  
  // Initial log
  useEffect(() => {
    if(actionLog.length === 0) { // Prevent logging on every mount if logs exist
        logAction("Application Initialized / Loaded");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <AppStateContext.Provider value={{
      organizationDetails, setOrganizationDetails,
      inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, getInventoryItemById,
      invoices, addInvoice, updateInvoice, deleteInvoice, getInvoiceById, getNextInvoiceNumber,
      actionLog, logAction
    }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

