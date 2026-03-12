export interface InventoryItem {
  sku: string;
  name: string;
  hpp: number;
  price: number;
  stock: number;
}

export interface SaleItem {
  id: string;
  date: string;
  invoice: string;
  sku: string;
  qty: number;
}

export interface ExpenseItem {
  id: string;
  date: string;
  category: string;
  desc: string;
  amount: number;
}

export interface StoreData {
  inventory: InventoryItem[];
  sales: SaleItem[];
  expenses: ExpenseItem[];
}
