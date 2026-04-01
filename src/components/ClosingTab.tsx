import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag, TrendingUp, TrendingDown, CreditCard, Receipt, Package } from 'lucide-react';
import type { StoreData } from '../types';

const formatRp = (num: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(num);

const fmtDate = (d: Date) =>
  `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

interface ClosingTabProps {
  storeData: StoreData;
  metrics: any;
}

export default function ClosingTab({ storeData, metrics }: ClosingTabProps) {
  const [selectedDate, setSelectedDate] = useState(() => toYMD(new Date()));

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toYMD(d));
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const today = toYMD(new Date());
    if (toYMD(d) <= today) setSelectedDate(toYMD(d));
  };

  const isToday = selectedDate === toYMD(new Date());
  const dateObj = new Date(selectedDate);
  const dayLabel = `${DAYS[dateObj.getDay()]}, ${fmtDate(dateObj)}`;

  // ==============================
  // DATA HARI INI
  // ==============================
  const isFnb = storeData.storeType === 'fnb';

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

  // Omzet hari ini
  const omzetToday = isFnb
    ? (salesToday as any[]).reduce((sum: number, s: any) => sum + (s.total || 0), 0)
    : (salesToday as any[]).filter((s: any) => (s.status || 'selesai') === 'selesai')
        .reduce((sum: number, s: any) => {
          const item = metrics.stockMap[s.sku];
          return sum + (item ? item.price * s.qty : 0);
        }, 0);

  // Total semua order hari ini
  const totalOrderToday = isFnb
    ? omzetToday
    : (salesToday as any[]).reduce((sum: number, s: any) => {
        const item = metrics.stockMap[s.sku];
        return sum + (item ? item.price * s.qty : 0);
      }, 0);

  // DP masuk hari ini (fashion only)
  const dpToday = isFnb ? 0 : (salesToday as any[])
    .filter((s: any) => s.status === 'dp')
    .reduce((sum: number, s: any) => sum + (s.dpAmount || 0), 0);

  // HPP hari ini
  const hppToday = isFnb
    ? (salesToday as any[]).reduce((sum: number, s: any) =>
        sum + (s.items || []).reduce((acc: number, si: any) => {
          const item = metrics.stockMap[si.sku];
          return acc + (item ? item.hpp * si.qty : 0);
        }, 0), 0)
    : (salesToday as any[]).filter((s: any) => (s.status || 'selesai') === 'selesai')
        .reduce((sum: number, s: any) => {
          const item = metrics.stockMap[s.sku];
          return sum + (item ? item.hpp * s.qty : 0);
        }, 0);

  // Total pengeluaran hari ini
  const expenseToday = expensesToday.reduce((sum, e) => sum + e.amount, 0);

  const grossToday = omzetToday - hppToday;
  const netToday = grossToday - expenseToday;

  // Total qty terjual
  const qtyToday = isFnb
    ? (salesToday as any[]).reduce((sum: number, s: any) =>
        sum + (s.items || []).reduce((acc: number, si: any) => acc + si.qty, 0), 0)
    : (salesToday as any[]).filter((s: any) => (s.status || 'selesai') === 'selesai')
        .reduce((sum: number, s: any) => sum + s.qty, 0);

  // Rincian per produk
  const productSummary = useMemo(() => {
    const map: Record<string, { name: string; imageUrl?: string | null; qty: number; omzet: number; sizes: Record<string, number> }> = {};

    if (isFnb) {
      (salesToday as any[]).forEach((s: any) => {
        (s.items || []).forEach((si: any) => {
          const item = metrics.stockMap[si.sku];
          if (!map[si.sku]) {
            map[si.sku] = { name: item?.name || si.sku, imageUrl: item?.imageUrl, qty: 0, omzet: 0, sizes: {} };
          }
          map[si.sku].qty += si.qty;
          map[si.sku].omzet += item ? item.price * si.qty : 0;
        });
      });
    } else {
      (salesToday as any[])
        .filter((s: any) => (s.status || 'selesai') === 'selesai')
        .forEach((s: any) => {
          const item = metrics.stockMap[s.sku];
          if (!map[s.sku]) {
            map[s.sku] = { name: item?.name || s.sku, imageUrl: item?.imageUrl, qty: 0, omzet: 0, sizes: {} };
          }
          map[s.sku].qty += s.qty;
          map[s.sku].omzet += item ? item.price * s.qty : 0;
          map[s.sku].sizes[s.size] = (map[s.sku].sizes[s.size] || 0) + s.qty;
        });
    }

    return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty);
  }, [salesToday, metrics.stockMap, isFnb]);

  // Piutang hari ini (fashion only)
  const piutangToday = isFnb ? [] : (salesToday as any[]).filter((s: any) => (s.status || 'selesai') !== 'selesai');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Date Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-2xl font-bold">Rekap Closing Harian</h2>
          <p className="text-sm text-gray-400 mt-0.5">Ringkasan aktivitas toko per hari</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevDay}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-500">
            <ChevronLeft size={16} />
          </button>
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg min-w-[180px] text-center">
            <p className="text-sm font-semibold text-gray-700">{dayLabel}</p>
            {isToday && <p className="text-[10px] text-blue-500 font-medium">Hari ini</p>}
          </div>
          <button onClick={nextDay} disabled={isToday}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={16} />
          </button>
          {!isToday && (
            <button onClick={() => setSelectedDate(toYMD(new Date()))}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-2 rounded-lg hover:bg-blue-50 transition">
              Hari Ini
            </button>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Omzet Lunas</p>
              <p className="text-lg font-bold text-gray-800 mt-0.5">{formatRp(omzetToday)}</p>
            </div>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><TrendingUp size={16} /></div>
          </div>
          <p className="text-xs text-gray-400 mt-1">{qtyToday} pcs terjual</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Laba Bersih</p>
              <p className={`text-lg font-bold mt-0.5 ${netToday < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {formatRp(netToday)}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${netToday < 0 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {netToday < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Margin {omzetToday > 0 ? ((netToday / omzetToday) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Pengeluaran</p>
              <p className="text-lg font-bold text-red-600 mt-0.5">{formatRp(expenseToday)}</p>
            </div>
            <div className="p-2 bg-red-100 text-red-500 rounded-lg"><Receipt size={16} /></div>
          </div>
          <p className="text-xs text-gray-400 mt-1">{expensesToday.length} item</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">Piutang Baru</p>
              <p className="text-lg font-bold text-orange-600 mt-0.5">
                {formatRp(piutangToday.reduce((sum, s) => {
                  const item = metrics.stockMap[s.sku];
                  const total = item ? item.price * s.qty : 0;
                  const dp = s.status === 'dp' ? (s.dpAmount || 0) : 0;
                  return sum + (total - dp);
                }, 0))}
              </p>
            </div>
            <div className="p-2 bg-orange-100 text-orange-500 rounded-lg"><CreditCard size={16} /></div>
          </div>
          <p className="text-xs text-gray-400 mt-1">{piutangToday.length} order belum lunas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rincian P&L */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-base mb-4">Rincian Laba Rugi</h3>
          {salesToday.length === 0 && expensesToday.length === 0
            ? <p className="text-sm text-gray-400 text-center py-6">Tidak ada aktivitas di hari ini.</p>
            : (
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Order Masuk</span>
                  <span className="font-medium">{formatRp(totalOrderToday)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Omzet Lunas</span>
                  <span className="font-medium text-green-600">{formatRp(omzetToday)}</span>
                </div>
                {dpToday > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">DP Masuk</span>
                    <span className="font-medium text-blue-600">{formatRp(dpToday)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">HPP Terjual</span>
                  <span className="font-medium text-red-500">− {formatRp(hppToday)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-semibold text-gray-700">Laba Kotor</span>
                  <span className="font-semibold">{formatRp(grossToday)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pengeluaran Operasional</span>
                  <span className="font-medium text-red-500">− {formatRp(expenseToday)}</span>
                </div>
                <div className="flex justify-between text-base border-t pt-2">
                  <span className="font-bold text-gray-800">Laba Bersih</span>
                  <span className={`font-bold ${netToday < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatRp(netToday)}
                  </span>
                </div>
              </div>
            )
          }
        </div>

        {/* Rincian per produk */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Package size={16} className="text-blue-500" />
            Produk Terjual
          </h3>
          {productSummary.length === 0
            ? <p className="text-sm text-gray-400 text-center py-6">Belum ada penjualan lunas hari ini.</p>
            : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {productSummary.map(([sku, data]) => (
                  <div key={sku} className="flex items-center gap-3">
                    {data.imageUrl
                      ? <img src={data.imageUrl} alt={data.name} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                      : <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-gray-300">
                          <ShoppingBag size={14} />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{data.name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {Object.entries(data.sizes).map(([size, qty]) => (
                          <span key={size} className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded">
                            {size}: {qty}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-700">{data.qty} pcs</p>
                      <p className="text-xs text-green-600">{formatRp(data.omzet)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* Pengeluaran hari ini */}
      {expensesToday.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Receipt size={16} className="text-red-500" />
            Pengeluaran Hari Ini
          </h3>
          <div className="space-y-2">
            {expensesToday.map(e => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-700">{e.desc}</span>
                  <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{e.category}</span>
                </div>
                <span className="font-bold text-red-500">{formatRp(e.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-bold text-gray-700">Total</span>
              <span className="font-bold text-red-600">{formatRp(expenseToday)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Piutang hari ini */}
      {piutangToday.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-orange-500" />
            Piutang Hari Ini
          </h3>
          <div className="space-y-2">
            {piutangToday.map(s => {
              const item = metrics.stockMap[s.sku];
              const total = item ? item.price * s.qty : 0;
              const dp = s.status === 'dp' ? (s.dpAmount || 0) : 0;
              const sisa = total - dp;
              return (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-gray-700">{item?.name || s.sku}</span>
                    <span className="ml-1 text-xs bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded">{s.size}</span>
                    <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded ${
                      s.status === 'dp' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {s.status === 'dp' ? 'DP' : 'Pending'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">{formatRp(sisa)}</p>
                    {dp > 0 && <p className="text-[10px] text-gray-400">DP: {formatRp(dp)}</p>}
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
