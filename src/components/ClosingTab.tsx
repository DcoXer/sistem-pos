import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag, TrendingUp, TrendingDown, CreditCard, Receipt, Package } from 'lucide-react';
import type { StoreData } from '../types';

const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
const fmtDate = (d: Date) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const DAYS = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

const D = {
  surface: '#13131a', elevated: '#1a1a24', border: '#ffffff0d',
  accent: '#8b5cf6', accentDim: '#8b5cf615',
  text: '#f1f0f5', muted: '#6b7280',
  success: '#10b981', successDim: '#10b98115',
  danger: '#ef4444', dangerDim: '#ef444415',
  warning: '#f59e0b', warningDim: '#f59e0b15',
  orange: '#f97316', orangeDim: '#f9731615',
};

interface ClosingTabProps {
  storeData: StoreData;
  metrics: any;
}

export default function ClosingTab({ storeData, metrics }: ClosingTabProps) {
  const [selectedDate, setSelectedDate] = useState(() => toYMD(new Date()));
  const isFnb = storeData.storeType === 'fnb';

  const prevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    setSelectedDate(toYMD(new Date(y, m - 1, d - 1)));
  };

  const nextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    if (toYMD(next) <= toYMD(new Date())) setSelectedDate(toYMD(next));
  };

  const isToday = selectedDate === toYMD(new Date());
  const [dy, dm, dd] = selectedDate.split('-').map(Number);
  const dateObj = new Date(dy, dm - 1, dd);
  const dayLabel = `${DAYS[dateObj.getDay()]}, ${fmtDate(dateObj)}`;

  const salesToday = useMemo(() =>
    isFnb
      ? (storeData.fnbSales || []).filter(s => s.date === selectedDate)
      : (storeData.sales || []).filter(s => s.date === selectedDate),
    [storeData.sales, storeData.fnbSales, selectedDate, isFnb]
  );

  const expensesToday = useMemo(() =>
    (storeData.expenses || []).filter(e => e.date === selectedDate),
    [storeData.expenses, selectedDate]
  );

  const omzetToday = isFnb
    ? (salesToday as any[]).reduce((sum: number, s: any) => sum + (s.total || 0), 0)
    : (salesToday as any[]).filter((s: any) => (s.status || 'selesai') === 'selesai')
        .reduce((sum: number, s: any) => { const i = metrics.stockMap[s.sku]; return sum + (i ? i.price * s.qty : 0); }, 0);

  const totalOrderToday = isFnb ? omzetToday
    : (salesToday as any[]).reduce((sum: number, s: any) => { const i = metrics.stockMap[s.sku]; return sum + (i ? i.price * s.qty : 0); }, 0);

  const dpToday = isFnb ? 0
    : (salesToday as any[]).filter((s: any) => s.status === 'dp').reduce((sum: number, s: any) => sum + (s.dpAmount || 0), 0);

  const hppToday = isFnb
    ? (salesToday as any[]).reduce((sum: number, s: any) =>
        sum + (s.items || []).reduce((acc: number, si: any) => { const i = metrics.stockMap[si.sku]; return acc + (i ? i.hpp * si.qty : 0); }, 0), 0)
    : (salesToday as any[]).filter((s: any) => (s.status || 'selesai') === 'selesai')
        .reduce((sum: number, s: any) => { const i = metrics.stockMap[s.sku]; return sum + (i ? i.hpp * s.qty : 0); }, 0);

  const expenseToday = expensesToday.reduce((sum, e) => sum + e.amount, 0);
  const grossToday = omzetToday - hppToday;
  const netToday = grossToday - expenseToday;

  const qtyToday = isFnb
    ? (salesToday as any[]).reduce((sum: number, s: any) =>
        sum + (s.items || []).reduce((acc: number, si: any) => acc + si.qty, 0), 0)
    : (salesToday as any[]).filter((s: any) => (s.status || 'selesai') === 'selesai')
        .reduce((sum: number, s: any) => sum + s.qty, 0);

  const productSummary = useMemo(() => {
    const map: Record<string, { name: string; imageUrl?: string | null; qty: number; omzet: number; sizes: Record<string, number> }> = {};
    if (isFnb) {
      (salesToday as any[]).forEach((s: any) => {
        (s.items || []).forEach((si: any) => {
          const item = metrics.stockMap[si.sku];
          if (!map[si.sku]) map[si.sku] = { name: item?.name || si.sku, imageUrl: item?.imageUrl, qty: 0, omzet: 0, sizes: {} };
          map[si.sku].qty += si.qty;
          map[si.sku].omzet += item ? item.price * si.qty : 0;
        });
      });
    } else {
      (salesToday as any[]).filter((s: any) => (s.status || 'selesai') === 'selesai').forEach((s: any) => {
        const item = metrics.stockMap[s.sku];
        if (!map[s.sku]) map[s.sku] = { name: item?.name || s.sku, imageUrl: item?.imageUrl, qty: 0, omzet: 0, sizes: {} };
        map[s.sku].qty += s.qty;
        map[s.sku].omzet += item ? item.price * s.qty : 0;
        map[s.sku].sizes[s.size] = (map[s.sku].sizes[s.size] || 0) + s.qty;
      });
    }
    return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty);
  }, [salesToday, metrics.stockMap, isFnb]);

  const piutangToday = isFnb ? [] : (salesToday as any[]).filter((s: any) => (s.status || 'selesai') !== 'selesai');

  const btnStyle = { background: D.elevated, border: `1px solid ${D.border}`, color: D.muted, padding: '7px', borderRadius: 8, cursor: 'pointer', display: 'flex' };

  return (
    <div className="space-y-6" style={{ color: D.text }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
        style={{ borderBottom: `1px solid ${D.border}` }}>
        <div>
          <h2 className="text-xl font-semibold">Rekap Closing Harian</h2>
          <p className="text-xs mt-0.5" style={{ color: D.muted }}>Ringkasan aktivitas toko per hari</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevDay} style={btnStyle}><ChevronLeft size={15} /></button>
          <div className="px-4 py-2 rounded-lg text-center min-w-[180px]"
            style={{ background: D.elevated, border: `1px solid ${D.border}` }}>
            <p className="text-sm font-semibold" style={{ color: D.text }}>{dayLabel}</p>
            {isToday && <p className="text-[10px]" style={{ color: D.accent }}>Hari ini</p>}
          </div>
          <button onClick={nextDay} disabled={isToday}
            style={{ ...btnStyle, opacity: isToday ? 0.3 : 1, cursor: isToday ? 'not-allowed' : 'pointer' }}>
            <ChevronRight size={15} />
          </button>
          {!isToday && (
            <button onClick={() => setSelectedDate(toYMD(new Date()))}
              className="text-xs font-medium px-3 py-2 rounded-lg"
              style={{ color: D.accent, background: D.accentDim }}>
              Hari Ini
            </button>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Omzet Lunas', value: formatRp(omzetToday), sub: `${qtyToday} pcs terjual`, icon: TrendingUp, color: D.success, dim: D.successDim },
          { label: 'Laba Bersih', value: formatRp(netToday), sub: `Margin ${omzetToday > 0 ? ((netToday/omzetToday)*100).toFixed(1) : 0}%`, icon: netToday < 0 ? TrendingDown : TrendingUp, color: netToday < 0 ? D.danger : D.accent, dim: netToday < 0 ? D.dangerDim : D.accentDim },
          { label: 'Pengeluaran', value: formatRp(expenseToday), sub: `${expensesToday.length} item`, icon: Receipt, color: D.danger, dim: D.dangerDim },
          { label: 'Piutang Baru', value: formatRp(piutangToday.reduce((sum: number, s: any) => { const i = metrics.stockMap[s.sku]; const total = i ? i.price * s.qty : 0; return sum + (total - (s.dpAmount || 0)); }, 0)), sub: `${piutangToday.length} order belum lunas`, icon: CreditCard, color: D.orange, dim: D.orangeDim },
        ].map((m, i) => (
          <div key={i} className="p-4 rounded-xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <p className="text-xs" style={{ color: D.muted }}>{m.label}</p>
                <p className="text-base font-bold mt-1 truncate" style={{ color: D.text }}>{m.value}</p>
              </div>
              <div className="p-2 rounded-lg shrink-0 ml-2" style={{ background: m.dim }}>
                <m.icon size={15} style={{ color: m.color }} />
              </div>
            </div>
            <p className="text-xs mt-1.5" style={{ color: D.muted }}>{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* P&L */}
        <div className="p-5 rounded-xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <p className="text-sm font-semibold mb-4" style={{ color: D.text }}>Rincian Laba Rugi</p>
          {salesToday.length === 0 && expensesToday.length === 0
            ? <p className="text-sm text-center py-6" style={{ color: D.muted }}>Tidak ada aktivitas hari ini.</p>
            : (
              <div className="space-y-2.5">
                {[
                  { label: 'Total Order Masuk', value: totalOrderToday, color: D.text },
                  { label: 'Omzet Lunas', value: omzetToday, color: D.success },
                  ...(dpToday > 0 ? [{ label: 'DP Masuk', value: dpToday, color: D.accent }] : []),
                  { label: 'HPP Terjual', value: hppToday, color: D.danger, prefix: '−' },
                ].map((row: any, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span style={{ color: D.muted }}>{row.label}</span>
                    <span style={{ color: row.color }}>{row.prefix}{formatRp(row.prefix ? Math.abs(row.value) : row.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2" style={{ borderTop: `1px solid ${D.border}` }}>
                  <span className="font-semibold" style={{ color: D.text }}>Laba Kotor</span>
                  <span className="font-semibold" style={{ color: D.text }}>{formatRp(grossToday)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: D.muted }}>Pengeluaran</span>
                  <span style={{ color: D.danger }}>−{formatRp(expenseToday)}</span>
                </div>
                <div className="flex justify-between text-base pt-2" style={{ borderTop: `1px solid ${D.border}` }}>
                  <span className="font-bold" style={{ color: D.text }}>Laba Bersih</span>
                  <span className="font-bold" style={{ color: netToday < 0 ? D.danger : D.success }}>{formatRp(netToday)}</span>
                </div>
              </div>
            )
          }
        </div>

        {/* Produk terjual */}
        <div className="p-5 rounded-xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: D.text }}>
            <Package size={14} style={{ color: D.accent }} /> Produk Terjual
          </p>
          {productSummary.length === 0
            ? <p className="text-sm text-center py-6" style={{ color: D.muted }}>Belum ada penjualan lunas.</p>
            : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {productSummary.map(([sku, data]) => (
                  <div key={sku} className="flex items-center gap-3">
                    {data.imageUrl
                      ? <img src={data.imageUrl} alt={data.name} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                      : <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
                          style={{ background: D.elevated }}>
                          <ShoppingBag size={14} style={{ color: D.muted }} />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: D.text }}>{data.name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {Object.entries(data.sizes).map(([size, qty]) => (
                          <span key={size} className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: D.accentDim, color: D.accent }}>
                            {size}: {qty}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: D.text }}>{data.qty} pcs</p>
                      <p className="text-xs" style={{ color: D.success }}>{formatRp(data.omzet)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* Pengeluaran */}
      {expensesToday.length > 0 && (
        <div className="p-5 rounded-xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: D.text }}>
            <Receipt size={14} style={{ color: D.danger }} /> Pengeluaran Hari Ini
          </p>
          <div className="space-y-2">
            {expensesToday.map(e => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div>
                  <span style={{ color: D.text }}>{e.desc}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{ background: D.elevated, color: D.muted }}>{e.category}</span>
                </div>
                <span className="font-bold" style={{ color: D.danger }}>{formatRp(e.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2" style={{ borderTop: `1px solid ${D.border}` }}>
              <span className="font-bold" style={{ color: D.text }}>Total</span>
              <span className="font-bold" style={{ color: D.danger }}>{formatRp(expenseToday)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Piutang */}
      {piutangToday.length > 0 && (
        <div className="p-5 rounded-xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: D.text }}>
            <CreditCard size={14} style={{ color: D.orange }} /> Piutang Hari Ini
          </p>
          <div className="space-y-2">
            {piutangToday.map((s: any) => {
              const item = metrics.stockMap[s.sku];
              const total = item ? item.price * s.qty : 0;
              const dp = s.status === 'dp' ? (s.dpAmount || 0) : 0;
              const sisa = total - dp;
              return (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span style={{ color: D.text }}>{item?.name || s.sku}</span>
                    <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: D.accentDim, color: D.accent }}>{s.size}</span>
                    <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: s.status === 'dp' ? D.accentDim : D.warningDim, color: s.status === 'dp' ? D.accent : D.warning }}>
                      {s.status === 'dp' ? 'DP' : 'Pending'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: D.orange }}>{formatRp(sisa)}</p>
                    {dp > 0 && <p className="text-[10px]" style={{ color: D.muted }}>DP: {formatRp(dp)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
