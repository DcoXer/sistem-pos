import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { InventoryItem } from "../types";

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
}

export default function InventoryTab({
  metrics,
  onAddInventory,
  onDeleteInventory,
}: InventoryTabProps) {
  const [newInv, setNewInv] = useState({
    sku: "",
    name: "",
    hpp: "",
    price: "",
    stock: "",
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    onAddInventory({
      sku: newInv.sku,
      name: newInv.name,
      hpp: Number(newInv.hpp),
      price: Number(newInv.price),
      stock: Number(newInv.stock),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold border-b pb-2">
        Database & Stok Barang
      </h2>

      <form
        onSubmit={handleAdd}
        className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-6 gap-4 items-end"
      >
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">
            SKU
          </label>
          <input
            required
            value={newInv.sku}
            onChange={(e) => setNewInv({ ...newInv, sku: e.target.value })}
            placeholder="TS-001"
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">
            Nama Produk
          </label>
          <input
            required
            value={newInv.name}
            onChange={(e) => setNewInv({ ...newInv, name: e.target.value })}
            placeholder="Kaos Polos Hitam"
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">
            HPP (Modal)
          </label>
          <input
            required
            type="number"
            value={newInv.hpp}
            onChange={(e) => setNewInv({ ...newInv, hpp: e.target.value })}
            placeholder="40000"
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">
            Harga Jual
          </label>
          <input
            required
            type="number"
            value={newInv.price}
            onChange={(e) => setNewInv({ ...newInv, price: e.target.value })}
            placeholder="85000"
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">
            Stok Awal
          </label>
          <div className="flex space-x-2">
            <input
              required
              type="number"
              value={newInv.stock}
              onChange={(e) => setNewInv({ ...newInv, stock: e.target.value })}
              placeholder="100"
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b">
              <th className="p-4 font-medium">SKU</th>
              <th className="p-4 font-medium">Nama Produk</th>
              <th className="p-4 font-medium text-right">HPP</th>
              <th className="p-4 font-medium text-right">Harga Jual</th>
              <th className="p-4 font-medium text-center">Stok Awal</th>
              <th className="p-4 font-medium text-center text-red-500">Laku</th>
              <th className="p-4 font-medium text-center text-green-600">
                Tersedia
              </th>
              <th className="p-4 font-medium text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {Object.values(metrics.stockMap).map((item: any) => (
              <tr key={item.sku} className="hover:bg-gray-50 transition">
                <td className="p-4 font-medium">{item.sku}</td>
                <td className="p-4">{item.name}</td>
                <td className="p-4 text-right text-gray-500">
                  {formatRp(item.hpp)}
                </td>
                <td className="p-4 text-right">{formatRp(item.price)}</td>
                <td className="p-4 text-center">{item.stock}</td>
                <td className="p-4 text-center text-red-500">{item.sold}</td>
                <td className="p-4 text-center font-bold text-green-600">
                  {item.current}
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => onDeleteInventory(item.sku)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {Object.keys(metrics.stockMap).length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  Belum ada barang di database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
