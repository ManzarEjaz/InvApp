
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
  invoiceHeaderColor: '#739EDC', 
  themeAccentColor: '#149E8E',
  invoiceNumberPrefix: 'INV', 
};

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [organizationDetails, setOrgDetailsStorage] = useLocalStorage<OrganizationDetails | null>(
    ORG_DETAILS_STORAGE_KEY,
    defaultOrgDetails
  );
  
  const [rawInventory, setInventoryStorage] = useLocalStorage<InventoryItem[]>(INVENTORY_STORAGE_KEY, []);
  const [invoices, setInvoicesStorage] = useLocalStorage<Invoice[]>(INVOICES_STORAGE_KEY, []);
  const [actionLog, setActionLogStorage] = useLocalStorage<ActionLogEntry[]>(ACTION_LOG_STORAGE_KEY, []);

  const inventory = React.useMemo(() => {
    return rawInventory.map(item => ({
      ...item,
      quantity: item.quantity ?? 0, 
    }));
  }, [rawInventory]);


  const setOrganizationDetails = (details: OrganizationDetails) => {
    const newDetails = {
      ...defaultOrgDetails, 
      ...organizationDetails, // Spread current state first to retain existing if not in `details`
      ...details,          
      invoiceNumberPrefix: (details.invoiceNumberPrefix || 'INV').toUpperCase(),
    };
    setOrgDetailsStorage(newDetails);
    logAction("Updated Organization Settings", newDetails);
  };
  
  useEffect(() => {
    // Ensure organizationDetails in storage is initialized with default prefix if it's missing
    if (organizationDetails && !organizationDetails.invoiceNumberPrefix) {
      setOrganizationDetails({ ...organizationDetails, invoiceNumberPrefix: 'INV' });
    }
    // If no org details at all, set with defaults (which includes prefix)
    if (!organizationDetails) {
        setOrgDetailsStorage(defaultOrgDetails);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationDetails]);


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
    const prefix = (organizationDetails?.invoiceNumberPrefix || 'INV').toUpperCase();
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    const currentPattern = `${prefix}-${year}-${month}-`;
    
    const relevantInvoices = invoices.filter(inv => 
      inv.invoiceNumber && inv.invoiceNumber.startsWith(currentPattern)
    );
    
    let maxSeq = 0;
    relevantInvoices.forEach(inv => {
      const parts = inv.invoiceNumber.split('-');
      if (parts.length === 4) {
        const seqStr = parts[3];
        if (seqStr && /^\d{5}$/.test(seqStr)) {
          const seqNum = parseInt(seqStr, 10);
          if (seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    });
    
    const nextSeq = (maxSeq + 1).toString().padStart(5, '0');
    return `${currentPattern}${nextSeq}`;
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
  
  useEffect(() => {
    if(actionLog.length === 0) { 
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
