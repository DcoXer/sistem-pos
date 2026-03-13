import React, { useState } from "react";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import type { InventoryItem } from "../types";
import { SIZES } from "../types";

const formatRp = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);

interface InventoryTabProps {
  metrics: any;
  onAddInventory: (item: InventoryItem) => void;
  onDeleteInventory: (sku: string) => void;
  onUpdateInventory: (oldSku: string, item: InventoryItem) => void;
}

// ==============================
// EDIT MODAL
// ==============================

interface EditModalProps {
  item: InventoryItem;
  soldBySize: Record<string, number>;
  onClose: () => void;
  onSave: (oldSku: string, updated: InventoryItem) => void;
}

function EditModal({ item, soldBySize, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState({
    sku: item.sku,
    name: item.name,
    hpp: String(item.hpp),
    price: String(item.price),
  });

  // Stok per ukuran — value adalah stok AWAL (bukan sisa)
  const [sizeStocks, setSizeStocks] = useState<Record<string, string>>(
    Object.fromEntries(
      SIZES.map(size => {
        const found = item.sizes?.find(s => s.size === size);
        return [size, String(found?.stock || 0)];
      })
    )
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const sizes = SIZES.map(size => ({
      size,
      stock: Number(sizeStocks[size]) || 0,
    }));

    const totalStock = sizes.reduce((sum, s) => sum + s.stock, 0);

    onSave(item.sku, {
      sku: form.sku,
      name: form.name,
      hpp: Number(form.hpp),
      price: Number(form.price),
      stock: totalStock,
      sizes,
    });
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg">Edit Barang</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* SKU & Nama */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">SKU</label>
              <input
                required
                value={form.sku}
                onChange={e => setForm({ ...form, sku: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nama Produk</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* HPP & Harga Jual */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">HPP (Modal)</label>
              <input
                required
                type="number"
                value={form.hpp}
                onChange={e => setForm({ ...form, hpp: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Harga Jual</label>
              <input
                required
                type="number"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Stok per Ukuran */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Stok Awal per Ukuran</label>
            <div className="grid grid-cols-5 gap-2">
              {SIZES.map(size => {
                const sold = soldBySize?.[size] || 0;
                const currentStock = (Number(sizeStocks[size]) || 0) - sold;
                return (
                  <div key={size} className="space-y-1">
                    <label className="block text-center text-xs font-bold text-blue-600 bg-blue-50 rounded py-0.5">
                      {size}
                    </label>
                    <input
                      type="number"
                      min={sold} // stok awal minimal = yang udah terjual
                      value={sizeStocks[size]}
                      onChange={e => setSizeStocks(prev => ({ ...prev, [size]: e.target.value }))}
                      className="w-full border rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className={`text-[10px] text-center ${currentStock < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      sisa: {currentStock}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400">* Input stok awal. Sisa dihitung otomatis dari penjualan.</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium"
            >
              <Check size={15} />
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==============================
// MAIN COMPONENT
// ==============================

export default function InventoryTab({
  metrics,
  onAddInventory,
  onDeleteInventory,
  onUpdateInventory,
}: InventoryTabProps) {
  const [newInv, setNewInv] = useState({ sku: "", name: "", hpp: "", price: "" });
  const [sizeStocks, setSizeStocks] = useState<Record<string, string>>(
    Object.fromEntries(SIZES.map(s => [s, ""]))
  );
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const sizes = SIZES.map(size => ({
      size,
      stock: Number(sizeStocks[size]) || 0,
    }));

    const totalStock = sizes.reduce((sum, s) => sum + s.stock, 0);

    onAddInventory({
      sku: newInv.sku,
      name: newInv.name,
      hpp: Number(newInv.hpp),
      price: Number(newInv.price),
      stock: totalStock,
      sizes,
    });

    setNewInv({ sku: "", name: "", hpp: "", price: "" });
    setSizeStocks(Object.fromEntries(SIZES.map(s => [s, ""])));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold border-b pb-2">Database & Stok Barang</h2>

      {/* Form Tambah */}
      <form
        onSubmit={handleAdd}
        className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">SKU</label>
            <input
              required
              value={newInv.sku}
              onChange={e => setNewInv({ ...newInv, sku: e.target.value })}
              placeholder="TS-001"
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Nama Produk</label>
            <input
              required
              value={newInv.name}
              onChange={e => setNewInv({ ...newInv, name: e.target.value })}
              placeholder="Kaos Polos Hitam"
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">HPP (Modal)</label>
            <input
              required
              type="number"
              value={newInv.hpp}
              onChange={e => setNewInv({ ...newInv, hpp: e.target.value })}
              placeholder="40000"
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Harga Jual</label>
            <input
              required
              type="number"
              value={newInv.price}
              onChange={e => setNewInv({ ...newInv, price: e.target.value })}
              placeholder="85000"
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Stok per Ukuran</label>
          <div className="grid grid-cols-5 gap-2">
            {SIZES.map(size => (
              <div key={size} className="space-y-1">
                <label className="block text-center text-xs font-bold text-blue-600 bg-blue-50 rounded py-0.5">{size}</label>
                <input
                  type="number"
                  min="0"
                  value={sizeStocks[size]}
                  onChange={e => setSizeStocks(prev => ({ ...prev, [size]: e.target.value }))}
                  placeholder="0"
                  className="w-full border rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={16} />
            Tambah Barang
          </button>
        </div>
      </form>

      {/* Tabel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b">
              <th className="p-4 font-medium">SKU</th>
              <th className="p-4 font-medium">Nama Produk</th>
              <th className="p-4 font-medium text-right">HPP</th>
              <th className="p-4 font-medium text-right">Harga Jual</th>
              {SIZES.map(size => (
                <th key={size} className="p-4 font-medium text-center text-blue-600">{size}</th>
              ))}
              <th className="p-4 font-medium text-center text-red-500">Total Laku</th>
              <th className="p-4 font-medium text-center text-green-600">Total Sisa</th>
              <th className="p-4 font-medium text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {Object.values(metrics.stockMap).map((item: any) => (
              <tr key={item.sku} className="hover:bg-gray-50 transition">
                <td className="p-4 font-medium">{item.sku}</td>
                <td className="p-4">{item.name}</td>
                <td className="p-4 text-right text-gray-500">{formatRp(item.hpp)}</td>
                <td className="p-4 text-right">{formatRp(item.price)}</td>
                {SIZES.map(size => {
                  const sizeData = item.sizes?.find((s: any) => s.size === size);
                  const soldForSize = item.soldBySize?.[size] || 0;
                  const remaining = (sizeData?.stock || 0) - soldForSize;
                  return (
                    <td key={size} className="p-4 text-center">
                      <div className="flex flex-col items-center leading-tight">
                        <span className={`font-bold ${remaining <= 0 ? 'text-red-500' : remaining <= 3 ? 'text-yellow-500' : 'text-gray-700'}`}>
                          {remaining}
                        </span>
                        <span className="text-[10px] text-gray-400">/{sizeData?.stock || 0}</span>
                      </div>
                    </td>
                  );
                })}
                <td className="p-4 text-center text-red-500">{item.sold}</td>
                <td className="p-4 text-center font-bold text-green-600">{item.current}</td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="text-blue-400 hover:text-blue-600 transition"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => onDeleteInventory(item.sku)}
                      className="text-red-400 hover:text-red-600 transition"
                      title="Hapus"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
          soldBySize={metrics.stockMap[editingItem.sku]?.soldBySize || {}}
          onClose={() => setEditingItem(null)}
          onSave={(oldSku, updated) => {
            onUpdateInventory(oldSku, updated);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
