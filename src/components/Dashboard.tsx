import { Download, DollarSign, TrendingUp, TrendingDown, Box, Package, AlertTriangle, Clock, CreditCard } from 'lucide-react';
import MonthFilter from './MonthFilter';
import type { StoreData, SaleStatus } from '../types';

const formatRp = (num: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(num);

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

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

  const inMonth = (dateStr: string, y: number, m: number) => {
    const d = new Date(dateStr);
    return d.getFullYear() === y && d.getMonth() + 1 === m;
  };

  // ==============================
  // METRIC BULAN INI
  // ==============================
  const salesThisMonth = (storeData.sales || []).filter(s => inMonth(s.date, fy, fm));
  const expensesThisMonth = (storeData.expenses || []).filter(e => inMonth(e.date, fy, fm));

  const revenueThisMonth = salesThisMonth.reduce((sum, s) => {
    const item = metrics.stockMap[s.sku];
    return sum + (item ? item.price * s.qty : 0);
  }, 0);

  const hppThisMonth = salesThisMonth.reduce((sum, s) => {
    const item = metrics.stockMap[s.sku];
    return sum + (item ? item.hpp * s.qty : 0);
  }, 0);

  const expenseThisMonth = expensesThisMonth.reduce((sum, e) => sum + e.amount, 0);
  const grossProfitThisMonth = revenueThisMonth - hppThisMonth;
  const netProfitThisMonth = grossProfitThisMonth - expenseThisMonth;

  // ==============================
  // PIUTANG (pending + dp)
  // ==============================
  const allUnpaid = (storeData.sales || []).filter(s =>
    (s.status || 'selesai') === 'pending' || (s.status || 'selesai') === 'dp'
  );

  const totalPiutang = allUnpaid.reduce((sum, s) => {
    const item = metrics.stockMap[s.sku];
    const total = item ? item.price * s.qty : 0;
    const dp = s.status === 'dp' ? (s.dpAmount || 0) : 0;
    return sum + (total - dp);
  }, 0);

  const piutangThisMonth = salesThisMonth.filter(s =>
    (s.status || 'selesai') !== 'selesai'
  );

  // ==============================
  // GRAFIK OMZET 6 BULAN TERAKHIR
  // ==============================
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(fy, fm - 1 - (5 - i));
    return { y: d.getFullYear(), m: d.getMonth() + 1, label: MONTH_NAMES[d.getMonth()].slice(0, 3) };
  });

  const chartData = last6Months.map(({ y, m, label }) => {
    const rev = (storeData.sales || [])
      .filter(s => inMonth(s.date, y, m))
      .reduce((sum, s) => {
        const item = metrics.stockMap[s.sku];
        return sum + (item ? item.price * s.qty : 0);
      }, 0);
    const exp = (storeData.expenses || [])
      .filter(e => inMonth(e.date, y, m))
      .reduce((sum, e) => sum + e.amount, 0);
    return { label, rev, exp, profit: rev - exp };
  });

  const maxChart = Math.max(...chartData.map(d => d.rev), 1);

  // ==============================
  // PRODUK TERLARIS BULAN INI
  // ==============================
  const skuQtyMap: Record<string, number> = {};
  salesThisMonth.forEach(s => {
    skuQtyMap[s.sku] = (skuQtyMap[s.sku] || 0) + s.qty;
  });
  const topProducts = Object.entries(skuQtyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sku, qty]) => ({ sku, qty, name: metrics.stockMap[sku]?.name || sku }));

  // ==============================
  // STOK MENIPIS (sisa ≤ 3)
  // ==============================
  const lowStockItems: { sku: string; name: string; size: string; remaining: number }[] = [];
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Laporan Eksekutif</h2>
          <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold mt-2">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Cloud Synced
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthFilter value={filterMonth} onChange={onFilterMonthChange} />
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm text-sm"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500">Omzet {MONTH_NAMES[fm-1]}</p>
              <h3 className="text-xl font-bold mt-1 text-gray-800">{formatRp(revenueThisMonth)}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-green-100 text-green-600"><DollarSign size={20} /></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{salesThisMonth.length} transaksi</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500">Laba Bersih {MONTH_NAMES[fm-1]}</p>
              <h3 className={`text-xl font-bold mt-1 ${netProfitThisMonth < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {formatRp(netProfitThisMonth)}
              </h3>
            </div>
            <div className={`p-2.5 rounded-lg ${netProfitThisMonth < 0 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {netProfitThisMonth < 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Margin {revenueThisMonth > 0 ? ((netProfitThisMonth / revenueThisMonth) * 100).toFixed(1) : 0}%</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Piutang</p>
              <h3 className="text-xl font-bold mt-1 text-orange-600">{formatRp(totalPiutang)}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-orange-100 text-orange-600"><CreditCard size={20} /></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{allUnpaid.length} order belum lunas</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500">Aset Stok (Modal)</p>
              <h3 className="text-xl font-bold mt-1 text-gray-800">{formatRp(metrics.deadStockValue)}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-100 text-purple-600"><Package size={20} /></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{metrics.totalStockPcs} pcs tersedia</p>
        </div>
      </div>

      {/* Grafik + P&L */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Grafik omzet 6 bulan */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-base mb-4">Tren Omzet 6 Bulan</h3>
          <div className="flex items-end gap-2 h-36">
            {chartData.map((d, i) => {
              const isActive = i === 5;
              const heightPct = maxChart > 0 ? (d.rev / maxChart) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-400 truncate w-full text-center">
                    {d.rev > 0 ? formatRp(d.rev).replace('Rp\u00a0', '').replace('.000', 'rb') : ''}
                  </span>
                  <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                    <div
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      className={`w-full rounded-t-md transition-all ${isActive ? 'bg-blue-500' : 'bg-blue-200'}`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rincian P&L */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-base mb-4">Rincian Laba Rugi — {MONTH_NAMES[fm-1]} {fy}</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Omzet</span>
              <span className="font-medium">{formatRp(revenueThisMonth)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">HPP Terjual</span>
              <span className="font-medium text-red-500">− {formatRp(hppThisMonth)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-semibold text-gray-700">Laba Kotor</span>
              <span className="font-semibold">{formatRp(grossProfitThisMonth)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pengeluaran Operasional</span>
              <span className="font-medium text-red-500">− {formatRp(expenseThisMonth)}</span>
            </div>
            <div className="flex justify-between text-base border-t pt-2">
              <span className="font-bold text-gray-800">Laba Bersih</span>
              <span className={`font-bold ${netProfitThisMonth < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatRp(netProfitThisMonth)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Produk terlaris + Stok menipis + Piutang */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Produk terlaris */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-base mb-4">Produk Terlaris — {MONTH_NAMES[fm-1]}</h3>
          {topProducts.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">Belum ada penjualan bulan ini.</p>
            : (
              <div className="space-y-3">
                {topProducts.map((p, i) => {
                  const maxQty = topProducts[0].qty;
                  return (
                    <div key={p.sku} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700 truncate flex-1 mr-2">
                          <span className="text-gray-400 mr-1">#{i+1}</span>{p.name}
                        </span>
                        <span className="text-gray-500 shrink-0">{p.qty} pcs</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-400 h-1.5 rounded-full"
                          style={{ width: `${(p.qty / maxQty) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>

        {/* Stok menipis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            {lowStockItems.length > 0 && <AlertTriangle size={16} className="text-yellow-500" />}
            Stok Menipis
          </h3>
          {lowStockItems.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">Semua stok masih aman.</p>
            : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lowStockItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-700">{item.name}</span>
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded">{item.size}</span>
                    </div>
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                      item.remaining === 0 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.remaining === 0 ? 'Habis' : `Sisa ${item.remaining}`}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Piutang belum lunas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Clock size={16} className="text-orange-500" />
            Piutang Belum Lunas
          </h3>
          {allUnpaid.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">Tidak ada piutang.</p>
            : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allUnpaid.slice(0, 8).map((s) => {
                  const item = metrics.stockMap[s.sku];
                  const total = item ? item.price * s.qty : 0;
                  const dp = s.status === 'dp' ? (s.dpAmount || 0) : 0;
                  const sisa = total - dp;
                  const STATUS_LABEL: Record<string, string> = { pending: 'PO', dp: 'DP' };
                  return (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium text-gray-700 truncate">{item?.name || s.sku} {s.size}</p>
                        <p className="text-xs text-gray-400">{s.invoice || s.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-orange-600 text-xs">{formatRp(sisa)}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          s.status === 'dp' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {STATUS_LABEL[s.status || 'pending']}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {allUnpaid.length > 8 && (
                  <p className="text-xs text-gray-400 text-center pt-1">+{allUnpaid.length - 8} lainnya</p>
                )}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
