import React, { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, X, Check, PackagePlus, History, Upload, Search, ImageOff } from "lucide-react";
import type { InventoryItem, RestockItem } from "../types";
import { SIZES } from "../types";
import MonthFilter from "./MonthFilter";
import Pagination from "./Pagination";

const D = {
  surface: '#13131a', elevated: '#1a1a24', border: '#ffffff0d',
  accent: '#8b5cf6', accentDim: '#8b5cf615',
  text: '#f1f0f5', muted: '#6b7280',
  success: '#10b981', successDim: '#10b98115',
  danger: '#ef4444', dangerDim: '#ef444415',
  warning: '#f59e0b', warningDim: '#f59e0b15',
};

const inp = {
  background: '#1a1a24', border: '1px solid #ffffff12',
  color: '#f1f0f5', borderRadius: 10, padding: '8px 12px',
  fontSize: 14, outline: 'none', width: '100%',
};

const lbl = {
  fontSize: 11, fontWeight: 600, color: '#6b7280',
  textTransform: 'uppercase' as const, letterSpacing: 1,
  display: 'block', marginBottom: 4,
};

const formatRp = (num: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

async function uploadProductImage(file: File, sku: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'POS-System');
  formData.append('public_id', `products/${sku}-${Date.now()}`);
  const res = await fetch('https://api.cloudinary.com/v1_1/dtfyfx9zr/image/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload gagal');
  return (await res.json()).secure_url;
}

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
  onUploadError: (msg: string) => void;
}

function ProductImage({ url, name, size = 'md' }: { url?: string | null; name: string; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-10 h-10' : 'w-full h-36';
  if (!url) return (
    <div className={`${sz} rounded-lg flex items-center justify-center`} style={{ background: D.elevated }}>
      <ImageOff size={size === 'sm' ? 16 : 28} style={{ color: D.muted }} />
    </div>
  );
  return <img src={url} alt={name} className={`${sz} object-cover rounded-lg`} />;
}

function EditModal({ item, onClose, onSave, onUploadError }: {
  item: InventoryItem; onClose: () => void;
  onSave: (oldSku: string, updated: InventoryItem) => void;
  onUploadError: (msg: string) => void;
}) {
  const [form, setForm] = useState({ sku: item.sku, name: item.name, hpp: String(item.hpp), price: String(item.price) });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(item.imageUrl ?? undefined);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { onUploadError('Ukuran foto terlalu besar. Maksimal 2 MB.'); e.target.value = ''; return; }
    setImageFile(file); setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setUploading(true);
    let imageUrl = item.imageUrl;
    if (imageFile) {
      try { imageUrl = await uploadProductImage(imageFile, form.sku); }
      catch { onUploadError('Foto gagal diupload. Pastikan ukuran foto tidak lebih dari 2 MB.'); setUploading(false); return; }
    }
    onSave(item.sku, { sku: form.sku, name: form.name, hpp: Number(form.hpp), price: Number(form.price), imageUrl: imageUrl ?? undefined });
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#00000080' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${D.border}` }}>
          <h3 className="font-bold text-base" style={{ color: D.text }}>Edit Produk</h3>
          <button onClick={onClose} style={{ color: D.muted }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="flex gap-3 items-center">
            {imagePreview
              ? <img src={imagePreview} alt="preview" className="w-20 h-20 object-cover rounded-xl shrink-0" style={{ border: `1px solid ${D.border}` }} />
              : <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ background: D.elevated }}><ImageOff size={24} style={{ color: D.muted }} /></div>
            }
            <div className="space-y-1">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm" style={{ border: '1px dashed #ffffff20', color: D.muted }}>
                <Upload size={16} /> {imagePreview ? 'Ganti Foto' : 'Upload Foto'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              <p className="text-[11px]" style={{ color: '#4b5563' }}>Format: JPG, PNG, WEBP · Maks. 2 MB</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={lbl}>SKU</label><input required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>Nama Produk</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={lbl}>HPP</label><input required type="number" value={form.hpp} onChange={e => setForm({ ...form, hpp: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>Harga Jual</label><input required type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={inp} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg font-medium"
              style={{ background: D.elevated, color: D.muted, border: `1px solid ${D.border}` }}>Batal</button>
            <button type="submit" disabled={uploading} className="px-5 py-2 text-sm rounded-lg font-medium flex items-center gap-2 disabled:opacity-60"
              style={{ background: D.accent, color: '#fff' }}>
              {uploading ? 'Mengupload...' : <><Check size={15} /> Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RestockModal({ item, restockHistory, onClose, onAddRestock, onDeleteRestock }: {
  item: InventoryItem; restockHistory: RestockItem[];
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
    setSizeStocks(Object.fromEntries(SIZES.map(s => [s, '']))); setNote('');
  };

  const sorted = [...restockHistory].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#00000080' }}>
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${D.border}` }}>
          <div className="flex items-center gap-3">
            <ProductImage url={item.imageUrl} name={item.name} size="sm" />
            <div>
              <h3 className="font-bold text-base" style={{ color: D.text }}>Restock Barang</h3>
              <p className="text-xs" style={{ color: D.muted }}>{item.sku} — {item.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: D.muted }}><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <form onSubmit={handleAdd} className="space-y-4 p-4 rounded-xl" style={{ background: D.elevated, border: `1px solid ${D.border}` }}>
            <p className="text-xs font-semibold uppercase" style={{ color: D.accent }}>Tambah Restock Baru</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label style={lbl}>Tanggal Masuk</label><input required type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Keterangan</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="Opsional" style={inp} /></div>
            </div>
            <div>
              <label style={lbl}>Qty per Ukuran</label>
              <div className="grid grid-cols-5 gap-2">
                {SIZES.map(size => (
                  <div key={size} className="space-y-1">
                    <div className="text-center text-xs font-bold py-0.5 rounded" style={{ background: D.accentDim, color: D.accent }}>{size}</div>
                    <input type="number" min="0" value={sizeStocks[size]}
                      onChange={e => setSizeStocks(prev => ({ ...prev, [size]: e.target.value }))}
                      placeholder="0" style={{ ...inp, textAlign: 'center' }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                style={{ background: D.accent, color: '#fff' }}>
                <PackagePlus size={15} /> Tambah Restock
              </button>
            </div>
          </form>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase flex items-center gap-1" style={{ color: D.muted }}>
              <History size={12} /> Riwayat Restock
            </p>
            {sorted.length === 0 && <p className="text-sm text-center py-4" style={{ color: D.muted }}>Belum ada riwayat restock.</p>}
            {sorted.map(r => {
              const total = r.sizes.reduce((sum, s) => sum + s.stock, 0);
              return (
                <div key={r.id} className="flex items-start justify-between px-4 py-3 rounded-lg" style={{ background: D.elevated, border: `1px solid ${D.border}` }}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: D.text }}>{r.date}</span>
                      {r.note && <span className="text-xs" style={{ color: D.muted }}>— {r.note}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {r.sizes.filter(s => s.stock > 0).map(s => (
                        <span key={s.size} className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.muted }}>
                          {s.size}: {s.stock}
                        </span>
                      ))}
                      <span className="text-xs px-1" style={{ color: D.muted }}>= {total} pcs</span>
                    </div>
                  </div>
                  <button onClick={() => onDeleteRestock(r.id)} className="ml-3 shrink-0 transition" style={{ color: D.muted }}>
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

function ProductCard({ item, onEdit, onDelete, onRestock }: {
  item: any; onEdit: () => void; onDelete: () => void; onRestock: () => void;
}) {
  const lowSizes = SIZES.filter(size => {
    const restocked = item.restockedBySize?.[size] || 0;
    const sold = item.soldBySize?.[size] || 0;
    return restocked > 0 && (restocked - sold) <= 3;
  });

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
      <div className="relative">
        <ProductImage url={item.imageUrl} name={item.name} size="md" />
        {lowSizes.length > 0 && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: D.warning, color: '#000' }}>
            Stok Menipis
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1 space-y-3">
        <div>
          <p className="text-xs font-mono" style={{ color: D.muted }}>{item.sku}</p>
          <h3 className="font-bold text-sm leading-tight" style={{ color: D.text }}>{item.name}</h3>
          <p className="text-sm font-semibold mt-0.5" style={{ color: D.success }}>{formatRp(item.price)}</p>
          <p className="text-xs" style={{ color: D.muted }}>Modal: {formatRp(item.hpp)}</p>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {SIZES.map(size => {
            const restocked = item.restockedBySize?.[size] || 0;
            const sold = item.soldBySize?.[size] || 0;
            const remaining = restocked - sold;
            const hasStock = restocked > 0;
            const bg = !hasStock ? D.elevated : remaining <= 0 ? '#7f1d1d' : remaining <= 3 ? '#78350f' : '#14532d';
            const color = !hasStock ? D.muted : remaining <= 0 ? '#fca5a5' : remaining <= 3 ? '#fde68a' : '#86efac';
            return (
              <div key={size} className="rounded-lg p-1.5 text-center" style={{ background: bg }}>
                <p className="text-[9px] font-bold" style={{ color: D.muted }}>{size}</p>
                <p className="text-sm font-bold" style={{ color }}>{hasStock ? remaining : '-'}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs" style={{ color: D.muted }}>
          Total sisa: <span className="font-semibold" style={{ color: D.text }}>{item.current} pcs</span>
        </p>
        <div className="flex gap-2 pt-1 mt-auto">
          <button onClick={onRestock}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg transition"
            style={{ background: D.successDim, color: D.success, border: `1px solid ${D.success}30` }}>
            <PackagePlus size={13} /> Restock
          </button>
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg transition"
            style={{ background: D.accentDim, color: D.accent, border: `1px solid ${D.accent}30` }}>
            <Pencil size={13} /> Edit
          </button>
          <button onClick={onDelete}
            className="px-2.5 py-1.5 text-xs rounded-lg transition"
            style={{ background: D.dangerDim, color: D.danger, border: `1px solid ${D.danger}30` }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryTab({
  metrics, storeData, filterMonth, onFilterMonthChange,
  onAddInventory, onDeleteInventory, onUpdateInventory,
  onAddRestock, onDeleteRestock, onUploadError,
}: InventoryTabProps) {
  const [newInv, setNewInv] = useState({ sku: '', name: '', hpp: '', price: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [restockingItem, setRestockingItem] = useState<InventoryItem | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { onUploadError('Ukuran foto terlalu besar. Maksimal 2 MB.'); e.target.value = ''; return; }
    setImageFile(file); setImagePreview(URL.createObjectURL(file));
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const skuExists = Object.keys(metrics.stockMap).includes(newInv.sku);
    if (skuExists) { onUploadError(`SKU "${newInv.sku}" sudah dipakai produk lain.`); return; }
    setUploading(true);
    let imageUrl: string | null = null;
    if (imageFile) {
      try { imageUrl = await uploadProductImage(imageFile, newInv.sku); }
      catch { onUploadError('Foto gagal diupload. Pastikan ukuran foto tidak lebih dari 2 MB.'); setUploading(false); return; }
    }
    onAddInventory({ sku: newInv.sku, name: newInv.name, hpp: Number(newInv.hpp), price: Number(newInv.price), imageUrl });
    setNewInv({ sku: '', name: '', hpp: '', price: '' });
    setImageFile(null); setImagePreview(undefined); setUploading(false); setShowForm(false);
  };

  const handleSearchChange = (q: string) => { setSearch(q); setPage(1); };

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return Object.values(metrics.stockMap).filter((item: any) =>
      !q || item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );
  }, [metrics.stockMap, search]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in" style={{ color: D.text }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3"
        style={{ borderBottom: `1px solid ${D.border}` }}>
        <h2 className="text-xl font-semibold" style={{ color: D.text }}>Database & Stok Barang</h2>
        <MonthFilter value={filterMonth} onChange={onFilterMonthChange} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: D.muted }} />
          <input value={search} onChange={e => handleSearchChange(e.target.value)}
            placeholder="Cari SKU atau nama produk..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none"
            style={{ background: D.elevated, border: `1px solid ${D.border}`, color: D.text }} />
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition shrink-0"
          style={{ background: D.accent, color: '#fff' }}>
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="p-5 space-y-4 rounded-xl"
          style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <p className="text-xs font-semibold uppercase" style={{ color: D.muted }}>Daftarkan Produk Baru</p>
          <div className="flex items-center gap-4">
            {imagePreview
              ? <img src={imagePreview} alt="preview" className="w-20 h-20 object-cover rounded-xl shrink-0" style={{ border: `1px solid ${D.border}` }} />
              : <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ background: D.elevated }}><ImageOff size={24} style={{ color: D.muted }} /></div>
            }
            <div className="space-y-1">
              <label className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-sm" style={{ border: '1px dashed #ffffff20', color: D.muted }}>
                <Upload size={16} /> {imagePreview ? 'Ganti Foto' : 'Upload Foto Produk'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              <p className="text-[11px]" style={{ color: '#4b5563' }}>Format: JPG, PNG, WEBP · Maks. 2 MB</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div><label style={lbl}>SKU</label><input required value={newInv.sku} onChange={e => setNewInv({ ...newInv, sku: e.target.value })} placeholder="TS-001" style={inp} /></div>
            <div><label style={lbl}>Nama Produk</label><input required value={newInv.name} onChange={e => setNewInv({ ...newInv, name: e.target.value })} placeholder="Kaos Polos Hitam" style={inp} /></div>
            <div><label style={lbl}>HPP (Modal)</label><input required type="number" value={newInv.hpp} onChange={e => setNewInv({ ...newInv, hpp: e.target.value })} placeholder="40000" style={inp} /></div>
            <div>
              <label style={lbl}>Harga Jual</label>
              <div className="flex gap-2">
                <input required type="number" value={newInv.price} onChange={e => setNewInv({ ...newInv, price: e.target.value })} placeholder="85000" style={inp} />
                <button type="submit" disabled={uploading} className="p-2 rounded-lg transition disabled:opacity-60 shrink-0"
                  style={{ background: D.accent, color: '#fff' }}>
                  {uploading ? '...' : <Plus size={20} />}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {filteredItems.length === 0
        ? <div className="text-center py-16 text-sm" style={{ color: D.muted }}>
            {search ? `Tidak ada produk dengan kata kunci "${search}"` : 'Belum ada barang di database.'}
          </div>
        : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {paginatedItems.map((item: any) => (
                <ProductCard key={item.sku} item={item}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => onDeleteInventory(item.sku)}
                  onRestock={() => setRestockingItem(item)}
                />
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs" style={{ color: D.muted }}>{filteredItems.length} produk · halaman {page} dari {totalPages}</p>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )
      }

      {editingItem && (
        <EditModal item={editingItem} onClose={() => setEditingItem(null)}
          onSave={(oldSku, updated) => { onUpdateInventory(oldSku, updated); setEditingItem(null); }}
          onUploadError={onUploadError} />
      )}
      {restockingItem && (
        <RestockModal item={restockingItem}
          restockHistory={(storeData.restocks || []).filter((r: RestockItem) => r.sku === restockingItem.sku)}
          onClose={() => setRestockingItem(null)}
          onAddRestock={onAddRestock}
          onDeleteRestock={onDeleteRestock} />
      )}
    </div>
  );
}
