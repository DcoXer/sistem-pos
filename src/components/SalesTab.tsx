import React, { useState, useMemo } from 'react';
import { Plus, Trash2, X, Check, Search, ImageOff } from 'lucide-react';
import type { StoreData, SaleItem, SaleStatus } from '../types';
import { SIZES } from '../types';
import MonthFilter from './MonthFilter';
import Pagination from './Pagination';

// Dark theme tokens
const D = {
  surface: '#13131a', elevated: '#1a1a24', border: '#ffffff0d',
  accent: '#8b5cf6', accentDim: '#8b5cf615',
  text: '#f1f0f5', muted: '#6b7280',
  success: '#10b981', successDim: '#10b98115',
  danger: '#ef4444', dangerDim: '#ef444415',
  warning: '#f59e0b', warningDim: '#f59e0b15',
  input: '#1a1a24',
};

const inputStyle = (extra?: object) => ({
  background: '#1a1a24',
  border: '1px solid #ffffff12',
  color: '#f1f0f5',
  borderRadius: 10,
  ...extra,
});


const formatRp = (num: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(num);

const STATUS_CONFIG: Record<SaleStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending (PO)', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  dp:      { label: 'DP',          color: 'text-[var(--accent)] text-700',   bg: 'bg-blue-100'   },
  selesai: { label: 'Selesai',     color: 'text-green-700',  bg: 'bg-green-100'  },
};

interface SalesTabProps {
  storeData: StoreData;
  metrics: any;
  filterMonth: string;
  onFilterMonthChange: (val: string) => void;
  onAddSale: (sale: Omit<SaleItem, 'id'>) => void;
  onDeleteSale: (id: string) => void;
  onUpdateSaleStatus: (id: string, status: SaleStatus, dpAmount?: number) => void;
}

// ==============================
// STATUS MODAL
// ==============================
function StatusModal({ sale, totalAmount, itemName, onClose, onSave }: {
  sale: SaleItem;
  totalAmount: number;
  itemName: string;
  onClose: () => void;
  onSave: (id: string, status: SaleStatus, dpAmount?: number) => void;
}) {
  const [selected, setSelected] = useState<SaleStatus>(sale.status || 'selesai');
  const [dpAmount, setDpAmount] = useState(String(sale.dpAmount || ''));
  const sisa = totalAmount - (Number(dpAmount) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="font-bold text-base">Ubah Status</h3>
            <p className="text-xs ">{sale.invoice || sale.id} — {itemName} {sale.size}</p>
          </div>
          <button onClick={onClose} className=" hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-3">
          {(Object.entries(STATUS_CONFIG) as [SaleStatus, typeof STATUS_CONFIG[SaleStatus]][]).map(([key, cfg]) => (
            <button key={key} type="button" onClick={() => setSelected(key)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition ${
                selected === key ? 'border-b border-[var(--border)]lue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
              }`}>
              <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
              {selected === key && <Check size={16} className="text-[var(--accent)] text-500" />}
            </button>
          ))}
          {selected === 'dp' && (
            <div className="space-y-2 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold  uppercase">Nominal DP Masuk (Rp)</label>
                <input type="number" min="0" max={totalAmount} value={dpAmount}
                  onChange={e => setDpAmount(e.target.value)} placeholder="0"
                  className="w-full text-sm" style={{ ...inputStyle(), padding: "8px 12px" }} />
              </div>
              <div className="rounded-lg px-3 py-2 space-y-1 text-xs" style={{ background: D.accentDim }}>
                <div className="flex justify-between "><span>Total order</span><span className="font-medium">{formatRp(totalAmount)}</span></div>
                <div className="flex justify-between text-[var(--accent)] text-700"><span>DP masuk</span><span className="font-bold">{formatRp(Number(dpAmount) || 0)}</span></div>
                <div className={`flex justify-between font-bold border-t border-b border-[var(--border)]lue-100 pt-1 ${sisa < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  <span>Sisa tagihan</span><span>{formatRp(sisa < 0 ? 0 : sisa)}</span>
                </div>
              </div>
              {sisa < 0 && <p className="text-xs text-red-500">DP tidak boleh melebihi total order</p>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 ">Batal</button>
          <button
            onClick={() => { onSave(sale.id, selected, selected === 'dp' ? Number(dpAmount) || 0 : undefined); onClose(); }}
            disabled={selected === 'dp' && Number(dpAmount) > totalAmount}
            className="px-5 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-dim)] transition flex items-center gap-2 font-medium disabled:opacity-40">
            <Check size={15} /> Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================
// SALE CARD
// ==============================
function SaleCard({ sale, item, onDelete, onEditStatus }: {
  sale: SaleItem;
  item: any;
  onDelete: () => void;
  onEditStatus: () => void;
}) {
  const status = sale.status || 'selesai';
  const cfg = STATUS_CONFIG[status as SaleStatus];
  const total = item ? item.price * sale.qty : 0;
  const dp = status === 'dp' ? (sale.dpAmount || 0) : status === 'selesai' ? total : 0;
  const sisa = status === 'selesai' ? 0 : status === 'pending' ? total : total - dp;

  return (
    <div className="overflow-hidden flex flex-col" style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12 }}>
      {/* Gambar produk */}
      {item?.imageUrl
        ? <img src={item.imageUrl} alt={item?.name} className="w-full h-32 object-cover" />
        : <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-300"><ImageOff size={24} /></div>
      }

      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-bold text-sm leading-tight">
              {item ? item.name : <span className="text-red-400 line-through">{sale.sku}</span>}
            </h3>
            <span className="bg-transparant text-[var(--accent)] text-700 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">{sale.size}</span>
          </div>
          <p className="text-xs font-mono">{sale.invoice || '-'} · {sale.date}</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-green-800">{formatRp(total)}</span>
          <span className="text-xs ">×{sale.qty} pcs</span>
        </div>

        {/* DP / sisa */}
        {status !== 'selesai' && (
          <div className="text-xs space-y-0.5">
            {dp > 0 && <p className="text-[var(--accent)] text-600">DP: {formatRp(dp)}</p>}
            {sisa > 0 && <p className="text-red-500 font-medium">Sisa: {formatRp(sisa)}</p>}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <button onClick={onEditStatus}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.color} hover:opacity-80 transition`}>
            {cfg.label}
          </button>
          <button onClick={onDelete} className="text-red-400 hover:text-red-600 transition p-1">
            <Trash2 size={14} />
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
    invoice: '', sku: '', size: '' as any, qty: '',
    status: 'selesai' as SaleStatus, dpAmount: '',
  });
  const [editingSale, setEditingSale] = useState<SaleItem | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const PAGE_SIZE = 10;

  const getAvailableStock = () => {
    if (!newSale.sku || !newSale.size) return null;
    const item = metrics.stockMap[newSale.sku];
    if (!item) return null;
    return (item.restockedBySize?.[newSale.size] || 0) - (item.soldBySize?.[newSale.size] || 0);
  };

  const availableStock = getAvailableStock();

  const newSaleTotal = (() => {
    if (!newSale.sku || !newSale.qty) return 0;
    const item = metrics.stockMap[newSale.sku];
    return item ? item.price * Number(newSale.qty) : 0;
  })();

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newSale.sku || !newSale.size || !newSale.qty) return;
    if (availableStock !== null && Number(newSale.qty) > availableStock) {
      alert(`Stok ukuran ${newSale.size} hanya tersisa ${availableStock} pcs`);
      return;
    }
    onAddSale({
      date: newSale.date, invoice: newSale.invoice, sku: newSale.sku,
      size: newSale.size, qty: Number(newSale.qty), status: newSale.status,
      dpAmount: newSale.status === 'dp' ? Number(newSale.dpAmount) || 0 : undefined,
    });
    setNewSale({ ...newSale, invoice: '', sku: '', size: '', qty: '', status: 'selesai', dpAmount: '' });
  };

  const handleSearchChange = (q: string) => { setSearch(q); setPage(1); };
  const handleDateChange = (d: string) => { setFilterDate(d); setPage(1); };

  // Filter bulan
  const filteredSales = useMemo(() => {
    const [fy, fm] = filterMonth.split('-').map(Number);
    const q = search.toLowerCase();
    return (storeData.sales || [])
      .filter(s => {
        const d = new Date(s.date);
        const inMonth = d.getFullYear() === fy && d.getMonth() + 1 === fm;
        if (!inMonth) return false;
        if (filterDate && s.date !== filterDate) return false;
        if (!q) return true;
        const item = metrics.stockMap[s.sku];
        return s.sku.toLowerCase().includes(q) || (item?.name || '').toLowerCase().includes(q) || (s.invoice || '').toLowerCase().includes(q);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [storeData.sales, filterMonth, filterDate, search, metrics.stockMap]);

  const totalPages = Math.ceil(filteredSales.length / PAGE_SIZE);
  const paginatedSales = filteredSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalLunas = filteredSales.filter(s => (s.status || 'selesai') === 'selesai')
    .reduce((sum, s) => { const i = metrics.stockMap[s.sku]; return sum + (i ? i.price * s.qty : 0); }, 0);
  const totalDP = filteredSales.filter(s => (s.status || 'selesai') === 'dp')
    .reduce((sum, s) => sum + (s.dpAmount || 0), 0);
  const totalAll = filteredSales.reduce((sum, s) => { const i = metrics.stockMap[s.sku]; return sum + (i ? i.price * s.qty : 0); }, 0);

  // Pilihan SKU yang sudah ada di inventory
  const inventoryOptions = useMemo(() => storeData.inventory || [], [storeData.inventory]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <h2 className="text-xl font-semibold" style={{ color: D.text }}>Catat Penjualan</h2>
        <div className="flex flex-wrap items-center gap-2">
          <MonthFilter value={filterMonth} onChange={v => { onFilterMonthChange(v); setFilterDate(''); setPage(1); }} />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDate}
              onChange={e => handleDateChange(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
            {filterDate && (
              <button onClick={() => handleDateChange('')}
                className="text-xs  hover:text-gray-600 transition">
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleAdd} className="p-5space-y-4" style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12 }}>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold  uppercase">Tanggal</label>
            <input required type="date" value={newSale.date}
              onChange={e => setNewSale({ ...newSale, date: e.target.value })}
              className="w-full text-sm" style={{ ...inputStyle(), padding: "8px 12px" }} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold  uppercase">No. Invoice</label>
            <input value={newSale.invoice} onChange={e => setNewSale({ ...newSale, invoice: e.target.value })}
              placeholder="INV-001"
              className="w-full text-sm" style={{ ...inputStyle(), padding: "8px 12px" }} />
          </div>

          {/* Pilih produk — dengan gambar */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold  uppercase">Pilih Barang</label>
            <select required value={newSale.sku}
              onChange={e => setNewSale({ ...newSale, sku: e.target.value, size: '', qty: '' })}
              className="w-full text-sm" style={{ ...inputStyle(), padding: "8px 12px" }}>
              <option value="" disabled>-- Pilih Produk --</option>
              {inventoryOptions.map((item: any) => (
                <option key={item.sku} value={item.sku}>{item.sku} - {item.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold  uppercase">Ukuran</label>
            <select required value={newSale.size}
              onChange={e => setNewSale({ ...newSale, size: e.target.value as any, qty: '' })}
              disabled={!newSale.sku}
              className="w-full text-sm" style={{ ...inputStyle(), padding: "8px 12px" }}>
              <option value="" disabled>-- Ukuran --</option>
              {SIZES.map(size => {
                const item = metrics.stockMap[newSale.sku];
                const remaining = (item?.restockedBySize?.[size] || 0) - (item?.soldBySize?.[size] || 0);
                return (
                  <option key={size} value={size} disabled={remaining <= 0}>
                    {size} {remaining <= 0 ? '(Habis)' : `(Sisa: ${remaining})`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold  uppercase">
              Qty {availableStock !== null && <span className="text-green-600 normal-case font-normal">(maks: {availableStock})</span>}
            </label>
            <div className="flex gap-2">
              <input required type="number" min="1" max={availableStock ?? undefined}
                value={newSale.qty} onChange={e => setNewSale({ ...newSale, qty: e.target.value })}
                placeholder="1" disabled={!newSale.size}
                className="w-full text-sm" style={{ ...inputStyle(), padding: "8px 12px" }} />
              <button type="submit" className="p-2 rounded-lg transition" style={{ background: D.success, color: "#fff" }}>
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Preview produk yang dipilih */}
        {newSale.sku && metrics.stockMap[newSale.sku]?.imageUrl && (
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2">
            <img src={metrics.stockMap[newSale.sku].imageUrl} alt="" className="w-12 h-12 object-cover rounded-lg" />
            <div>
              <p className="text-sm font-semibold">{metrics.stockMap[newSale.sku].name}</p>
              <p className="text-xs ">{formatRp(metrics.stockMap[newSale.sku].price)} / pcs</p>
            </div>
          </div>
        )}

        {/* Status + DP */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold  uppercase">Status:</span>
            {(Object.entries(STATUS_CONFIG) as [SaleStatus, typeof STATUS_CONFIG[SaleStatus]][]).map(([key, cfg]) => (
              <button key={key} type="button"
                onClick={() => setNewSale({ ...newSale, status: key, dpAmount: '' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition ${
                  newSale.status === key ? `${cfg.bg} ${cfg.color} border-current` : 'border-gray-200  hover:border-gray-300'
                }`}>
                {cfg.label}
              </button>
            ))}
          </div>
          {newSale.status === 'dp' && (
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold  uppercase">Nominal DP Masuk (Rp)</label>
                <input type="number" min="0" max={newSaleTotal || undefined}
                  value={newSale.dpAmount} onChange={e => setNewSale({ ...newSale, dpAmount: e.target.value })}
                  placeholder="0"
                  className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none w-40" />
              </div>
              {newSale.dpAmount && newSaleTotal > 0 && (
                <div className="text-xs  pb-2">
                  Sisa: <span className="font-bold text-gray-700">{formatRp(newSaleTotal - Number(newSale.dpAmount))}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl px-4 py-3" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <p className="text-xs ">Total Order</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: D.text }}>{formatRp(totalAll)}</p>
        </div>
        <div className="rounded-xl px-4 py-3" style={{ background: D.successDim, border: `1px solid ${D.success}20` }}>
          <p className="text-xs ">Sudah Lunas</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: D.success }}>{formatRp(totalLunas)}</p>
        </div>
        <div className="border border-b border-[var(--border)]lue-100 rounded-xl px-4 py-3">
          <p className="text-xs ">DP Masuk</p>
          <p className="text-sm font-bold text-[var(--accent)] text-700 mt-0.5">{formatRp(totalDP)}</p>
        </div>
        <div className="rounded-xl px-4 py-3" style={{ background: D.warningDim, border: `1px solid ${D.warning}20` }}>
          <p className="text-xs ">Belum Lunas</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: D.warning }}>{formatRp(totalAll - totalLunas - totalDP)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 " />
        <input value={search} onChange={e => handleSearchChange(e.target.value)}
          placeholder="Cari SKU, nama produk, atau invoice..."
          className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
      </div>

      {/* Card grid */}
      {filteredSales.length === 0
        ? <div className="text-center py-16 ">
            {search ? `Tidak ada transaksi dengan kata kunci "${search}"` : 'Tidak ada penjualan di bulan ini.'}
          </div>
        : (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {paginatedSales.map(sale => {
              const item = metrics.stockMap[sale.sku];
              return (
                <SaleCard
                  key={sale.id}
                  sale={sale}
                  item={item}
                  onDelete={() => onDeleteSale(sale.id)}
                  onEditStatus={() => setEditingSale(sale)}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs ">{filteredSales.length} transaksi · halaman {page} dari {totalPages}</p>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
          </>
        )
      }

      {/* Status Modal */}
      {editingSale && (
        <StatusModal
          sale={editingSale}
          totalAmount={(() => { const i = metrics.stockMap[editingSale.sku]; return i ? i.price * editingSale.qty : 0; })()}
          itemName={metrics.stockMap[editingSale.sku]?.name || editingSale.sku}
          onClose={() => setEditingSale(null)}
          onSave={(id, status, dpAmount) => { onUpdateSaleStatus(id, status, dpAmount); setEditingSale(null); }}
        />
      )}
    </div>
  );
}
