export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type Size = typeof SIZES[number];

export interface SizeStock {
  size: Size;
  stock: number;
}

export interface InventoryItem {
  sku: string;
  name: string;
  hpp: number;
  price: number;
  stock: number;       // total stok awal (sum of all sizes)
  sizes: SizeStock[];  // stok per ukuran
}

export interface SaleItem {
  id: string;
  date: string;
  invoice: string;
  sku: string;
  qty: number;
  size: Size; // ukuran yang terjual
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
