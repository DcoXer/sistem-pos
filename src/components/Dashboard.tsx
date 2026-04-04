import { Download, DollarSign, TrendingUp, TrendingDown, Package, AlertTriangle, Clock, CreditCard } from 'lucide-react';
import MonthFilter from './MonthFilter';
import type { StoreData } from '../types';

const formatRp = (num: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(num);

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

// Dark theme tokens
const D = {
  bg: '#0a0a0f',
  surface: '#13131a',
  elevated: '#1a1a24',
  border: '#ffffff0d',
  borderSubtle: '#ffffff08',
  accent: '#8b5cf6',
  accentDim: '#8b5cf615',
  text: '#f1f0f5',
  muted: '#6b7280',
  success: '#10b981',
  successDim: '#10b98115',
  danger: '#ef4444',
  dangerDim: '#ef444415',
  warning: '#f59e0b',
  warningDim: '#f59e0b15',
  orange: '#f97316',
  orangeDim: '#f9731615',
};

interface DashboardTabProps {
  metrics: any;
  storeData: StoreData;
  filterMonth: string;
  onFilterMonthChange: (val: string) => void;
  handleExportData: () => void;
}

export default function DashboardTab({
  metrics, storeData, filterMonth, onFilterMonthChange, handleExportData
}: DashboardTabProps) {

  const [fy, fm] = filterMonth.split('-').map(Number);
  const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'];
  const isFnb = storeData.storeType === 'fnb';

  const inMonth = (dateStr: string, y: number, m: number) => {
    const d = new Date(dateStr);
    return d.getFullYear() === y && d.getMonth() + 1 === m;
  };

  const salesThisMonth = isFnb
    ? (storeData.fnbSales || []).filter(s => inMonth(s.date, fy, fm))
    : (storeData.sales || []).filter(s => inMonth(s.date, fy, fm));

  const expensesThisMonth = (storeData.expenses || []).filter(e => inMonth(e.date, fy, fm));

  const revenueThisMonth = isFnb
    ? (salesThisMonth as any[]).reduce((sum: number, s: any) => sum + (s.total || 0), 0)
    : (salesThisMonth as any[]).reduce((sum: number, s: any) => {
        const item = metrics.stockMap[s.sku];
        return sum + (item ? item.price * s.qty : 0);
      }, 0);

  const hppThisMonth = isFnb
    ? (salesThisMonth as any[]).reduce((sum: number, s: any) =>
        sum + (s.items || []).reduce((acc: number, si: any) => {
          const item = metrics.stockMap[si.sku];
          return acc + (item ? item.hpp * si.qty : 0);
        }, 0), 0)
    : (salesThisMonth as any[]).reduce((sum: number, s: any) => {
        const item = metrics.stockMap[s.sku];
        return sum + (item ? item.hpp * s.qty : 0);
      }, 0);

  const expenseThisMonth = expensesThisMonth.reduce((sum, e) => sum + e.amount, 0);
  const grossProfitThisMonth = revenueThisMonth - hppThisMonth;
  const netProfitThisMonth = grossProfitThisMonth - expenseThisMonth;

  const allUnpaid = isFnb ? [] : (storeData.sales || []).filter(s =>
    (s.status || 'selesai') === 'pending' || (s.status || 'selesai') === 'dp'
  );

  const totalPiutang = isFnb ? 0 : allUnpaid.reduce((sum: number, s: any) => {
    const item = metrics.stockMap[s.sku];
    const total = item ? item.price * s.qty : 0;
    const dp = s.status === 'dp' ? (s.dpAmount || 0) : 0;
    return sum + (total - dp);
  }, 0);

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(fy, fm - 1 - (5 - i));
    return { y: d.getFullYear(), m: d.getMonth() + 1, label: MONTH_NAMES[d.getMonth()].slice(0, 3) };
  });

  const chartData = last6Months.map(({ y, m, label }) => {
    const rev = isFnb
      ? (storeData.fnbSales || []).filter(s => inMonth(s.date, y, m)).reduce((sum, s) => sum + (s.total || 0), 0)
      : (storeData.sales || []).filter(s => inMonth(s.date, y, m)).reduce((sum, s) => {
          const item = metrics.stockMap[s.sku];
          return sum + (item ? item.price * s.qty : 0);
        }, 0);
    const exp = (storeData.expenses || []).filter(e => inMonth(e.date, y, m)).reduce((sum, e) => sum + e.amount, 0);
    return { label, rev, exp };
  });

  const maxChart = Math.max(...chartData.map(d => d.rev), 1);

  const skuQtyMap: Record<string, number> = {};
  if (isFnb) {
    (salesThisMonth as any[]).forEach((s: any) => {
      (s.items || []).forEach((si: any) => { skuQtyMap[si.sku] = (skuQtyMap[si.sku] || 0) + si.qty; });
    });
  } else {
    (salesThisMonth as any[]).forEach((s: any) => { skuQtyMap[s.sku] = (skuQtyMap[s.sku] || 0) + s.qty; });
  }
  const topProducts = Object.entries(skuQtyMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([sku, qty]) => ({ sku, qty, name: metrics.stockMap[sku]?.name || sku }));

  const lowStockItems: { sku: string; name: string; size: string; remaining: number }[] = [];
  if (!isFnb) {
    Object.values(metrics.stockMap).forEach((item: any) => {
      SIZES.forEach(size => {
        const restocked = item.restockedBySize?.[size] || 0;
        const sold = item.soldBySize?.[size] || 0;
        const remaining = restocked - sold;
        if (restocked > 0 && remaining <= 3) {
          lowStockItems.push({ sku: item.sku, name: item.name, size, remaining });
        }
      });
    });
    lowStockItems.sort((a, b) => a.remaining - b.remaining);
  }

  const card = (content: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, ...style }}>
      {content}
    </div>
  );

  return (
    <div className="space-y-6" style={{ color: D.text }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4"
        style={{ borderBottom: `1px solid ${D.border}` }}>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: D.text }}>Dashboard</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: D.success }} />
            <span className="text-xs" style={{ color: D.muted }}>Cloud Synced</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthFilter value={filterMonth} onChange={onFilterMonthChange} />
          <button onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: D.accentDim, color: D.accent, border: `1px solid ${D.accent}30` }}>
            <Download size={15} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: `Omzet ${MONTH_NAMES[fm-1]}`,
            value: formatRp(revenueThisMonth),
            sub: `${salesThisMonth.length} transaksi`,
            icon: DollarSign,
            color: D.success,
            dim: D.successDim,
          },
          {
            label: 'Laba Bersih',
            value: formatRp(netProfitThisMonth),
            sub: `Margin ${revenueThisMonth > 0 ? ((netProfitThisMonth / revenueThisMonth) * 100).toFixed(1) : 0}%`,
            icon: netProfitThisMonth < 0 ? TrendingDown : TrendingUp,
            color: netProfitThisMonth < 0 ? D.danger : D.accent,
            dim: netProfitThisMonth < 0 ? D.dangerDim : D.accentDim,
          },
          {
            label: 'Total Piutang',
            value: formatRp(totalPiutang),
            sub: `${allUnpaid.length} order belum lunas`,
            icon: CreditCard,
            color: D.orange,
            dim: D.orangeDim,
          },
          {
            label: 'Aset Stok',
            value: formatRp(metrics.deadStockValue),
            sub: `${metrics.totalStockPcs} pcs tersedia`,
            icon: Package,
            color: D.warning,
            dim: D.warningDim,
          },
        ].map((m, i) => (
          <div key={i} className="p-4 rounded-xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <p className="text-xs truncate" style={{ color: D.muted }}>{m.label}</p>
                <p className="text-base font-bold mt-1 truncate" style={{ color: D.text }}>{m.value}</p>
              </div>
              <div className="p-2 rounded-lg shrink-0 ml-2" style={{ background: m.dim }}>
                <m.icon size={16} style={{ color: m.color }} />
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: D.muted }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + P&L */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="p-5 rounded-xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <p className="text-sm font-semibold mb-4" style={{ color: D.text }}>Tren Omzet 6 Bulan</p>
          <div className="flex items-end gap-2 h-32">
            {chartData.map((d, i) => {
              const isActive = i === 5;
              const heightPct = Math.max((d.rev / maxChart) * 100, 3);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] truncate w-full text-center" style={{ color: D.muted }}>
                    {d.rev > 0 ? formatRp(d.rev).replace('Rp\u00a0', '').replace(/\.000$/, 'rb') : ''}
                  </span>
                  <div className="w-full flex flex-col justify-end" style={{ height: 72 }}>
                    <div
                      style={{
                        height: `${heightPct}%`,
                        background: isActive ? D.accent : `${D.accent}30`,
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: isActive ? D.accent : D.muted }}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* P&L */}
        <div className="p-5 rounded-xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <p className="text-sm font-semibold mb-4" style={{ color: D.text }}>
            Laba Rugi — {MONTH_NAMES[fm-1]} {fy}
          </p>
          <div className="space-y-2.5">
            {[
              { label: 'Omzet', value: revenueThisMonth, color: D.text },
              { label: 'HPP Terjual', value: -hppThisMonth, color: D.danger, prefix: '−' },
            ].map((row, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span style={{ color: D.muted }}>{row.label}</span>
                <span style={{ color: row.color }}>{row.prefix}{formatRp(Math.abs(row.value))}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2" style={{ borderTop: `1px solid ${D.border}` }}>
              <span className="font-semibold" style={{ color: D.text }}>Laba Kotor</span>
              <span className="font-semibold" style={{ color: D.text }}>{formatRp(grossProfitThisMonth)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: D.muted }}>Pengeluaran</span>
              <span style={{ color: D.danger }}>−{formatRp(expenseThisMonth)}</span>
            </div>
            <div className="flex justify-between text-base pt-2" style={{ borderTop: `1px solid ${D.border}` }}>
              <span className="font-bold" style={{ color: D.text }}>Laba Bersih</span>
              <span className="font-bold" style={{ color: netProfitThisMonth < 0 ? D.danger : D.success }}>
                {formatRp(netProfitThisMonth)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top produk */}
        <div className="p-5 rounded-xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <p className="text-sm font-semibold mb-4" style={{ color: D.text }}>Produk Terlaris</p>
          {topProducts.length === 0
            ? <p className="text-sm text-center py-6" style={{ color: D.muted }}>Belum ada penjualan.</p>
            : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={p.sku} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate flex-1 mr-2" style={{ color: D.muted }}>
                        <span className="mr-1.5" style={{ color: D.accent }}>#{i+1}</span>{p.name}
                      </span>
                      <span style={{ color: D.text }}>{p.qty} pcs</span>
                    </div>
                    <div className="w-full rounded-full h-1" style={{ background: `${D.accent}20` }}>
                      <div className="h-1 rounded-full" style={{
                        width: `${(p.qty / topProducts[0].qty) * 100}%`,
                        background: D.accent,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Stok menipis */}
        <div className="p-5 rounded-xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: D.text }}>
            {lowStockItems.length > 0 && <AlertTriangle size={14} style={{ color: D.warning }} />}
            Stok Menipis
          </p>
          {isFnb
            ? <p className="text-sm text-center py-6" style={{ color: D.muted }}>Tidak tersedia untuk tipe toko ini.</p>
            : lowStockItems.length === 0
              ? <p className="text-sm text-center py-6" style={{ color: D.muted }}>Semua stok aman.</p>
              : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lowStockItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <span style={{ color: D.text }}>{item.name}</span>
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: D.accentDim, color: D.accent }}>{item.size}</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: item.remaining === 0 ? D.dangerDim : D.warningDim,
                          color: item.remaining === 0 ? D.danger : D.warning,
                        }}>
                        {item.remaining === 0 ? 'Habis' : `Sisa ${item.remaining}`}
                      </span>
                    </div>
                  ))}
                </div>
              )
          }
        </div>

        {/* Piutang */}
        <div className="p-5 rounded-xl" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: D.text }}>
            <Clock size={14} style={{ color: D.orange }} />
            Piutang Belum Lunas
          </p>
          {allUnpaid.length === 0
            ? <p className="text-sm text-center py-6" style={{ color: D.muted }}>
                {isFnb ? 'Tidak tersedia untuk tipe toko ini.' : 'Tidak ada piutang.'}
              </p>
            : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allUnpaid.slice(0, 8).map((s: any) => {
                  const item = metrics.stockMap[s.sku];
                  const total = item ? item.price * s.qty : 0;
                  const dp = s.status === 'dp' ? (s.dpAmount || 0) : 0;
                  const sisa = total - dp;
                  return (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="truncate" style={{ color: D.text }}>{item?.name || s.sku} {s.size}</p>
                        <p className="text-xs" style={{ color: D.muted }}>{s.invoice || s.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold" style={{ color: D.orange }}>{formatRp(sisa)}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: s.status === 'dp' ? D.accentDim : D.warningDim,
                            color: s.status === 'dp' ? D.accent : D.warning,
                          }}>
                          {s.status === 'dp' ? 'DP' : 'PO'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {allUnpaid.length > 8 && (
                  <p className="text-xs text-center pt-1" style={{ color: D.muted }}>
                    +{allUnpaid.length - 8} lainnya
                  </p>
                )}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
