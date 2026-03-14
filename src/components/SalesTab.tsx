import React, { useState } from 'react';
import { Plus, Trash2, X, Check } from 'lucide-react';
import type { StoreData, SaleItem, SaleStatus } from '../types';
import { SIZES } from '../types';
import MonthFilter from './MonthFilter';

const formatRp = (num: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(num);

const STATUS_CONFIG: Record<SaleStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending (PO)',  color: 'text-yellow-700', bg: 'bg-yellow-100' },
  dp:      { label: 'DP',           color: 'text-blue-700',   bg: 'bg-blue-100'   },
  selesai: { label: 'Selesai',      color: 'text-green-700',  bg: 'bg-green-100'  },
};

interface SalesTabProps {
  storeData: StoreData;
  metrics: any;
  filterMonth: string;
  onFilterMonthChange: (val: string) => void;
  onAddSale: (sale: Omit<SaleItem, 'id'>) => void;
  onDeleteSale: (id: string) => void;
  onUpdateSaleStatus: (id: string, status: SaleStatus) => void;
}

// ==============================
// STATUS MODAL
// ==============================
interface StatusModalProps {
  sale: SaleItem;
  itemName: string;
  onClose: () => void;
  onSave: (id: string, status: SaleStatus) => void;
}

function StatusModal({ sale, itemName, onClose, onSave }: StatusModalProps) {
  const [selected, setSelected] = useState<SaleStatus>(sale.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-bold text-base">Ubah Status</h3>
            <p className="text-xs text-gray-400">{sale.invoice || sale.id} — {itemName} {sale.size}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-3">
          {(Object.entries(STATUS_CONFIG) as [SaleStatus, typeof STATUS_CONFIG[SaleStatus]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition ${
                selected === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
              {selected === key && <Check size={16} className="text-blue-500" />}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3 px-6 pb-5">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition">
            Batal
          </button>
          <button
            onClick={() => { onSave(sale.id, selected); onClose(); }}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium">
            <Check size={15} /> Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================
// MAIN
// ==============================
export default function SalesTab({
  storeData, metrics, filterMonth, onFilterMonthChange,
  onAddSale, onDeleteSale, onUpdateSaleStatus
}: SalesTabProps) {
  const [newSale, setNewSale] = useState({
    date: new Date().toISOString().split('T')[0],
    invoice: '', sku: '', size: '' as any, qty: '', status: 'selesai' as SaleStatus
  });
  const [editingSale, setEditingSale] = useState<SaleItem | null>(null);

  const getAvailableStock = () => {
    if (!newSale.sku || !newSale.size) return null;
    const item = metrics.stockMap[newSale.sku];
    if (!item) return null;
    const restocked = item.restockedBySize?.[newSale.size] || 0;
    const sold = item.soldBySize?.[newSale.size] || 0;
    return restocked - sold;
  };

  const availableStock = getAvailableStock();

  const handleSkuChange = (sku: string) => {
    setNewSale({ ...newSale, sku, size: '', qty: '' });
  };

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newSale.sku || !newSale.size || !newSale.qty) return;
    if (availableStock !== null && Number(newSale.qty) > availableStock) {
      alert(`Stok ukuran ${newSale.size} hanya tersisa ${availableStock} pcs`);
      return;
    }
    onAddSale({
      date: newSale.date,
      invoice: newSale.invoice,
      sku: newSale.sku,
      size: newSale.size,
      qty: Number(newSale.qty),
      status: newSale.status,
    });
    setNewSale({ ...newSale, invoice: '', sku: '', size: '', qty: '', status: 'selesai' });
  };

  // Filter bulan
  const filteredSales = (storeData.sales || []).filter(s => {
    const d = new Date(s.date);
    const [fy, fm] = filterMonth.split('-').map(Number);
    return d.getFullYear() === fy && d.getMonth() + 1 === fm;
  });

  const totalRevenue = filteredSales
    .filter(s => s.status === 'selesai')
    .reduce((sum, sale) => {
      const item = metrics.stockMap[sale.sku];
      return sum + (item ? item.price * sale.qty : 0);
    }, 0);

  const totalAll = filteredSales.reduce((sum, sale) => {
    const item = metrics.stockMap[sale.sku];
    return sum + (item ? item.price * sale.qty : 0);
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <h2 className="text-2xl font-bold">Catat Penjualan</h2>
        <MonthFilter value={filterMonth} onChange={onFilterMonthChange} />
      </div>

      {/* Form */}
      <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Tanggal</label>
            <input required type="date" value={newSale.date}
              onChange={e => setNewSale({ ...newSale, date: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">No. Invoice</label>
            <input value={newSale.invoice}
              onChange={e => setNewSale({ ...newSale, invoice: e.target.value })}
              placeholder="INV-001"
              className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Pilih Barang</label>
            <select required value={newSale.sku} onChange={e => handleSkuChange(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white">
              <option value="" disabled>-- Pilih Produk --</option>
              {(storeData.inventory || []).map(item => (
                <option key={item.sku} value={item.sku}>{item.sku} - {item.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Ukuran</label>
            <select required value={newSale.size}
              onChange={e => setNewSale({ ...newSale, size: e.target.value as any, qty: '' })}
              disabled={!newSale.sku}
              className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-gray-100 disabled:text-gray-400">
              <option value="" disabled>-- Ukuran --</option>
              {SIZES.map(size => {
                const item = metrics.stockMap[newSale.sku];
                const restocked = item?.restockedBySize?.[size] || 0;
                const sold = item?.soldBySize?.[size] || 0;
                const remaining = restocked - sold;
                return (
                  <option key={size} value={size} disabled={remaining <= 0}>
                    {size} {remaining <= 0 ? '(Habis)' : `(Sisa: ${remaining})`}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Qty {availableStock !== null && <span className="text-green-600 normal-case font-normal">(maks: {availableStock})</span>}
            </label>
            <div className="flex space-x-2">
              <input required type="number" min="1" max={availableStock ?? undefined}
                value={newSale.qty}
                onChange={e => setNewSale({ ...newSale, qty: e.target.value })}
                placeholder="1" disabled={!newSale.size}
                className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100" />
              <button type="submit" className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition">
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase">Status:</span>
          {(Object.entries(STATUS_CONFIG) as [SaleStatus, typeof STATUS_CONFIG[SaleStatus]][]).map(([key, cfg]) => (
            <button key={key} type="button"
              onClick={() => setNewSale({ ...newSale, status: key })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition ${
                newSale.status === key
                  ? `${cfg.bg} ${cfg.color} border-current`
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}>
              {cfg.label}
            </button>
          ))}
        </div>
      </form>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-xs text-gray-500">{filteredSales.length} transaksi</span>
          <span className="text-xs font-bold text-gray-600">Total order: {formatRp(totalAll)}</span>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-xs text-gray-500">Sudah lunas</span>
          <span className="text-xs font-bold text-green-700">{formatRp(totalRevenue)}</span>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-xs text-gray-500">Belum lunas</span>
          <span className="text-xs font-bold text-yellow-700">{formatRp(totalAll - totalRevenue)}</span>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b">
              <th className="p-4 font-medium">Tanggal</th>
              <th className="p-4 font-medium">Invoice</th>
              <th className="p-4 font-medium">Produk</th>
              <th className="p-4 font-medium text-center">Ukuran</th>
              <th className="p-4 font-medium text-center">Qty</th>
              <th className="p-4 font-medium text-center">Status</th>
              <th className="p-4 font-medium text-right text-green-600">Total</th>
              <th className="p-4 font-medium text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {filteredSales.map((sale) => {
              const item = metrics.stockMap[sale.sku];
              const status = sale.status || 'selesai'; // backward compat
              const cfg = STATUS_CONFIG[status as SaleStatus];
              return (
                <tr key={sale.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">{sale.date}</td>
                  <td className="p-4 text-gray-500">{sale.invoice || '-'}</td>
                  <td className="p-4 font-medium">
                    {item ? item.name : <span className="text-red-500 line-through">{sale.sku}</span>}
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded">
                      {sale.size || '-'}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold">{sale.qty}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => setEditingSale(sale)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.color} hover:opacity-80 transition`}>
                      {cfg.label}
                    </button>
                  </td>
                  <td className="p-4 text-right font-bold text-green-600">
                    {item ? formatRp(item.price * sale.qty) : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => onDeleteSale(sale.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">Tidak ada penjualan di bulan ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Status Modal */}
      {editingSale && (
        <StatusModal
          sale={editingSale}
          itemName={metrics.stockMap[editingSale.sku]?.name || editingSale.sku}
          onClose={() => setEditingSale(null)}
          onSave={(id, status) => {
            onUpdateSaleStatus(id, status);
            setEditingSale(null);
          }}
        />
      )}
    </div>
  );
}
