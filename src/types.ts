export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type Size = typeof SIZES[number];

export interface SizeStock {
  size: Size;
  stock: number;
}

// Master produk — tidak lagi menyimpan stok (stok dihitung dari restock entries)
export interface InventoryItem {
  sku: string;
  name: string;
  hpp: number;
  price: number;
}

// Setiap kali restock, tambah entry baru
export interface RestockItem {
  id: string;
  sku: string;
  date: string;         // tanggal masuk barang
  sizes: SizeStock[];   // stok per ukuran yang masuk
  note?: string;        // opsional: keterangan restock
}

export type SaleStatus = 'pending' | 'dp' | 'selesai';

export interface SaleItem {
  id: string;
  date: string;
  invoice: string;
  sku: string;
  qty: number;
  size: Size;
  status: SaleStatus;
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
  restocks: RestockItem[];
  sales: SaleItem[];
  expenses: ExpenseItem[];
}
