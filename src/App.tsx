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

import type { InventoryItem, SaleItem, ExpenseItem } from "./types";

export default function App() {
  const { user, isInitializing } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeStore, setActiveStore] = useState("");

  const { storeData, setStoreData, saveToCloud } = useStoreData(
    user,
    activeStore,
  );

  const metrics = useMetrics(storeData);

  // ==============================
  // FILTER SALES BY MONTH
  // ==============================

  const getThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();

    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  };

  // ==============================
  // EXPORT DATA
  // ==============================

  const handleExportData = () => {
    const salesThisMonth = storeData.sales.filter((s) => getThisMonth(s.date));
    const expensesThisMonth = storeData.expenses.filter((e) =>
      getThisMonth(e.date),
    );

    const salesSheet = salesThisMonth.map((s) => ({
      Tanggal: s.date,
      Invoice: s.invoice,
      SKU: s.sku,
      Ukuran: s.size || '-',
      Qty: s.qty,
    }));

    const inventorySheet = storeData.inventory.flatMap((i) => {
      const stockData = metrics.stockMap[i.sku];
      if (i.sizes && i.sizes.length > 0) {
        return i.sizes.map((s) => {
          const soldForSize = stockData?.soldBySize?.[s.size] || 0;
          return {
            SKU: i.sku,
            Nama: i.name,
            Ukuran: s.size,
            HPP: i.hpp,
            Harga_Jual: i.price,
            Stok_Awal: s.stock,
            Laku: soldForSize,
            Sisa_Stok: s.stock - soldForSize,
            Nilai_Stok: s.stock * i.hpp,
          };
        });
      }
      return [{
        SKU: i.sku,
        Nama: i.name,
        Ukuran: '-',
        HPP: i.hpp,
        Harga_Jual: i.price,
        Stok_Awal: i.stock,
        Laku: stockData?.sold || 0,
        Sisa_Stok: i.stock - (stockData?.sold || 0),
        Nilai_Stok: i.stock * i.hpp,
      }];
    });

    const expenseSheet = expensesThisMonth.map((e) => ({
      Tanggal: e.date,
      Kategori: e.category,
      Deskripsi: e.desc,
      Jumlah: e.amount,
    }));

    const profitSheet = [
      { Item: "Total Omzet", Nilai: metrics.totalRevenue },
      { Item: "Total HPP", Nilai: metrics.totalHppSold },
      { Item: "Laba Kotor", Nilai: metrics.grossProfit },
      { Item: "Total Pengeluaran", Nilai: metrics.totalExpenses },
      { Item: "Laba Bersih", Nilai: metrics.netProfit },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(salesSheet),
      "Penjualan",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(inventorySheet),
      "Stok Barang",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(expenseSheet),
      "Pengeluaran",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(profitSheet),
      "Laba Rugi",
    );

    XLSX.writeFile(workbook, "laporan-toko.xlsx");
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
    saveToCloud(newData);
  };

  const handleDeleteInventory = (sku: string) => {
    const updatedInv = storeData.inventory.filter((i) => i.sku !== sku);
    const newData = { ...storeData, inventory: updatedInv };
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
    };

    const updatedSales = [newSale, ...(storeData.sales || [])];
    const newData = { ...storeData, sales: updatedSales };
    setStoreData(newData);
    saveToCloud(newData);
  };

  const handleDeleteSale = (id: string) => {
    const updatedSales = storeData.sales.filter((s) => s.id !== id);
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
    saveToCloud(newData);

    setNewExp({ ...newExp, desc: "", amount: "" });
  };

  const handleDeleteExpense = (id: string) => {
    const updatedExpenses = storeData.expenses.filter((exp) => exp.id !== id);
    const newData = { ...storeData, expenses: updatedExpenses };
    setStoreData(newData);
    saveToCloud(newData);
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
          <DashboardTab handleExportData={handleExportData} metrics={metrics} />
        )}

        {activeTab === "stok" && (
          <InventoryTab
            metrics={metrics}
            onAddInventory={handleAddInventory}
            onDeleteInventory={handleDeleteInventory}
          />
        )}

        {activeTab === "penjualan" && (
          <SalesTab
            storeData={storeData}
            metrics={metrics}
            onAddSale={handleAddSale}
            onDeleteSale={handleDeleteSale}
          />
        )}

        {activeTab === "pengeluaran" && (
          <ExpensesTab
            storeData={storeData}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}
      </main>
    </div>
  );
}
