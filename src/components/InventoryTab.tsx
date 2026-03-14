import React, { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, X, Check, PackagePlus, History, Upload, Search, ImageOff } from "lucide-react";
import type { InventoryItem, RestockItem } from "../types";
import { SIZES } from "../types";
import MonthFilter from "./MonthFilter";

const formatRp = (num: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

interface InventoryTabProps {
  metrics: any;
  storeData: any;
  filterMonth: string;
  onFilterMonthChange: (val: string) => void;
  onAddInventory: (item: InventoryItem) => void;
  onDeleteInventory: (sku: string) => void;
  onUpdateInventory: (oldSku: string, item: InventoryItem) => void;
  onAddRestock: (restock: Omit<RestockItem, "id">) => void;
  onDeleteRestock: (id: string) => void;
}

// ==============================
// IMAGE UPLOAD HELPER
// ==============================
async function uploadProductImage(file: File, sku: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'POS-System');
  formData.append('public_id', `products/${sku}-${Date.now()}`);

  const res = await fetch('https://api.cloudinary.com/v1_1/dtfyfx9zr/image/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Upload gagal');
  const data = await res.json();
  return data.secure_url;
}

// ==============================
// PRODUCT IMAGE
// ==============================
function ProductImage({ url, name, size = 'md' }: { url?: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'w-10 h-10', md: 'w-full h-36', lg: 'w-full h-48' }[size];
  if (!url) return (
    <div className={`${sizeClass} bg-gray-100 rounded-lg flex items-center justify-center text-gray-300`}>
      <ImageOff size={size === 'sm' ? 16 : 28} />
    </div>
  );
  return <img src={url} alt={name} className={`${sizeClass} object-cover rounded-lg`} />;
}

// ==============================
// EDIT MODAL
// ==============================
function EditModal({ item, onClose, onSave }: {
  item: InventoryItem;
  onClose: () => void;
  onSave: (oldSku: string, updated: InventoryItem) => void;
}) {
  const [form, setForm] = useState({ sku: item.sku, name: item.name, hpp: String(item.hpp), price: String(item.price) });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(item.imageUrl ?? undefined);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    let imageUrl = item.imageUrl;
    if (imageFile) {
      try { imageUrl = await uploadProductImage(imageFile, form.sku); }
      catch { alert('Gagal upload gambar.'); setUploading(false); return; }
    }
    onSave(item.sku, { sku: form.sku, name: form.name, hpp: Number(form.hpp), price: Number(form.price), imageUrl: imageUrl ?? undefined });
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg">Edit Produk</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Gambar */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Foto Produk</label>
            <div className="flex gap-3 items-center">
              {imagePreview
                ? <img src={imagePreview} alt="preview" className="w-20 h-20 object-cover rounded-lg border" />
                : <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300"><ImageOff size={24} /></div>
              }
              <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 transition text-sm text-gray-500">
                <Upload size={16} /> {imagePreview ? 'Ganti Foto' : 'Upload Foto'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">SKU</label>
              <input required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nama Produk</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">HPP</label>
              <input required type="number" value={form.hpp} onChange={e => setForm({ ...form, hpp: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Harga Jual</label>
              <input required type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition">Batal</button>
            <button type="submit" disabled={uploading}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium disabled:opacity-60">
              {uploading ? 'Mengupload...' : <><Check size={15} /> Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==============================
// RESTOCK MODAL
// ==============================
function RestockModal({ item, restockHistory, onClose, onAddRestock, onDeleteRestock }: {
  item: InventoryItem;
  restockHistory: RestockItem[];
  onClose: () => void;
  onAddRestock: (restock: Omit<RestockItem, "id">) => void;
  onDeleteRestock: (id: string) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [sizeStocks, setSizeStocks] = useState<Record<string, string>>(Object.fromEntries(SIZES.map(s => [s, ''])));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const sizes = SIZES.map(size => ({ size, stock: Number(sizeStocks[size]) || 0 }));
    if (!sizes.some(s => s.stock > 0)) { alert('Isi minimal 1 ukuran'); return; }
    onAddRestock({ sku: item.sku, date, sizes, note });
    setSizeStocks(Object.fromEntries(SIZES.map(s => [s, ''])));
    setNote('');
  };

  const sorted = [...restockHistory].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <ProductImage url={item.imageUrl} name={item.name} size="sm" />
            <div>
              <h3 className="font-bold text-lg">Restock Barang</h3>
              <p className="text-xs text-gray-400">{item.sku} — {item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <form onSubmit={handleAdd} className="space-y-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase">Tambah Restock Baru</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Tanggal Masuk</label>
                <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Keterangan</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Opsional"
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Qty per Ukuran</label>
              <div className="grid grid-cols-5 gap-2">
                {SIZES.map(size => (
                  <div key={size} className="space-y-1">
                    <label className="block text-center text-xs font-bold text-blue-600 bg-blue-100 rounded py-0.5">{size}</label>
                    <input type="number" min="0" value={sizeStocks[size]}
                      onChange={e => setSizeStocks(prev => ({ ...prev, [size]: e.target.value }))}
                      placeholder="0"
                      className="w-full border rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium">
                <PackagePlus size={15} /> Tambah Restock
              </button>
            </div>
          </form>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
              <History size={12} /> Riwayat Restock
            </p>
            {sorted.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Belum ada riwayat restock.</p>}
            {sorted.map(r => {
              const total = r.sizes.reduce((sum, s) => sum + s.stock, 0);
              return (
                <div key={r.id} className="flex items-start justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{r.date}</span>
                      {r.note && <span className="text-xs text-gray-400">— {r.note}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {r.sizes.filter(s => s.stock > 0).map(s => (
                        <span key={s.size} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 font-medium">
                          {s.size}: {s.stock}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400 px-1">= {total} pcs</span>
                    </div>
                  </div>
                  <button onClick={() => onDeleteRestock(r.id)} className="text-red-400 hover:text-red-600 ml-3 shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==============================
// PRODUCT CARD
// ==============================
function ProductCard({ item, onEdit, onDelete, onRestock }: {
  item: any;
  onEdit: () => void;
  onDelete: () => void;
  onRestock: () => void;
}) {
  const lowSizes = SIZES.filter(size => {
    const restocked = item.restockedBySize?.[size] || 0;
    const sold = item.soldBySize?.[size] || 0;
    return restocked > 0 && (restocked - sold) <= 3;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Gambar */}
      <div className="relative">
        <ProductImage url={item.imageUrl} name={item.name} size="md" />
        {lowSizes.length > 0 && (
          <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Stok Menipis
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 space-y-3">
        <div>
          <p className="text-xs text-gray-400 font-mono">{item.sku}</p>
          <h3 className="font-bold text-gray-800 leading-tight">{item.name}</h3>
          <p className="text-sm text-green-600 font-semibold mt-0.5">{formatRp(item.price)}</p>
          <p className="text-xs text-gray-400">Modal: {formatRp(item.hpp)}</p>
        </div>

        {/* Stok per ukuran */}
        <div className="grid grid-cols-5 gap-1">
          {SIZES.map(size => {
            const restocked = item.restockedBySize?.[size] || 0;
            const sold = item.soldBySize?.[size] || 0;
            const remaining = restocked - sold;
            const hasStock = restocked > 0;
            return (
              <div key={size} className={`rounded-lg p-1.5 text-center ${
                !hasStock ? 'bg-gray-50' :
                remaining <= 0 ? 'bg-red-50' :
                remaining <= 3 ? 'bg-yellow-50' : 'bg-green-50'
              }`}>
                <p className="text-[9px] font-bold text-gray-400">{size}</p>
                <p className={`text-sm font-bold ${
                  !hasStock ? 'text-gray-300' :
                  remaining <= 0 ? 'text-red-500' :
                  remaining <= 3 ? 'text-yellow-600' : 'text-green-600'
                }`}>{hasStock ? remaining : '-'}</p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400">Total sisa: <span className="font-semibold text-gray-600">{item.current} pcs</span></p>

        {/* Actions */}
        <div className="flex gap-2 pt-1 mt-auto">
          <button onClick={onRestock}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition">
            <PackagePlus size={13} /> Restock
          </button>
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
            <Pencil size={13} /> Edit
          </button>
          <button onClick={onDelete}
            className="px-2.5 py-1.5 text-xs text-red-400 bg-red-50 hover:bg-red-100 rounded-lg transition">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================
// MAIN COMPONENT
// ==============================
export default function InventoryTab({
  metrics, storeData, filterMonth, onFilterMonthChange,
  onAddInventory, onDeleteInventory, onUpdateInventory,
  onAddRestock, onDeleteRestock,
}: InventoryTabProps) {
  const [newInv, setNewInv] = useState({ sku: '', name: '', hpp: '', price: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [restockingItem, setRestockingItem] = useState<InventoryItem | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    let imageUrl: string | undefined;
    if (imageFile) {
      try { imageUrl = await uploadProductImage(imageFile, newInv.sku); }
      catch { alert('Gagal upload gambar.'); setUploading(false); return; }
    }
    onAddInventory({ sku: newInv.sku, name: newInv.name, hpp: Number(newInv.hpp), price: Number(newInv.price), imageUrl: imageUrl || null });
    setNewInv({ sku: '', name: '', hpp: '', price: '' });
    setImageFile(null);
    setImagePreview(undefined);
    setUploading(false);
    setShowForm(false);
  };

  // Filter + search
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return Object.values(metrics.stockMap).filter((item: any) =>
      !q || item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );
  }, [metrics.stockMap, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <h2 className="text-2xl font-bold">Database & Stok Barang</h2>
        <MonthFilter value={filterMonth} onChange={onFilterMonthChange} />
      </div>

      {/* Search + Tambah */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari SKU atau nama produk..."
            className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition shrink-0"
        >
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      {/* Form tambah — collapsible */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Daftarkan Produk Baru</p>

          {/* Upload gambar */}
          <div className="flex items-center gap-4">
            {imagePreview
              ? <img src={imagePreview} alt="preview" className="w-20 h-20 object-cover rounded-xl border" />
              : <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300"><ImageOff size={24} /></div>
            }
            <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 transition text-sm text-gray-500">
              <Upload size={16} /> {imagePreview ? 'Ganti Foto' : 'Upload Foto Produk'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">SKU</label>
              <input required value={newInv.sku} onChange={e => setNewInv({ ...newInv, sku: e.target.value })}
                placeholder="TS-001"
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nama Produk</label>
              <input required value={newInv.name} onChange={e => setNewInv({ ...newInv, name: e.target.value })}
                placeholder="Kaos Polos Hitam"
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">HPP (Modal)</label>
              <input required type="number" value={newInv.hpp} onChange={e => setNewInv({ ...newInv, hpp: e.target.value })}
                placeholder="40000"
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Harga Jual</label>
              <div className="flex gap-2">
                <input required type="number" value={newInv.price} onChange={e => setNewInv({ ...newInv, price: e.target.value })}
                  placeholder="85000"
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <button type="submit" disabled={uploading}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-60 whitespace-nowrap">
                  {uploading ? '...' : <Plus size={20} />}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Card grid */}
      {filteredItems.length === 0
        ? (
          <div className="text-center py-16 text-gray-400">
            {search ? `Tidak ada produk dengan kata kunci "${search}"` : 'Belum ada barang di database.'}
          </div>
        )
        : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map((item: any) => (
              <ProductCard
                key={item.sku}
                item={item}
                onEdit={() => setEditingItem(item)}
                onDelete={() => onDeleteInventory(item.sku)}
                onRestock={() => setRestockingItem(item)}
              />
            ))}
          </div>
        )
      }

      {/* Modals */}
      {editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(oldSku, updated) => { onUpdateInventory(oldSku, updated); setEditingItem(null); }}
        />
      )}
      {restockingItem && (
        <RestockModal
          item={restockingItem}
          restockHistory={(storeData.restocks || []).filter((r: RestockItem) => r.sku === restockingItem.sku)}
          onClose={() => setRestockingItem(null)}
          onAddRestock={onAddRestock}
          onDeleteRestock={onDeleteRestock}
        />
      )}
    </div>
  );
}
