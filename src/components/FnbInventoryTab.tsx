import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Pencil, X, Check, Upload, ImageOff, Search } from 'lucide-react';
import type { InventoryItem } from '../types';
import Pagination from './Pagination';
import MonthFilter from './MonthFilter';

const formatRp = (num: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(num);

async function uploadImage(file: File, sku: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'POS-System');
  formData.append('public_id', `products/${sku}-${Date.now()}`);
  const res = await fetch('https://api.cloudinary.com/v1_1/dtfyfx9zr/image/upload', {
    method: 'POST', body: formData,
  });
  if (!res.ok) throw new Error('Upload gagal');
  return (await res.json()).secure_url;
}

interface FnbInventoryTabProps {
  metrics: any;
  filterMonth: string;
  onFilterMonthChange: (val: string) => void;
  onAddInventory: (item: InventoryItem) => void;
  onDeleteInventory: (sku: string) => void;
  onUpdateInventory: (oldSku: string, item: InventoryItem) => void;
  onUploadError: (msg: string) => void;
}

function EditModal({ item, onClose, onSave, onUploadError }: {
  item: InventoryItem;
  onClose: () => void;
  onSave: (oldSku: string, updated: InventoryItem) => void;
  onUploadError: (msg: string) => void;
}) {
  const [form, setForm] = useState({ sku: item.sku, name: item.name, hpp: String(item.hpp), price: String(item.price) });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(item.imageUrl ?? undefined);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { onUploadError('Ukuran foto terlalu besar. Maksimal 2 MB.'); e.target.value = ''; return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    let imageUrl = item.imageUrl;
    if (imageFile) {
      try { imageUrl = await uploadImage(imageFile, form.sku); }
      catch { onUploadError('Foto gagal diupload. Pastikan ukuran foto tidak lebih dari 2 MB.'); setUploading(false); return; }
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
          <div className="flex items-center gap-4">
            {imagePreview
              ? <img src={imagePreview} alt="preview" className="w-20 h-20 object-cover rounded-xl border" />
              : <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300"><ImageOff size={24} /></div>
            }
            <div className="space-y-1">
              <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 transition text-sm text-gray-500">
                <Upload size={16} /> {imagePreview ? 'Ganti Foto' : 'Upload Foto'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              <p className="text-[11px] text-gray-400">Format: JPG, PNG · Maks. 2 MB</p>
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
              <label className="text-xs font-semibold text-gray-500 uppercase">HPP (Modal)</label>
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

export default function FnbInventoryTab({
  metrics, filterMonth, onFilterMonthChange,
  onAddInventory, onDeleteInventory, onUpdateInventory, onUploadError,
}: FnbInventoryTabProps) {
  const [newInv, setNewInv] = useState({ sku: '', name: '', hpp: '', price: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const PAGE_SIZE = 10;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { onUploadError('Ukuran foto terlalu besar. Maksimal 2 MB.'); e.target.value = ''; return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    let imageUrl: string | null = null;
    if (imageFile) {
      try { imageUrl = await uploadImage(imageFile, newInv.sku); }
      catch { onUploadError('Foto gagal diupload. Pastikan ukuran foto tidak lebih dari 2 MB.'); setUploading(false); return; }
    }
    onAddInventory({ sku: newInv.sku, name: newInv.name, hpp: Number(newInv.hpp), price: Number(newInv.price), imageUrl });
    setNewInv({ sku: '', name: '', hpp: '', price: '' });
    setImageFile(null);
    setImagePreview(undefined);
    setUploading(false);
    setShowForm(false);
  };

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return Object.values(metrics.stockMap).filter((item: any) =>
      !q || item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );
  }, [metrics.stockMap, search]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <h2 className="text-2xl font-bold">Database Produk</h2>
        <MonthFilter value={filterMonth} onChange={onFilterMonthChange} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari SKU atau nama produk..."
            className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition shrink-0">
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Daftarkan Produk Baru</p>
          <div className="flex items-center gap-4">
            {imagePreview
              ? <img src={imagePreview} alt="preview" className="w-20 h-20 object-cover rounded-xl border" />
              : <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300"><ImageOff size={24} /></div>
            }
            <div className="space-y-1">
              <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 transition text-sm text-gray-500">
                <Upload size={16} /> {imagePreview ? 'Ganti Foto' : 'Upload Foto'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              <p className="text-[11px] text-gray-400">Format: JPG, PNG · Maks. 2 MB</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">SKU</label>
              <input required value={newInv.sku} onChange={e => setNewInv({ ...newInv, sku: e.target.value })}
                placeholder="MKN-001" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nama Produk</label>
              <input required value={newInv.name} onChange={e => setNewInv({ ...newInv, name: e.target.value })}
                placeholder="Nasi Goreng" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">HPP (Modal)</label>
              <input required type="number" value={newInv.hpp} onChange={e => setNewInv({ ...newInv, hpp: e.target.value })}
                placeholder="8000" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Harga Jual</label>
              <div className="flex gap-2">
                <input required type="number" value={newInv.price} onChange={e => setNewInv({ ...newInv, price: e.target.value })}
                  placeholder="15000" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <button type="submit" disabled={uploading}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-60">
                  {uploading ? '...' : <Plus size={20} />}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {filteredItems.length === 0
        ? <div className="text-center py-16 text-gray-400">
            {search ? `Tidak ada produk dengan kata kunci "${search}"` : 'Belum ada produk di database.'}
          </div>
        : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {paginatedItems.map((item: any) => (
                <div key={item.sku} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-36 object-cover" />
                    : <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-300"><ImageOff size={28} /></div>
                  }
                  <div className="p-3 flex flex-col flex-1 space-y-2">
                    <div>
                      <p className="text-[10px] text-gray-400 font-mono">{item.sku}</p>
                      <p className="font-bold text-sm text-gray-800 leading-tight">{item.name}</p>
                      <p className="text-sm text-green-600 font-semibold mt-0.5">{formatRp(item.price)}</p>
                      <p className="text-xs text-gray-400">Modal: {formatRp(item.hpp)}</p>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <button onClick={() => setEditingItem(item)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => onDeleteInventory(item.sku)}
                        className="px-2.5 py-1.5 text-xs text-red-400 bg-red-50 hover:bg-red-100 rounded-lg transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-400">{filteredItems.length} produk · halaman {page} dari {totalPages}</p>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )
      }

      {editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(oldSku, updated) => { onUpdateInventory(oldSku, updated); setEditingItem(null); }}
          onUploadError={onUploadError}
        />
      )}
    </div>
  );
}
