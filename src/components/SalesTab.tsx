import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { StoreData, SaleItem } from '../types';

const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

interface SalesTabProps {
  storeData: StoreData;
  metrics: any;
  onAddSale: (sale: Omit<SaleItem, 'id'>) => void;
  onDeleteSale: (id: string) => void;
}

export default function SalesTab({ storeData, metrics, onAddSale, onDeleteSale }: SalesTabProps) {
  const [newSale, setNewSale] = useState({ date: new Date().toISOString().split('T')[0], invoice: '', sku: '', qty: '' });

const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (!newSale.sku || !newSale.qty) return;

  onAddSale({
    ...newSale,
    qty: Number(newSale.qty)
  });

  setNewSale({ ...newSale, invoice: '', qty: '', sku: '' });
};

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold border-b pb-2">Catat Penjualan</h2>
      
      <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Tanggal</label>
          <input required type="date" value={newSale.date} onChange={e=>setNewSale({...newSale, date: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">No. Invoice</label>
          <input value={newSale.invoice} onChange={e=>setNewSale({...newSale, invoice: e.target.value})} placeholder="INV-001" className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Pilih Barang</label>
          <select required value={newSale.sku} onChange={e=>setNewSale({...newSale, sku: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white">
            <option value="" disabled>-- Pilih Produk --</option>
            {(storeData.inventory || []).map(item => (
              <option key={item.sku} value={item.sku}>{item.sku} - {item.name} (Sisa: {metrics.stockMap[item.sku]?.current || 0})</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Qty (Pcs)</label>
          <div className="flex space-x-2">
            <input required type="number" min="1" value={newSale.qty} onChange={e=>setNewSale({...newSale, qty: e.target.value})} placeholder="1" className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
            <button type="submit" className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition"><Plus size={20}/></button>
          </div>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b">
              <th className="p-4 font-medium">Tanggal</th>
              <th className="p-4 font-medium">Invoice</th>
              <th className="p-4 font-medium">Produk</th>
              <th className="p-4 font-medium text-center">Qty</th>
              <th className="p-4 font-medium text-right text-green-600">Total Pendapatan</th>
              <th className="p-4 font-medium text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {(storeData.sales || []).map((sale) => {
              const item = metrics.stockMap[sale.sku];
              return (
                <tr key={sale.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">{sale.date}</td>
                  <td className="p-4 text-gray-500">{sale.invoice || '-'}</td>
                  <td className="p-4 font-medium">{item ? item.name : <span className="text-red-500 line-through">{sale.sku}</span>}</td>
                  <td className="p-4 text-center font-bold">{sale.qty}</td>
                  <td className="p-4 text-right font-bold text-green-600">{item ? formatRp(item.price * sale.qty) : '-'}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => onDeleteSale(sale.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </td>
                </tr>
              );
            })}
            {(!storeData.sales || storeData.sales.length === 0) && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Belum ada data penjualan.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
