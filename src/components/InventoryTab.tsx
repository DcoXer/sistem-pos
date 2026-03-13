import React, { useState } from "react";
import { Plus, Trash2, Pencil, X, Check, PackagePlus, History } from "lucide-react";
import type { InventoryItem, RestockItem } from "../types";
import { SIZES } from "../types";
import MonthFilter from "./MonthFilter";

const formatRp = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);

interface InventoryTabProps {
  metrics: any;
  storeData: any;
  filterMonth: string;
  onFilterMonthChange: (val: string) => void;
  onAddInventory: (item: InventoryItem) => void;
  onDeleteInventory: (sku: string) => void;
  onUpdateInventory: (oldSku: string, item: InventoryItem) => void;
  onAddRestock: (restock: Omit<RestockItem, "id">) => void;
  onDeleteRestock: (id: string) => void;
}

// ==============================
// EDIT MODAL
// ==============================
interface EditModalProps {
  item: InventoryItem;
  onClose: () => void;
  onSave: (oldSku: string, updated: InventoryItem) => void;
}

function EditModal({ item, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState({
    sku: item.sku,
    name: item.name,
    hpp: String(item.hpp),
    price: String(item.price),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(item.sku, {
      sku: form.sku,
      name: form.name,
      hpp: Number(form.hpp),
      price: Number(form.price),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg">Edit Produk</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">SKU</label>
              <input required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nama Produk</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">HPP (Modal)</label>
              <input required type="number" value={form.hpp} onChange={e => setForm({ ...form, hpp: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Harga Jual</label>
              <input required type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              Batal
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium">
              <Check size={15} /> Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==============================
// RESTOCK MODAL
// ==============================
interface RestockModalProps {
  item: InventoryItem;
  restockHistory: RestockItem[];
  onClose: () => void;
  onAddRestock: (restock: Omit<RestockItem, "id">) => void;
  onDeleteRestock: (id: string) => void;
}

function RestockModal({ item, restockHistory, onClose, onAddRestock, onDeleteRestock }: RestockModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [sizeStocks, setSizeStocks] = useState<Record<string, string>>(
    Object.fromEntries(SIZES.map(s => [s, '']))
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const sizes = SIZES.map(size => ({ size, stock: Number(sizeStocks[size]) || 0 }));
    const hasStock = sizes.some(s => s.stock > 0);
    if (!hasStock) { alert('Isi minimal 1 ukuran'); return; }

    onAddRestock({ sku: item.sku, date, sizes, note });
    setSizeStocks(Object.fromEntries(SIZES.map(s => [s, ''])));
    setNote('');
  };

  // Sort history terbaru di atas
  const sorted = [...restockHistory].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h3 className="font-bold text-lg">Restock Barang</h3>
            <p className="text-xs text-gray-400">{item.sku} — {item.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Form restock baru */}
          <form onSubmit={handleAdd} className="space-y-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase">Tambah Restock Baru</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Tanggal Masuk</label>
                <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Keterangan</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Opsional"
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Qty per Ukuran</label>
              <div className="grid grid-cols-5 gap-2">
                {SIZES.map(size => (
                  <div key={size} className="space-y-1">
                    <label className="block text-center text-xs font-bold text-blue-600 bg-blue-100 rounded py-0.5">{size}</label>
                    <input type="number" min="0" value={sizeStocks[size]}
                      onChange={e => setSizeStocks(prev => ({ ...prev, [size]: e.target.value }))}
                      placeholder="0"
                      className="w-full border rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium">
                <PackagePlus size={15} /> Tambah Restock
              </button>
            </div>
          </form>

          {/* History restock */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
              <History size={12} /> Riwayat Restock
            </p>
            {sorted.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada riwayat restock.</p>
            )}
            {sorted.map(r => {
              const total = r.sizes.reduce((sum, s) => sum + s.stock, 0);
              return (
                <div key={r.id} className="flex items-start justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{r.date}</span>
                      {r.note && <span className="text-xs text-gray-400">— {r.note}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {r.sizes.filter(s => s.stock > 0).map(s => (
                        <span key={s.size} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 font-medium">
                          {s.size}: {s.stock}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400 px-1">= {total} pcs</span>
                    </div>
                  </div>
                  <button onClick={() => onDeleteRestock(r.id)}
                    className="text-red-400 hover:text-red-600 ml-3 shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==============================
// MAIN COMPONENT
// ==============================
export default function InventoryTab({
  metrics,
  storeData,
  filterMonth,
  onFilterMonthChange,
  onAddInventory,
  onDeleteInventory,
  onUpdateInventory,
  onAddRestock,
  onDeleteRestock,
}: InventoryTabProps) {
  const [newInv, setNewInv] = useState({ sku: '', name: '', hpp: '', price: '' });
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [restockingItem, setRestockingItem] = useState<InventoryItem | null>(null);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onAddInventory({
      sku: newInv.sku,
      name: newInv.name,
      hpp: Number(newInv.hpp),
      price: Number(newInv.price),
    });
    setNewInv({ sku: '', name: '', hpp: '', price: '' });
  };

  // Filter stok berdasarkan restock di bulan yang dipilih
  const [fy, fm] = filterMonth.split('-').map(Number);
  const restocksThisMonth = (storeData.restocks || []).filter((r: RestockItem) => {
    const d = new Date(r.date);
    return d.getFullYear() === fy && d.getMonth() + 1 === fm;
  });

  // SKU yang punya restock di bulan ini
  const restockedSkusThisMonth = new Set(restocksThisMonth.map((r: RestockItem) => r.sku));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <h2 className="text-2xl font-bold">Database & Stok Barang</h2>
        <MonthFilter value={filterMonth} onChange={onFilterMonthChange} />
      </div>

      {/* Form tambah produk baru */}
      <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase">Daftarkan Produk Baru</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">SKU</label>
            <input required value={newInv.sku} onChange={e => setNewInv({ ...newInv, sku: e.target.value })}
              placeholder="TS-001"
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Nama Produk</label>
            <input required value={newInv.name} onChange={e => setNewInv({ ...newInv, name: e.target.value })}
              placeholder="Kaos Polos Hitam"
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">HPP (Modal)</label>
            <input required type="number" value={newInv.hpp} onChange={e => setNewInv({ ...newInv, hpp: e.target.value })}
              placeholder="40000"
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Harga Jual</label>
            <div className="flex gap-2">
              <input required type="number" value={newInv.price} onChange={e => setNewInv({ ...newInv, price: e.target.value })}
                placeholder="85000"
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition">
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Tabel produk */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b">
              <th className="p-4 font-medium">SKU</th>
              <th className="p-4 font-medium">Nama Produk</th>
              <th className="p-4 font-medium text-right">HPP</th>
              <th className="p-4 font-medium text-right">Harga Jual</th>
              {SIZES.map(size => (
                <th key={size} className="p-4 font-medium text-center text-blue-600">{size}</th>
              ))}
              <th className="p-4 font-medium text-center text-red-500">Terjual</th>
              <th className="p-4 font-medium text-center text-green-600">Sisa</th>
              <th className="p-4 font-medium text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {Object.values(metrics.stockMap).map((item: any) => {
              const hasRestockThisMonth = restockedSkusThisMonth.has(item.sku);
              return (
                <tr key={item.sku} className={`hover:bg-gray-50 transition ${hasRestockThisMonth ? 'bg-blue-50/40' : ''}`}>
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      {item.sku}
                      {hasRestockThisMonth && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded">Masuk</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">{item.name}</td>
                  <td className="p-4 text-right text-gray-500">{formatRp(item.hpp)}</td>
                  <td className="p-4 text-right">{formatRp(item.price)}</td>
                  {SIZES.map(size => {
                    const restocked = item.restockedBySize?.[size] || 0;
                    const sold = item.soldBySize?.[size] || 0;
                    const remaining = restocked - sold;
                    return (
                      <td key={size} className="p-4 text-center">
                        <div className="flex flex-col items-center leading-tight">
                          <span className={`font-bold ${remaining <= 0 && restocked > 0 ? 'text-red-500' : remaining <= 3 && restocked > 0 ? 'text-yellow-500' : 'text-gray-700'}`}>
                            {remaining}
                          </span>
                          <span className="text-[10px] text-gray-400">/{restocked}</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-4 text-center text-red-500">{item.sold}</td>
                  <td className="p-4 text-center font-bold text-green-600">{item.current}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setRestockingItem(item)}
                        className="text-green-500 hover:text-green-700 transition" title="Restock">
                        <PackagePlus size={15} />
                      </button>
                      <button onClick={() => setEditingItem(item)}
                        className="text-blue-400 hover:text-blue-600 transition" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => onDeleteInventory(item.sku)}
                        className="text-red-400 hover:text-red-600 transition" title="Hapus">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {Object.keys(metrics.stockMap).length === 0 && (
              <tr>
                <td colSpan={8 + SIZES.length} className="p-8 text-center text-gray-400">
                  Belum ada barang di database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(oldSku, updated) => {
            onUpdateInventory(oldSku, updated);
            setEditingItem(null);
          }}
        />
      )}

      {/* Restock Modal */}
      {restockingItem && (
        <RestockModal
          item={restockingItem}
          restockHistory={(storeData.restocks || []).filter((r: RestockItem) => r.sku === restockingItem.sku)}
          onClose={() => setRestockingItem(null)}
          onAddRestock={onAddRestock}
          onDeleteRestock={onDeleteRestock}
        />
      )}
    </div>
  );
}
