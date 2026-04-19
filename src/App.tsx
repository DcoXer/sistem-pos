import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
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
import ClosingTab from "./components/ClosingTab";
import FnbInventoryTab from "./components/FnbInventoryTab";
import FnbSalesTab from "./components/FnbSalesTab";
import BackupRestoreModal from "./components/BackupRestoreModal";

import type { InventoryItem, RestockItem, SaleItem, SaleStatus, ExpenseItem, FnbSaleItem, StoreData } from "./types";
import { Toast, useToast } from "./components/Toast";
import ConfirmDialog, { useConfirm } from "./components/ConfirmDialog";

export default function App() {
  const { user, isInitializing } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeStore, setActiveStore] = useState("");
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { storeData, setStoreData, saveToCloud, isStoreLoading } = useStoreData(user, activeStore);
  const metrics = useMetrics(storeData);
  const toast = useToast();
  const { confirmState, confirm, cancelConfirm } = useConfirm();

  // ==============================
  // RESTORE FROM BACKUP
  // ==============================

  const handleRestore = async (data: StoreData) => {
    const docRef = doc(db, 'stores', activeStore);
    await updateDoc(docRef, {
      inventory: data.inventory || [],
      restocks: data.restocks || [],
      sales: data.sales || [],
      fnbSales: data.fnbSales || [],
      expenses: data.expenses || [],
    });
    toast.success('Data berhasil direstore dari backup.');
  };

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
        pending: 'Pending (PO)', dp: 'DP', selesai: 'Selesai',
      };

      const inFilterMonth = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.getFullYear() === fy && d.getMonth() + 1 === fm;
      };

      const isFnb = storeData.storeType === 'fnb';
      const salesThisMonth = storeData.sales.filter((s) => inFilterMonth(s.date));
      const fnbSalesThisMonth = (storeData.fnbSales || []).filter((s) => inFilterMonth(s.date));
      const expensesThisMonth = storeData.expenses.filter((e) => inFilterMonth(e.date));

      const salesSheet = isFnb
        ? [
            ...fnbSalesThisMonth.flatMap((s) =>
              s.items.map((si) => {
                const invItem = storeData.inventory.find((i) => i.sku === si.sku);
                return {
                  Tanggal: fmtDate(s.date),
                  'Nama Produk': invItem?.name || si.sku,
                  SKU: si.sku,
                  Qty: si.qty,
                  'Harga Satuan': rp(invItem?.price || 0),
                  'Subtotal': rp((invItem?.price || 0) * si.qty),
                };
              })
            ),
            {},
            {
              Tanggal: 'TOTAL', 'Nama Produk': '', SKU: '',
              Qty: fnbSalesThisMonth.flatMap(s => s.items).reduce((sum, si) => sum + si.qty, 0),
              'Harga Satuan': '',
              'Subtotal': rp(fnbSalesThisMonth.reduce((sum, s) => sum + s.total, 0)),
            },
          ]
        : [
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
                SKU: s.sku, Ukuran: s.size || '-', Qty: s.qty,
                'Harga Satuan': rp(invItem?.price || 0),
                'Total Harga': rp(total),
                Status: STATUS_LABEL[status] || status,
                'DP Masuk': dp > 0 ? rp(dp) : '-',
                'Sisa Tagihan': sisa > 0 ? rp(sisa) : '-',
              };
            }),
            {},
            {
              Tanggal: 'TOTAL', 'No. Invoice': '', 'Nama Produk': '', SKU: '', Ukuran: '',
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

      const inventorySheet = storeData.inventory.flatMap((i) => {
        const stockData = metrics.stockMap[i.sku];
        const restockedBySize = stockData?.restockedBySize || {};
        const soldBySize = stockData?.soldBySize || {};
        const sizes = Object.keys(restockedBySize);
        if (sizes.length === 0) {
          return [{ SKU: i.sku, 'Nama Produk': i.name, Ukuran: '-', 'HPP (Modal)': rp(i.hpp), 'Harga Jual': rp(i.price), 'Total Masuk': 0, Terjual: 0, 'Sisa Stok': 0, 'Nilai Sisa (HPP)': rp(0) }];
        }
        return sizes.map(size => {
          const restocked = restockedBySize[size] || 0;
          const sold = soldBySize[size] || 0;
          const sisa = restocked - sold;
          return { SKU: i.sku, 'Nama Produk': i.name, Ukuran: size, 'HPP (Modal)': rp(i.hpp), 'Harga Jual': rp(i.price), 'Total Masuk': restocked, Terjual: sold, 'Sisa Stok': sisa, 'Nilai Sisa (HPP)': rp(sisa * i.hpp) };
        });
      });

      const restocksThisMonth = (storeData.restocks || []).filter((r) => inFilterMonth(r.date));
      const restockSheet = restocksThisMonth.length > 0
        ? [
            ...restocksThisMonth.flatMap((r) => {
              const invItem = storeData.inventory.find((i) => i.sku === r.sku);
              return r.sizes.filter((s) => s.stock > 0).map((s) => ({
                'Tanggal Masuk': fmtDate(r.date), SKU: r.sku,
                'Nama Produk': invItem?.name || '-', Ukuran: s.size,
                'Qty Masuk': s.stock, 'HPP (Modal)': rp(invItem?.hpp || 0),
                'Nilai Masuk': rp(s.stock * (invItem?.hpp || 0)), Keterangan: r.note || '-',
              }));
            }),
            {},
            {
              'Tanggal Masuk': 'TOTAL', SKU: '', 'Nama Produk': '', Ukuran: '',
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

      const expenseSheet = [
        ...expensesThisMonth.map((e) => ({
          Tanggal: fmtDate(e.date), Kategori: e.category, Deskripsi: e.desc, Nominal: rp(e.amount),
        })),
        {},
        { Tanggal: 'TOTAL', Kategori: '', Deskripsi: '', Nominal: rp(expensesThisMonth.reduce((sum, e) => sum + e.amount, 0)) },
      ];

      const revenueMonth = isFnb
        ? fnbSalesThisMonth.reduce((sum, s) => sum + s.total, 0)
        : salesThisMonth.reduce((sum, s) => { const inv = storeData.inventory.find(i => i.sku === s.sku); return sum + (inv ? inv.price * s.qty : 0); }, 0);
      const hppMonth = isFnb
        ? fnbSalesThisMonth.flatMap(s => s.items).reduce((sum, si) => { const inv = storeData.inventory.find(i => i.sku === si.sku); return sum + (inv ? inv.hpp * si.qty : 0); }, 0)
        : salesThisMonth.reduce((sum, s) => { const inv = storeData.inventory.find(i => i.sku === s.sku); return sum + (inv ? inv.hpp * s.qty : 0); }, 0);
      const expenseMonth = expensesThisMonth.reduce((sum, e) => sum + e.amount, 0);
      const grossMonth = revenueMonth - hppMonth;
      const netMonth = grossMonth - expenseMonth;

      const profitSheet = [
        { Keterangan: 'PENDAPATAN', Nominal: '' },
        { Keterangan: 'Total Omzet', Nominal: rp(revenueMonth) },
        { Keterangan: '', Nominal: '' },
        { Keterangan: 'BEBAN POKOK PENJUALAN', Nominal: '' },
        { Keterangan: 'Total HPP Terjual', Nominal: rp(hppMonth) },
        { Keterangan: '', Nominal: '' },
        { Keterangan: 'Laba Kotor', Nominal: rp(grossMonth) },
        { Keterangan: '', Nominal: '' },
        { Keterangan: 'BEBAN OPERASIONAL', Nominal: '' },
        { Keterangan: 'Total Pengeluaran', Nominal: rp(expenseMonth) },
        { Keterangan: '', Nominal: '' },
        { Keterangan: 'LABA BERSIH', Nominal: rp(netMonth) },
      ];

      const makeSheet = (title: string, rows: Record<string, unknown>[]) => {
        if (rows.length === 0) rows = [{}];
        const ws = XLSX.utils.json_to_sheet([{}], { skipHeader: true });
        XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' });
        XLSX.utils.sheet_add_json(ws, rows, { origin: 'A3' });
        return ws;
      };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, makeSheet(`LAPORAN PENJUALAN — ${bulanLabel}`, salesSheet), "Penjualan");
      XLSX.utils.book_append_sheet(workbook, makeSheet('RINGKASAN STOK BARANG (Akumulatif)', inventorySheet), "Stok Barang");
      XLSX.utils.book_append_sheet(workbook, makeSheet(`BARANG MASUK — ${bulanLabel}`, restockSheet), "Barang Masuk");
      XLSX.utils.book_append_sheet(workbook, makeSheet(`LAPORAN PENGELUARAN — ${bulanLabel}`, expenseSheet), "Pengeluaran");
      XLSX.utils.book_append_sheet(workbook, makeSheet(`LAPORAN LABA RUGI — ${bulanLabel}`, profitSheet), "Laba Rugi");
      XLSX.writeFile(workbook, `laporan-${bulanLabel.replace(' ', '-').toLowerCase()}.xlsx`);
      toast.success(`Laporan ${bulanLabel} berhasil diexport ke Excel.`);
    } catch {
      toast.error('Gagal mengekspor laporan. Coba lagi.');
    }
  };

  // ==============================
  // AUTO BACKUP EXCEL — sekali per hari saat data pertama kali load
  // ==============================
  const autoExportBackup = (data: typeof storeData) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastBackupKey = `systemPosLastBackup_${activeStore}`;
      const lastBackup = localStorage.getItem(lastBackupKey);
      if (lastBackup === today) return;

      const now = new Date();
      const bulanLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const rp = (num: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

      const isFnb = data.storeType === 'fnb';

      const inventoryRows = data.inventory.map(i => ({
        SKU: i.sku, Nama: i.name, HPP: rp(i.hpp), Harga: rp(i.price),
      }));

      const salesRows = isFnb
        ? (data.fnbSales || []).filter(s => s.date.startsWith(bulanLabel)).map(s => ({
            Tanggal: s.date,
            Items: s.items.map(si => `${si.sku}x${si.qty}`).join(', '),
            Total: rp(s.total),
          }))
        : data.sales.filter(s => s.date.startsWith(bulanLabel)).map(s => ({
            Tanggal: s.date, Invoice: s.invoice || '-',
            SKU: s.sku, Size: s.size, Qty: s.qty,
            Status: s.status || 'selesai',
          }));

      const expenseRows = data.expenses.filter(e => e.date.startsWith(bulanLabel)).map(e => ({
        Tanggal: e.date, Kategori: e.category, Deskripsi: e.desc, Nominal: rp(e.amount),
      }));

      const wb = XLSX.utils.book_new();
      const addSheet = (name: string, rows: Record<string, unknown>[]) => {
        const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Info: 'Tidak ada data' }]);
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      addSheet('Produk', inventoryRows);
      addSheet('Penjualan', salesRows);
      addSheet('Pengeluaran', expenseRows);

      XLSX.writeFile(wb, `backup-${activeStore}-${today}.xlsx`);
      localStorage.setItem(lastBackupKey, today);
      toast.success('Backup otomatis berhasil disimpan ke perangkat.');
    } catch (err) {
      console.warn('[autoExportBackup] Gagal backup:', err);
    }
  };

  const [newExp, setNewExp] = useState({ date: "", category: "", desc: "", amount: "" });

  useEffect(() => {
    if (!isStoreLoading && activeStore && storeData.inventory.length + storeData.sales.length + (storeData.fnbSales?.length || 0) > 0) {
      autoExportBackup(storeData);
    }
  }, [isStoreLoading, activeStore]);

  // ==============================
  // LOAD STORE
  // ==============================

  useEffect(() => {
    const savedStore =
      localStorage.getItem("systemPosStoreCode") ||
      localStorage.getItem("merchantOsStoreCode");
    if (savedStore && user) {
      localStorage.setItem("systemPosStoreCode", savedStore);
      localStorage.removeItem("merchantOsStoreCode");
      setActiveStore(savedStore);
    }
  }, [user]);

  // ==============================
  // LOGOUT STORE
  // ==============================

  const handleLogoutStore = () => {
    setActiveStore("");
    localStorage.removeItem("systemPosStoreCode");
  };

  // ==============================
  // INVENTORY
  // ==============================

  const handleAddInventory = (item: InventoryItem) => {
    const updatedInv = [...(storeData.inventory || []), item];
    const newData = { ...storeData, inventory: updatedInv };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Produk berhasil ditambahkan.'))
      .catch(() => toast.error('Gagal menyimpan produk. Periksa koneksi internet kamu.'));
  };

  const handleDeleteInventory = (sku: string) => {
    const item = storeData.inventory.find(i => i.sku === sku);
    confirm(
      'Hapus Produk',
      `Yakin mau hapus "${item?.name || sku}"? Data tidak bisa dikembalikan.`,
      () => {
        const updatedInv = storeData.inventory.filter((i) => i.sku !== sku);
        const newData = { ...storeData, inventory: updatedInv };
        setStoreData(newData);
        saveToCloud(newData)
          .then(() => toast.success('Produk berhasil dihapus.'))
          .catch(() => toast.error('Gagal menghapus produk. Coba lagi.'));
      }
    );
  };

  const handleUpdateInventory = (oldSku: string, item: InventoryItem) => {
    const updatedInv = storeData.inventory.map((i) => i.sku === oldSku ? item : i);
    const newData = { ...storeData, inventory: updatedInv };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Data produk berhasil diperbarui.'))
      .catch(() => toast.error('Gagal memperbarui produk. Periksa koneksi internet kamu.'));
  };

  const handleAddRestock = (restock: Omit<RestockItem, "id">) => {
    const newRestock: RestockItem = { id: Date.now().toString(), ...restock };
    const updatedRestocks = [newRestock, ...(storeData.restocks || [])];
    const newData = { ...storeData, restocks: updatedRestocks };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Restock berhasil dicatat.'))
      .catch(() => toast.error('Gagal menyimpan restock. Coba lagi.'));
  };

  const handleDeleteRestock = (id: string) => {
    confirm(
      'Hapus Restock',
      'Yakin mau hapus riwayat restock ini? Data tidak bisa dikembalikan.',
      () => {
        const updatedRestocks = (storeData.restocks || []).filter((r) => r.id !== id);
        const newData = { ...storeData, restocks: updatedRestocks };
        setStoreData(newData);
        saveToCloud(newData)
          .then(() => toast.success('Restock berhasil dihapus.'))
          .catch(() => toast.error('Gagal menghapus restock. Coba lagi.'));
      }
    );
  };

  // ==============================
  // SALES
  // ==============================

  const handleAddSale = (sale: Omit<SaleItem, "id">) => {
    const newSale: SaleItem = {
      id: Date.now().toString(),
      date: sale.date, invoice: sale.invoice, sku: sale.sku,
      qty: Number(sale.qty), size: sale.size,
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
    confirm(
      'Hapus Penjualan',
      'Yakin mau hapus transaksi ini? Data tidak bisa dikembalikan.',
      () => {
        const updatedSales = storeData.sales.filter((s) => s.id !== id);
        const newData = { ...storeData, sales: updatedSales };
        setStoreData(newData);
        saveToCloud(newData)
          .then(() => toast.success('Data penjualan berhasil dihapus.'))
          .catch(() => toast.error('Gagal menghapus penjualan. Coba lagi.'));
      }
    );
  };

  const handleAddFnbSale = (sale: Omit<FnbSaleItem, "id">) => {
    const newSale: FnbSaleItem = { id: Date.now().toString(), ...sale };
    const updatedFnbSales = [newSale, ...(storeData.fnbSales || [])];
    const newData = { ...storeData, fnbSales: updatedFnbSales };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Penjualan berhasil dicatat.'))
      .catch(() => toast.error('Gagal menyimpan penjualan. Periksa koneksi internet kamu.'));
  };

  const handleDeleteFnbSale = (id: string) => {
    confirm(
      'Hapus Transaksi',
      'Yakin mau hapus transaksi ini? Data tidak bisa dikembalikan.',
      () => {
        const updatedFnbSales = (storeData.fnbSales || []).filter((s) => s.id !== id);
        const newData = { ...storeData, fnbSales: updatedFnbSales };
        setStoreData(newData);
        saveToCloud(newData)
          .then(() => toast.success('Transaksi berhasil dihapus.'))
          .catch(() => toast.error('Gagal menghapus transaksi. Coba lagi.'));
      }
    );
  };

  const handleUpdateSaleStatus = (id: string, status: SaleStatus, dpAmount?: number) => {
    const updatedSales = storeData.sales.map((s) =>
      s.id === id ? { ...s, status, dpAmount: status === 'dp' ? dpAmount : undefined } : s
    );
    const newData = { ...storeData, sales: updatedSales };
    setStoreData(newData);
    saveToCloud(newData)
      .then(() => toast.success('Status berhasil diperbarui.'))
      .catch(() => toast.error('Gagal memperbarui status. Coba lagi.'));
  };

  // ==============================
  // EXPENSE
  // ==============================

  const handleAddExpense = (expense: Omit<ExpenseItem, "id">) => {
    const exp: ExpenseItem = {
      id: Date.now().toString(),
      date: expense.date, category: expense.category,
      desc: expense.desc, amount: Number(expense.amount),
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
    confirm(
      'Hapus Pengeluaran',
      'Yakin mau hapus data pengeluaran ini? Data tidak bisa dikembalikan.',
      () => {
        const updatedExpenses = storeData.expenses.filter((exp) => exp.id !== id);
        const newData = { ...storeData, expenses: updatedExpenses };
        setStoreData(newData);
        saveToCloud(newData)
          .then(() => toast.success('Pengeluaran berhasil dihapus.'))
          .catch(() => toast.error('Gagal menghapus pengeluaran. Coba lagi.'));
      }
    );
  };

  // ==============================
  // LOADING
  // ==============================

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#6b7280' }}>Menghubungkan...</p>
        </div>
      </div>
    );
  }

  if (!activeStore) return <AuthScreen setActiveStore={setActiveStore} />;

  if (isStoreLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#6b7280' }}>Memuat data toko...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0a0f' }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeStore={activeStore}
        storeType={storeData.storeType}
        handleLogoutStore={handleLogoutStore}
        onOpenBackupRestore={() => setIsBackupModalOpen(true)}
      />
      <main className="flex-1 p-4 md:p-6 pt-14 pb-20 md:pt-6 md:pb-6 overflow-x-hidden" style={{ background: '#0a0a0f' }}>
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
          storeData.storeType === 'fnb'
            ? <FnbInventoryTab
                metrics={metrics}
                filterMonth={filterMonth}
                onFilterMonthChange={setFilterMonth}
                onAddInventory={handleAddInventory}
                onDeleteInventory={handleDeleteInventory}
                onUpdateInventory={handleUpdateInventory}
                onUploadError={(msg) => toast.error(msg)}
              />
            : <InventoryTab
                metrics={metrics}
                storeData={storeData}
                filterMonth={filterMonth}
                onFilterMonthChange={setFilterMonth}
                onAddInventory={handleAddInventory}
                onDeleteInventory={handleDeleteInventory}
                onUpdateInventory={handleUpdateInventory}
                onAddRestock={handleAddRestock}
                onDeleteRestock={handleDeleteRestock}
                onUploadError={(msg) => toast.error(msg)}
              />
        )}

        {activeTab === "penjualan" && (
          storeData.storeType === 'fnb'
            ? <FnbSalesTab
                storeData={storeData}
                metrics={metrics}
                filterMonth={filterMonth}
                onFilterMonthChange={setFilterMonth}
                onAddFnbSale={handleAddFnbSale}
                onDeleteFnbSale={handleDeleteFnbSale}
              />
            : <SalesTab
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

        {activeTab === "closing" && (
          <ClosingTab storeData={storeData} metrics={metrics} />
        )}
      </main>

      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        activeStore={activeStore}
        onRestore={handleRestore}
      />

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={cancelConfirm}
      />
      <Toast toasts={toast.toasts} onRemove={toast.remove} />
    </div>
  );
}
