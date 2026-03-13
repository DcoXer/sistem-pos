import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { StoreData, ExpenseItem } from '../types';
import MonthFilter from './MonthFilter';

const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

interface ExpensesTabProps {
  storeData: StoreData;
  filterMonth: string;
  onFilterMonthChange: (val: string) => void;
  onAddExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
}

export default function ExpensesTab({ storeData, filterMonth, onFilterMonthChange, onAddExpense, onDeleteExpense }: ExpensesTabProps) {
  const [newExp, setNewExp] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Ads',
    desc: '',
    amount: ''
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newExp.amount) return;
    onAddExpense({ ...newExp, amount: Number(newExp.amount) });
    setNewExp({ ...newExp, desc: '', amount: '' });
  };

  // Filter pengeluaran berdasarkan bulan
  const filteredExpenses = (storeData.expenses || []).filter(exp => {
    const d = new Date(exp.date);
    const [fy, fm] = filterMonth.split('-').map(Number);
    return d.getFullYear() === fy && d.getMonth() + 1 === fm;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <h2 className="text-2xl font-bold">Catat Pengeluaran Operasional</h2>
        <MonthFilter value={filterMonth} onChange={onFilterMonthChange} />
      </div>

      {/* Form tambah */}
      <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Tanggal</label>
          <input required type="date" value={newExp.date} onChange={e => setNewExp({ ...newExp, date: e.target.value })} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Kategori</label>
          <select value={newExp.category} onChange={e => setNewExp({ ...newExp, category: e.target.value })} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="Ads">Marketing / Iklan</option>
            <option value="Packaging">Packaging</option>
            <option value="Gaji">Gaji</option>
            <option value="Operasional">Operasional (Listrik, Kuota)</option>
            <option value="Lainnya">Lain-lain</option>
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Deskripsi</label>
          <input required value={newExp.desc} onChange={e => setNewExp({ ...newExp, desc: e.target.value })} placeholder="Beli lakban & plastik polymailer" className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Nominal (Rp)</label>
          <div className="flex space-x-2">
            <input required type="number" min="0" value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} placeholder="150000" className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-red-500" />
            <button type="submit" className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition"><Plus size={20} /></button>
          </div>
        </div>
      </form>

      {/* Summary bar */}
      <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-5 py-3">
        <span className="text-sm text-gray-500">{filteredExpenses.length} pengeluaran</span>
        <span className="text-sm font-bold text-red-700">Total: {formatRp(totalExpenses)}</span>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b">
              <th className="p-4 font-medium">Tanggal</th>
              <th className="p-4 font-medium">Kategori</th>
              <th className="p-4 font-medium">Deskripsi</th>
              <th className="p-4 font-medium text-right text-red-600">Nominal Keluar</th>
              <th className="p-4 font-medium text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {filteredExpenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-gray-50 transition">
                <td className="p-4">{exp.date}</td>
                <td className="p-4"><span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{exp.category}</span></td>
                <td className="p-4">{exp.desc}</td>
                <td className="p-4 text-right font-bold text-red-600">{formatRp(exp.amount)}</td>
                <td className="p-4 text-center">
                  <button onClick={() => onDeleteExpense(exp.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {filteredExpenses.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Tidak ada pengeluaran di bulan ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
