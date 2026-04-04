import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { StoreData, ExpenseItem } from '../types';
import MonthFilter from './MonthFilter';

const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

const D = {
  surface: '#13131a', elevated: '#1a1a24', border: '#ffffff0d',
  accent: '#8b5cf6', accentDim: '#8b5cf615',
  text: '#f1f0f5', muted: '#6b7280', subtle: '#374151',
  danger: '#ef4444', dangerDim: '#ef444415',
  success: '#10b981', successDim: '#10b98115',
  input: { background: '#1a1a24', border: '#ffffff12', color: '#f1f0f5' },
};

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
    category: 'Ads', desc: '', amount: ''
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newExp.amount) return;
    onAddExpense({ ...newExp, amount: Number(newExp.amount) });
    setNewExp({ ...newExp, desc: '', amount: '' });
  };

  const filteredExpenses = (storeData.expenses || []).filter(exp => {
    const d = new Date(exp.date);
    const [fy, fm] = filterMonth.split('-').map(Number);
    return d.getFullYear() === fy && d.getMonth() + 1 === fm;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const inputStyle = {
    background: D.elevated,
    border: `1px solid ${D.border}`,
    color: D.text,
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
  };

  const labelStyle = { fontSize: 11, fontWeight: 600, color: D.muted, textTransform: 'uppercase' as const, letterSpacing: 1, display: 'block', marginBottom: 4 };

  return (
    <div className="space-y-6" style={{ color: D.text }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4"
        style={{ borderBottom: `1px solid ${D.border}` }}>
        <h2 className="text-xl font-semibold">Pengeluaran Operasional</h2>
        <MonthFilter value={filterMonth} onChange={onFilterMonthChange} />
      </div>

      {/* Form */}
      <form onSubmit={handleAdd} className="p-5 rounded-xl space-y-4"
        style={{ background: D.surface, border: `1px solid ${D.border}` }}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-1">
            <label style={labelStyle}>Tanggal</label>
            <input required type="date" value={newExp.date}
              onChange={e => setNewExp({ ...newExp, date: e.target.value })}
              style={inputStyle} />
          </div>
          <div className="space-y-1">
            <label style={labelStyle}>Kategori</label>
            <select value={newExp.category}
              onChange={e => setNewExp({ ...newExp, category: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="Ads">Marketing / Iklan</option>
              <option value="Packaging">Packaging</option>
              <option value="Gaji">Gaji</option>
              <option value="Operasional">Operasional</option>
              <option value="Lainnya">Lain-lain</option>
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label style={labelStyle}>Deskripsi</label>
            <input required value={newExp.desc}
              onChange={e => setNewExp({ ...newExp, desc: e.target.value })}
              placeholder="Beli lakban & plastik polymailer"
              style={inputStyle} />
          </div>
          <div className="space-y-1">
            <label style={labelStyle}>Nominal (Rp)</label>
            <div className="flex gap-2">
              <input required type="number" min="0" value={newExp.amount}
                onChange={e => setNewExp({ ...newExp, amount: e.target.value })}
                placeholder="150000" style={inputStyle} />
              <button type="submit"
                className="shrink-0 p-2 rounded-lg transition"
                style={{ background: D.accentDim, color: D.accent, border: `1px solid ${D.accent}30` }}>
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Summary */}
      <div className="flex items-center justify-between px-5 py-3 rounded-xl"
        style={{ background: D.dangerDim, border: `1px solid ${D.danger}20` }}>
        <span className="text-sm" style={{ color: D.muted }}>{filteredExpenses.length} pengeluaran</span>
        <span className="text-sm font-bold" style={{ color: D.danger }}>Total: {formatRp(totalExpenses)}</span>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                {['Tanggal', 'Kategori', 'Deskripsi', 'Nominal', 'Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: D.muted }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp, i) => (
                <tr key={exp.id} style={{ borderBottom: i < filteredExpenses.length - 1 ? `1px solid ${D.border}` : 'none' }}>
                  <td className="px-4 py-3 text-sm" style={{ color: D.muted }}>{exp.date}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-md"
                      style={{ background: D.elevated, color: D.muted }}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: D.text }}>{exp.desc}</td>
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: D.danger }}>{formatRp(exp.amount)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => onDeleteExpense(exp.id)}
                      className="p-1.5 rounded-lg transition"
                      style={{ color: D.muted }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = D.danger}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = D.muted}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-sm text-center" style={{ color: D.muted }}>
                    Tidak ada pengeluaran di bulan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
