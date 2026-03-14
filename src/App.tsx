<script src="http://localhost:8097"></script>;
import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useStoreData } from "./hooks/useStoreData";
import { useMetrics } from "./hooks/useMetrics";
import * as XLSX from "xlsx";
import AuthScreen from "./components/AuthScreen";
import Sidebar from "./components/Sidebar";
import DashboardTab from "./components/Dashboard";
import InventoryTab from "./components/InventoryTab";
import SalesTab from "./components/SalesTab";
import ExpensesTab from "./components/ExpensesTab";

import type { InventoryItem, RestockItem, SaleItem, SaleStatus, ExpenseItem } from "./types";
import { Toast, useToast } from "./components/Toast";

export default function App() {
  const { user, isInitializing } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeStore, setActiveStore] = useState("");
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { storeData, setStoreData, saveToCloud, isStoreLoading } = useStoreData(
    user,
    activeStore,
  );

  const metrics = useMetrics(storeData);
  const toast = useToast();

  // ==============================
  // EXPORT DATA
  // ==============================

  const handleExportData = () => {
    try {
    const [fy, fm] = filterMonth.split('-').map(Number);
    const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni',
      'Juli','Agustus','September','Oktober','November','Desember'];
    const bulanLabel = `${MONTH_NAMES[fm - 1]} ${fy}`;

    const rp = (num: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    const fmtDate = (d: string) => {
      const dt = new Date(d);
      return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`;
    };

    const STATUS_LABEL: Record<string, string> = {
      pending: 'Pending (PO)',
      dp: 'DP',
      selesai: 'Selesai',
    };

    const inFilterMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getFullYear() === fy && d.getMonth() + 1 === fm;
    };

    const salesThisMonth = storeData.sales.filter((s) => inFilterMonth(s.date));
    const expensesThisMonth = storeData.expenses.filter((e) => inFilterMonth(e.date));

    // ===== SHEET 1: PENJUALAN =====
    const salesSheet = [
      ...salesThisMonth.map((s) => {
        const invItem = storeData.inventory.find((i) => i.sku === s.sku);
        const total = invItem ? invItem.price * s.qty : 0;
        const status = s.status || 'selesai';
        const dp = status === 'dp' ? (s.dpAmount || 0) : status === 'selesai' ? total : 0;
        const sisa = status === 'selesai' ? 0 : status === 'pending' ? total : total - dp;
        return {
          Tanggal: fmtDate(s.date),
          'No. Invoice': s.invoice || '-',
          'Nama Produk': invItem?.name || s.sku,
          SKU: s.sku,
          Ukuran: s.size || '-',
          Qty: s.qty,
          'Harga Satuan': rp(invItem?.price || 0),
          'Total Harga': rp(total),
          Status: STATUS_LABEL[status] || status,
          'DP Masuk': dp > 0 ? rp(dp) : '-',
          'Sisa Tagihan': sisa > 0 ? rp(sisa) : '-',
        };
      }),
      {},
      {
        Tanggal: 'TOTAL',
        'No. Invoice': '',
        'Nama Produk': '',
        SKU: '',
        Ukuran: '',
        Qty: salesThisMonth.reduce((s, x) => s + x.qty, 0),
        'Harga Satuan': '',
        'Total Harga': rp(salesThisMonth.reduce((sum, s) => {
          const inv = storeData.inventory.find(i => i.sku === s.sku);
          return sum + (inv ? inv.price * s.qty : 0);
        }, 0)),
        Status: '',
        'DP Masuk': rp(salesThisMonth.filter(s => s.status === 'dp').reduce((sum, s) => sum + (s.dpAmount || 0), 0)),
        'Sisa Tagihan': '',
      },
    ];

    // ===== SHEET 2: RINGKASAN STOK =====
    const inventorySheet = [
      ...storeData.inventory.flatMap((i) => {
        const stockData = metrics.stockMap[i.sku];
        const restockedBySize = stockData?.restockedBySize || {};
        const soldBySize = stockData?.soldBySize || {};
        const sizes = Object.keys(restockedBySize);

        if (sizes.length === 0) {
          return [{
            SKU: i.sku,
            'Nama Produk': i.name,
            Ukuran: '-',
            'HPP (Modal)': rp(i.hpp),
            'Harga Jual': rp(i.price),
            'Total Masuk': 0,
            Terjual: 0,
            'Sisa Stok': 0,
            'Nilai Sisa (HPP)': rp(0),
          }];
        }

        return sizes.map(size => {
          const restocked = restockedBySize[size] || 0;
          const sold = soldBySize[size] || 0;
          const sisa = restocked - sold;
          return {
            SKU: i.sku,
            'Nama Produk': i.name,
            Ukuran: size,
            'HPP (Modal)': rp(i.hpp),
            'Harga Jual': rp(i.price),
            'Total Masuk': restocked,
            Terjual: sold,
            'Sisa Stok': sisa,
            'Nilai Sisa (HPP)': rp(sisa * i.hpp),
          };
        });
      }),
    ];

    // ===== SHEET 3: BARANG MASUK =====
    const restocksThisMonth = (storeData.restocks || []).filter((r) => inFilterMonth(r.date));
    const restockSheet = restocksThisMonth.length > 0
      ? [
          ...restocksThisMonth.flatMap((r) => {
            const invItem = storeData.inventory.find((i) => i.sku === r.sku);
            return r.sizes
              .filter((s) => s.stock > 0)
              .map((s) => ({
                'Tanggal Masuk': fmtDate(r.date),
                SKU: r.sku,
                'Nama Produk': invItem?.name || '-',
                Ukuran: s.size,
                'Qty Masuk': s.stock,
                'HPP (Modal)': rp(invItem?.hpp || 0),
                'Nilai Masuk': rp(s.stock * (invItem?.hpp || 0)),
                Keterangan: r.note || '-',
              }));
          }),
          {},
          {
            'Tanggal Masuk': 'TOTAL',
            SKU: '',
            'Nama Produk': '',
            Ukuran: '',
            'Qty Masuk': restocksThisMonth.flatMap(r => r.sizes).reduce((sum, s) => sum + s.stock, 0),
            'HPP (Modal)': '',
            'Nilai Masuk': rp(restocksThisMonth.flatMap(r => {
              const inv = storeData.inventory.find(i => i.sku === r.sku);
              return r.sizes.map(s => s.stock * (inv?.hpp || 0));
            }).reduce((a, b) => a + b, 0)),
            Keterangan: '',
          },
        ]
      : [{ Info: `Tidak ada barang masuk di bulan ${bulanLabel}` }];

    // ===== SHEET 4: PENGELUARAN =====
    const expenseSheet = [
      ...expensesThisMonth.map((e) => ({
        Tanggal: fmtDate(e.date),
        Kategori: e.category,
        Deskripsi: e.desc,
        Nominal: rp(e.amount),
      })),
      {},
      {
        Tanggal: 'TOTAL',
        Kategori: '',
        Deskripsi: '',
        Nominal: rp(expensesThisMonth.reduce((sum, e) => sum + e.amount, 0)),
      },
    ];

    // ===== SHEET 5: LABA RUGI =====
    const profitSheet = [
      { Keterangan: 'PENDAPATAN', Nominal: '' },
      { Keterangan: 'Total Omzet (semua order)', Nominal: rp(metrics.totalRevenue) },
      { Keterangan: '', Nominal: '' },
      { Keterangan: 'BEBAN POKOK PENJUALAN', Nominal: '' },
      { Keterangan: 'Total HPP Terjual', Nominal: rp(metrics.totalHppSold) },
      { Keterangan: '', Nominal: '' },
      { Keterangan: 'Laba Kotor', Nominal: rp(metrics.grossProfit) },
      { Keterangan: '', Nominal: '' },
      { Keterangan: 'BEBAN OPERASIONAL', Nominal: '' },
      { Keterangan: 'Total Pengeluaran', Nominal: rp(metrics.totalExpenses) },
      { Keterangan: '', Nominal: '' },
      { Keterangan: 'LABA BERSIH', Nominal: rp(metrics.netProfit) },
    ];

    // Helper: buat sheet dengan judul di baris 1, lalu header + data mulai baris 3
    const makeSheet = (title: string, rows: Record<string, any>[]) => {
      if (rows.length === 0) rows = [{}];
      const ws = XLSX.utils.json_to_sheet([{}], { skipHeader: true }); // baris 1: judul
      XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' });
      XLSX.utils.sheet_add_json(ws, rows, { origin: 'A3' });           // baris 3: header + data
      return ws;
    };

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, makeSheet(`LAPORAN PENJUALAN — ${bulanLabel}`, salesSheet), "Penjualan");
    XLSX.utils.book_append_sheet(workbook, makeSheet('RINGKASAN STOK BARANG (Akumulatif)', inventorySheet), "Stok Barang");
    XLSX.utils.book_append_sheet(workbook, makeSheet(`BARANG MASUK — ${bulanLabel}`, restockSheet.length > 0 ? restockSheet : [{ Info: `Tidak ada barang masuk di bulan ${bulanLabel}` }]), "Barang Masuk");
    XLSX.utils.book_append_sheet(workbook, makeSheet(`LAPORAN PENGELUARAN — ${bulanLabel}`, expenseSheet), "Pengeluaran");
    XLSX.utils.book_append_sheet(workbook, makeSheet(`LAPORAN LABA RUGI — ${bulanLabel}`, profitSheet), "Laba Rugi");

    XLSX.writeFile(workbook, `laporan-${bulanLabel.replace(' ', '-').toLowerCase()}.xlsx`);
    toast.success(`Laporan ${bulanLabel} berhasil diexport ke Excel.`);
    } catch {
      toast.error('Gagal mengekspor laporan. Coba lagi.');
    }
  };

  const [newExp, setNewExp] = useState({
    date: "",
    category: "",
    desc: "",
    amount: "",
  });

  // ==============================
  // LOAD STORE
  // ==============================

  useEffect(() => {
    const savedStore = localStorage.getItem("merchantOsStoreCode");

    if (savedStore && user) {
      setActiveStore(savedStore);
    }
  }, [user]);

  // ==============================
  // LOGOUT STORE
  // ==============================

  const handleLogoutStore = () => {
    setActiveStore("");
    localStorage.removeItem("merchantOsStoreCode");

    setStoreData({
      inventory: [],
      restocks: [],
      sales: [],
      expenses: [],
    });
  };

  // ==============================
  // INVENTORY
  // ==============================

  const handleAddInventory = (item: InventoryItem) => {
    const updatedInv = [...(storeData.inventory || []), item];
    const newData = { ...storeData, inventory: updatedInv };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Produk berhasil ditambahkan ke database.'))
      .catch(() => toast.error('Gagal menyimpan produk. Periksa koneksi internet kamu.'));
  };

  const handleDeleteInventory = (sku: string) => {
    const updatedInv = storeData.inventory.filter((i) => i.sku !== sku);
    const newData = { ...storeData, inventory: updatedInv };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Produk berhasil dihapus.'))
      .catch(() => toast.error('Gagal menghapus produk. Coba lagi.'));
  };

  const handleUpdateInventory = (oldSku: string, item: InventoryItem) => {
    const updatedInv = storeData.inventory.map((i) =>
      i.sku === oldSku ? item : i
    );
    const newData = { ...storeData, inventory: updatedInv };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Data produk berhasil diperbarui.'))
      .catch(() => toast.error('Gagal memperbarui produk. Periksa koneksi internet kamu.'));
  };

  const handleAddRestock = (restock: Omit<RestockItem, "id">) => {
    const newRestock: RestockItem = {
      id: Date.now().toString(),
      ...restock,
    };
    const updatedRestocks = [newRestock, ...(storeData.restocks || [])];
    const newData = { ...storeData, restocks: updatedRestocks };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Restock berhasil dicatat.'))
      .catch(() => toast.error('Gagal menyimpan restock. Coba lagi.'));
  };

  const handleDeleteRestock = (id: string) => {
    const updatedRestocks = (storeData.restocks || []).filter((r) => r.id !== id);
    const newData = { ...storeData, restocks: updatedRestocks };
    setStoreData(newData);
    saveToCloud(newData);
  };

  // ==============================
  // SALES
  // ==============================

  const handleAddSale = (sale: Omit<SaleItem, "id">) => {
    const newSale: SaleItem = {
      id: Date.now().toString(),
      date: sale.date,
      invoice: sale.invoice,
      sku: sale.sku,
      qty: Number(sale.qty),
      size: sale.size,
      status: sale.status || 'selesai',
      dpAmount: sale.status === 'dp' ? sale.dpAmount : undefined,
    };

    const updatedSales = [newSale, ...(storeData.sales || [])];
    const newData = { ...storeData, sales: updatedSales };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Penjualan berhasil dicatat.'))
      .catch(() => toast.error('Gagal menyimpan penjualan. Periksa koneksi internet kamu.'));
  };

  const handleDeleteSale = (id: string) => {
    const updatedSales = storeData.sales.filter((s) => s.id !== id);
    const newData = { ...storeData, sales: updatedSales };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Data penjualan berhasil dihapus.'))
      .catch(() => toast.error('Gagal menghapus penjualan. Coba lagi.'));
  };

  const handleUpdateSaleStatus = (id: string, status: SaleStatus, dpAmount?: number) => {
    const updatedSales = storeData.sales.map((s) =>
      s.id === id ? { ...s, status, dpAmount: status === 'dp' ? dpAmount : undefined } : s
    );
    const newData = { ...storeData, sales: updatedSales };
    setStoreData(newData);
    saveToCloud(newData);
  };

  // ==============================
  // EXPENSE
  // ==============================

  const handleAddExpense = (expense: Omit<ExpenseItem, "id">) => {
    const exp: ExpenseItem = {
      id: Date.now().toString(),
      date: expense.date,
      category: expense.category,
      desc: expense.desc,
      amount: Number(expense.amount),
    };

    const updatedExpenses = [exp, ...(storeData.expenses || [])];
    const newData = { ...storeData, expenses: updatedExpenses };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Pengeluaran berhasil dicatat.'))
      .catch(() => toast.error('Gagal menyimpan pengeluaran. Periksa koneksi internet kamu.'));

    setNewExp({ ...newExp, desc: "", amount: "" });
  };

  const handleDeleteExpense = (id: string) => {
    const updatedExpenses = storeData.expenses.filter((exp) => exp.id !== id);
    const newData = { ...storeData, expenses: updatedExpenses };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Pengeluaran berhasil dihapus.'))
      .catch(() => toast.error('Gagal menghapus pengeluaran. Coba lagi.'));
  };

  // ==============================
  // LOADING
  // ==============================

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Menghubungkan ke server...
      </div>
    );
  }

  if (!activeStore) {
    return <AuthScreen setActiveStore={setActiveStore} />;
  }

  // ==============================
  // UI
  // ==============================

  if (isStoreLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Memuat data toko...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeStore={activeStore}
        handleLogoutStore={handleLogoutStore}
      />

      {/*
        pt-14  = ruang untuk mobile top bar (fixed, ~56px)
        pb-16  = ruang untuk mobile bottom nav (fixed, ~64px)
        md:pt-0 md:pb-0 = reset di desktop karena sidebar di sisi, bukan fixed top/bottom
      */}
      <main className="flex-1 p-4 md:p-6 pt-14 pb-20 md:pt-6 md:pb-6 overflow-x-hidden">
        {activeTab === "dashboard" && (
          <DashboardTab
            handleExportData={handleExportData}
            metrics={metrics}
            storeData={storeData}
            filterMonth={filterMonth}
            onFilterMonthChange={setFilterMonth}
          />
        )}

        {activeTab === "stok" && (
          <InventoryTab
            metrics={metrics}
            storeData={storeData}
            filterMonth={filterMonth}
            onFilterMonthChange={setFilterMonth}
            onAddInventory={handleAddInventory}
            onDeleteInventory={handleDeleteInventory}
            onUpdateInventory={handleUpdateInventory}
            onAddRestock={handleAddRestock}
            onDeleteRestock={handleDeleteRestock}
          />
        )}

        {activeTab === "penjualan" && (
          <SalesTab
            storeData={storeData}
            metrics={metrics}
            filterMonth={filterMonth}
            onFilterMonthChange={setFilterMonth}
            onAddSale={handleAddSale}
            onDeleteSale={handleDeleteSale}
            onUpdateSaleStatus={handleUpdateSaleStatus}
          />
        )}

        {activeTab === "pengeluaran" && (
          <ExpensesTab
            storeData={storeData}
            filterMonth={filterMonth}
            onFilterMonthChange={setFilterMonth}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}
      </main>
      <Toast toasts={toast.toasts} onRemove={toast.remove} />
    </div>
  );
}
