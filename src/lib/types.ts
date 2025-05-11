export interface User {
  pinSetup: boolean;
}

export interface OrganizationDetails {
  companyName: string;
  companyLogo?: string; // URL or base64 string
  gstNumber: string;
  address: string;
  contactDetails: string; // Could be more structured: phone, email
}

export interface InventoryItem {
  id: string;
  name: string;
  price: number; // Price before tax
  quantity: number; // Quantity in stock
  // Default taxes, can be overridden at invoice line item level
  cgstRate?: number; // Percentage, e.g., 9 for 9%
  sgstRate?: number; // Percentage, e.g., 9 for 9%
  description?: string;
}

export interface LineItem {
  id: string;
  inventoryItemId?: string; // Link to inventory item
  itemName: string;
  quantity: number;
  price: number; // Unit price, can be from inventory or custom
  cgstRate: number; // Percentage
  sgstRate: number; // Percentage
  discount?: number; // Discount per item or overall? Let's assume overall for now.
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string; // ISO date string
  customerName: string;
  customerAddress?: string;
  lineItems: LineItem[];
  subTotal: number;
  totalTax: number;
  discountAmount: number; // Overall discount amount
  grandTotal: number;
  // Organization details at the time of invoice creation
  organizationDetails: OrganizationDetails; 
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
}

export interface ActionLogEntry {
  id: string;
  timestamp: string; // ISO date string
  action: string; // e.g., "Logged in", "Created invoice #123", "Updated inventory item X"
  details?: Record<string, any>;
}

// For local storage structure
export interface AppData {
  pin?: string;
  organizationDetails?: OrganizationDetails;
  inventory: InventoryItem[];
  invoices: Invoice[];
  actionLog: ActionLogEntry[];
}


