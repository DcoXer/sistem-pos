import { useState, useMemo } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, ImageOff, Check, X } from 'lucide-react';
import type { StoreData, FnbSaleItem } from '../types';
import MonthFilter from './MonthFilter';
import Pagination from './Pagination';

const formatRp = (num: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(num);

interface FnbSalesTabProps {
  storeData: StoreData;
  metrics: any;
  filterMonth: string;
  onFilterMonthChange: (val: string) => void;
  onAddFnbSale: (sale: Omit<FnbSaleItem, 'id'>) => void;
  onDeleteFnbSale: (id: string) => void;
}

interface CartItem { sku: string; qty: number; }

export default function FnbSalesTab({
  storeData, metrics, filterMonth, onFilterMonthChange,
  onAddFnbSale, onDeleteFnbSale,
}: FnbSalesTabProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [page, setPage] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const PAGE_SIZE = 10;

  const inventory = storeData.inventory || [];

  const addToCart = (sku: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.sku === sku);
      if (existing) return prev.map(c => c.sku === sku ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { sku, qty: 1 }];
    });
  };

  const updateQty = (sku: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.sku === sku ? { ...c, qty: Math.max(0, c.qty + delta) } : c)
      .filter(c => c.qty > 0)
    );
  };

  const removeFromCart = (sku: string) => setCart(prev => prev.filter(c => c.sku !== sku));

  // Lookup harga dari inventory langsung (stockMap FnB tidak track harga per item)
  const invMap = useMemo(() =>
    Object.fromEntries(inventory.map(i => [i.sku, i])),
    [inventory]
  );

  const cartTotal = cart.reduce((sum, c) => {
    const item = invMap[c.sku];
    return sum + (item ? item.price * c.qty : 0);
  }, 0);

  const cartQty = cart.reduce((sum, c) => sum + c.qty, 0);

  const handleSubmit = () => {
    if (cart.length === 0) return;
    onAddFnbSale({
      date,
      items: cart.map(c => ({ sku: c.sku, qty: c.qty })),
      total: cartTotal,
    });
    setCart([]);
  };

  // Filter transaksi bulan ini
  const filteredSales = useMemo(() => {
    const [fy, fm] = filterMonth.split('-').map(Number);
    return (storeData.fnbSales || [])
      .filter(s => {
        const d = new Date(s.date);
        const inMonth = d.getFullYear() === fy && d.getMonth() + 1 === fm;
        if (!inMonth) return false;
        if (filterDate && s.date !== filterDate) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [storeData.fnbSales, filterMonth, filterDate]);

  const totalPages = Math.ceil(filteredSales.length / PAGE_SIZE);
  const paginatedSales = filteredSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalOmzet = filteredSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <h2 className="text-2xl font-bold">Kasir</h2>
        <MonthFilter value={filterMonth} onChange={onFilterMonthChange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu produk */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-600">Pilih Produk</p>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Tanggal Transaksi</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {inventory.map(invItem => {
              const inCart = cart.find(c => c.sku === invItem.sku);
              return (
                <button key={invItem.sku} onClick={() => addToCart(invItem.sku)}
                  className={`relative bg-white rounded-xl border-2 overflow-hidden text-left transition hover:shadow-md ${
                    inCart ? 'border-green-400' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {invItem.imageUrl
                    ? <img src={invItem.imageUrl} alt={invItem.name} className="w-full h-28 object-cover" />
                    : <div className="w-full h-28 bg-gray-100 flex items-center justify-center text-gray-300"><ImageOff size={24} /></div>
                  }
                  {inCart && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      {inCart.qty}
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className="text-sm font-bold text-gray-800 leading-tight truncate">{invItem.name}</p>
                    <p className="text-xs text-green-600 font-semibold mt-0.5">{formatRp(invItem.price)}</p>
                  </div>
                </button>
              );
            })}
            {inventory.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-400 text-sm">
                Belum ada produk. Tambah di tab Produk dulu.
              </div>
            )}
          </div>
        </div>

        {/* Keranjang */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <ShoppingCart size={18} className="text-gray-500" />
            <h3 className="font-bold text-base">Keranjang</h3>
            {cartQty > 0 && (
              <span className="ml-auto bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {cartQty} item
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
            {cart.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">Ketuk produk untuk menambahkan</p>
              : cart.map(c => {
                  const item = invMap[c.sku];
                  return (
                    <div key={c.sku} className="flex items-center gap-2">
                      {item?.imageUrl
                        ? <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                        : <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-gray-300"><ImageOff size={14} /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">{item?.name || c.sku}</p>
                        <p className="text-xs text-green-600">{formatRp((item?.price || 0) * c.qty)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => updateQty(c.sku, -1)}
                          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                          <Minus size={10} />
                        </button>
                        <span className="text-sm font-bold w-6 text-center">{c.qty}</span>
                        <button onClick={() => updateQty(c.sku, 1)}
                          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                          <Plus size={10} />
                        </button>
                        <button onClick={() => removeFromCart(c.sku)}
                          className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-400 flex items-center justify-center transition ml-1">
                          <X size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })
            }
          </div>

          {cart.length > 0 && (
            <div className="p-4 border-t space-y-3">
              <div className="flex justify-between text-base">
                <span className="font-bold text-gray-700">Total</span>
                <span className="font-bold text-green-600">{formatRp(cartTotal)}</span>
              </div>
              <button onClick={handleSubmit}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                <Check size={18} /> Catat Penjualan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Riwayat transaksi */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-base">Riwayat Transaksi</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-400">{filteredSales.length} transaksi · </span>
              <span className="text-xs font-bold text-green-700">{formatRp(totalOmzet)}</span>
            </div>
            <input
              type="date"
              value={filterDate}
              onChange={e => { setFilterDate(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
            {filterDate && (
              <button onClick={() => { setFilterDate(''); setPage(1); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition">
                Reset
              </button>
            )}
          </div>
        </div>

        {filteredSales.length === 0
          ? <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
              Belum ada transaksi di bulan ini.
            </div>
          : (
            <>
              <div className="space-y-2">
                {paginatedSales.map(sale => (
                  <div key={sale.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700">{sale.date}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sale.items.map(si => {
                          const item = metrics.stockMap[si.sku];
                          return (
                            <span key={si.sku} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {item?.name || si.sku} ×{si.qty}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-green-600">{formatRp(sale.total)}</span>
                      <button onClick={() => onDeleteFnbSale(sale.id)}
                        className="text-red-400 hover:text-red-600 transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-gray-400">{filteredSales.length} transaksi · halaman {page} dari {totalPages}</p>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )
        }
      </div>
    </div>
  );
}
