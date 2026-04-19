import { useState, useEffect, useRef } from 'react';
import { collection, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { X, RotateCcw, Database, AlertTriangle, ChevronDown, ChevronUp, Download, Upload, CheckCircle, XCircle } from 'lucide-react';
import type { StoreData } from '../types';

const D = {
  surface: '#13131a', elevated: '#1a1a24', border: '#ffffff0d',
  accent: '#8b5cf6', accentDim: '#8b5cf615',
  text: '#f1f0f5', muted: '#6b7280',
  success: '#10b981', successDim: '#10b98115',
  danger: '#ef4444', dangerDim: '#ef444415',
  warning: '#f59e0b', warningDim: '#f59e0b15',
};

interface BackupEntry {
  id: string;
  backedUpAt: string;
  data: StoreData;
}

interface ImportResult {
  added: { inventory: number; restocks: number; sales: number; fnbSales: number; expenses: number };
  skipped: { inventory: number; restocks: number; sales: number; fnbSales: number; expenses: number };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeStore: string;
  storeData: StoreData;
  onRestore: (data: StoreData) => Promise<void>;
  onMerge: (data: StoreData) => Promise<void>;
}

type Tab = 'backup' | 'export' | 'import';

export default function BackupRestoreModal({ isOpen, onClose, activeStore, storeData, onRestore, onMerge }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('backup');

  // Backup tab state
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Import tab state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const [parsedData, setParsedData] = useState<StoreData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (!isOpen || !activeStore) return;
    fetchBackups();
  }, [isOpen, activeStore]);

  useEffect(() => {
    if (activeTab !== 'import') {
      setImportStatus('idle');
      setImportError('');
      setParsedData(null);
      setImportResult(null);
    }
  }, [activeTab]);

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const backupsRef = collection(doc(db, 'stores', activeStore), 'backups');
      const q = query(backupsRef, orderBy('backedUpAt', 'desc'));
      const snap = await getDocs(q);
      const results: BackupEntry[] = snap.docs.map(d => ({
        id: d.id,
        backedUpAt: d.data().backedUpAt,
        data: d.data() as StoreData,
      }));
      setBackups(results);
    } catch (err) {
      console.error('[BackupRestoreModal] Gagal fetch backups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleRestore = async (entry: BackupEntry) => {
    setIsRestoring(true);
    try {
      await onRestore(entry.data);
      onClose();
    } finally {
      setIsRestoring(false);
      setConfirmingId(null);
    }
  };

  // ==============================
  // EXPORT JSON
  // ==============================
  const handleExportJson = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      storeCode: activeStore,
      storeType: storeData.storeType,
      inventory: storeData.inventory || [],
      restocks: storeData.restocks || [],
      sales: storeData.sales || [],
      fnbSales: storeData.fnbSales || [],
      expenses: storeData.expenses || [],
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `systempos-${activeStore}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==============================
  // IMPORT JSON
  // ==============================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('parsing');
    setImportError('');
    setParsedData(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);

        if (typeof raw !== 'object' || raw === null) throw new Error('File JSON tidak valid');
        if (!Array.isArray(raw.inventory)) throw new Error('Field "inventory" tidak ditemukan atau bukan array');

        const parsed: StoreData = {
          storeType: raw.storeType || storeData.storeType,
          inventory: raw.inventory || [],
          restocks: raw.restocks || [],
          sales: raw.sales || [],
          fnbSales: raw.fnbSales || [],
          expenses: raw.expenses || [],
        };

        setParsedData(parsed);
        setImportStatus('preview');
      } catch (err: unknown) {
        setImportError(err instanceof Error ? err.message : 'Gagal membaca file JSON');
        setImportStatus('error');
      }
    };
    reader.onerror = () => {
      setImportError('Gagal membaca file');
      setImportStatus('error');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setImportStatus('importing');

    // Merge strategy: skip kalau ID/SKU sudah ada
    const existingSkus = new Set(storeData.inventory.map(i => i.sku));
    const existingRestockIds = new Set((storeData.restocks || []).map(r => r.id));
    const existingSaleIds = new Set((storeData.sales || []).map(s => s.id));
    const existingFnbSaleIds = new Set((storeData.fnbSales || []).map(s => s.id));
    const existingExpenseIds = new Set((storeData.expenses || []).map(e => e.id));

    const newInventory = parsedData.inventory.filter(i => !existingSkus.has(i.sku));
    const newRestocks = (parsedData.restocks || []).filter(r => !existingRestockIds.has(r.id));
    const newSales = (parsedData.sales || []).filter(s => !existingSaleIds.has(s.id));
    const newFnbSales = (parsedData.fnbSales || []).filter(s => !existingFnbSaleIds.has(s.id));
    const newExpenses = (parsedData.expenses || []).filter(e => !existingExpenseIds.has(e.id));

    const result: ImportResult = {
      added: {
        inventory: newInventory.length,
        restocks: newRestocks.length,
        sales: newSales.length,
        fnbSales: newFnbSales.length,
        expenses: newExpenses.length,
      },
      skipped: {
        inventory: parsedData.inventory.length - newInventory.length,
        restocks: (parsedData.restocks || []).length - newRestocks.length,
        sales: (parsedData.sales || []).length - newSales.length,
        fnbSales: (parsedData.fnbSales || []).length - newFnbSales.length,
        expenses: (parsedData.expenses || []).length - newExpenses.length,
      },
    };

    const mergedData: StoreData = {
      storeType: storeData.storeType,
      inventory: [...storeData.inventory, ...newInventory],
      restocks: [...(storeData.restocks || []), ...newRestocks],
      sales: [...(storeData.sales || []), ...newSales],
      fnbSales: [...(storeData.fnbSales || []), ...newFnbSales],
      expenses: [...(storeData.expenses || []), ...newExpenses],
    };

    try {
      await onMerge(mergedData);
      setImportResult(result);
      setImportStatus('done');
    } catch {
      setImportError('Gagal menyimpan data ke Firestore. Coba lagi.');
      setImportStatus('error');
    }
  };

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string; icon: typeof Database }[] = [
    { id: 'backup', label: 'Restore', icon: RotateCcw },
    { id: 'export', label: 'Export JSON', icon: Download },
    { id: 'import', label: 'Import JSON', icon: Upload },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#000000aa' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{ background: D.surface, border: `1px solid ${D.border}`, maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: D.border }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.accentDim }}>
              <Database size={16} style={{ color: D.accent }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: D.text }}>Data Manager</p>
              <p className="text-xs" style={{ color: D.muted }}>Backup · Export · Import</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition"
            style={{ color: D.muted }}
            onMouseEnter={e => (e.currentTarget.style.background = D.border)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-4 gap-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition"
                style={{
                  background: isActive ? D.accentDim : 'transparent',
                  color: isActive ? D.accent : D.muted,
                  border: `1px solid ${isActive ? D.accent + '33' : 'transparent'}`,
                }}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ======================== TAB: BACKUP RESTORE ======================== */}
        {activeTab === 'backup' && (
          <>
            <div className="mx-5 mt-4 px-4 py-3 rounded-xl flex gap-3 items-start" style={{ background: D.warningDim, border: `1px solid ${D.warning}22` }}>
              <AlertTriangle size={15} style={{ color: D.warning, marginTop: 1, flexShrink: 0 }} />
              <p className="text-xs leading-relaxed" style={{ color: D.warning }}>
                Restore akan <strong>menimpa data saat ini</strong> dengan data dari backup yang dipilih. Aksi ini tidak bisa dibatalkan.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: D.accent, borderTopColor: 'transparent' }} />
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-12">
                  <Database size={32} style={{ color: D.muted, margin: '0 auto 12px' }} />
                  <p className="text-sm" style={{ color: D.muted }}>Belum ada backup tersedia</p>
                </div>
              ) : (
                backups.map((entry, idx) => {
                  const isExpanded = expandedId === entry.id;
                  const isConfirming = confirmingId === entry.id;
                  const invCount = entry.data.inventory?.length || 0;
                  const salesCount = (entry.data.sales?.length || 0) + (entry.data.fnbSales?.length || 0);
                  const expCount = entry.data.expenses?.length || 0;

                  return (
                    <div key={entry.id} className="rounded-xl overflow-hidden" style={{ background: D.elevated, border: `1px solid ${D.border}` }}>
                      <div className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: D.accentDim, color: D.accent }}>
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: D.text }}>{formatDate(entry.backedUpAt)}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: D.muted }}>{invCount} produk · {salesCount} transaksi · {expCount} pengeluaran</p>
                          </div>
                        </div>
                        <button onClick={() => setExpandedId(isExpanded ? null : entry.id)} className="shrink-0 p-1.5 rounded-lg" style={{ color: D.muted }}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t pt-3" style={{ borderColor: D.border }}>
                          <div className="grid grid-cols-3 gap-2">
                            {[{ label: 'Produk', val: invCount }, { label: 'Transaksi', val: salesCount }, { label: 'Pengeluaran', val: expCount }].map(item => (
                              <div key={item.label} className="rounded-lg px-3 py-2 text-center" style={{ background: D.surface }}>
                                <p className="text-base font-bold" style={{ color: D.accent }}>{item.val}</p>
                                <p className="text-[10px]" style={{ color: D.muted }}>{item.label}</p>
                              </div>
                            ))}
                          </div>
                          {!isConfirming ? (
                            <button
                              onClick={() => setConfirmingId(entry.id)}
                              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                              style={{ background: D.accentDim, color: D.accent, border: `1px solid ${D.accent}33` }}
                            >
                              <RotateCcw size={14} /> Restore Backup Ini
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-center font-medium" style={{ color: D.warning }}>⚠️ Data saat ini akan ditimpa. Lanjutkan?</p>
                              <div className="flex gap-2">
                                <button onClick={() => setConfirmingId(null)} className="flex-1 py-2 rounded-xl text-xs font-medium" style={{ background: D.surface, color: D.muted, border: `1px solid ${D.border}` }}>Batal</button>
                                <button
                                  onClick={() => handleRestore(entry)}
                                  disabled={isRestoring}
                                  className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                                  style={{ background: D.danger, color: '#fff' }}
                                >
                                  {isRestoring ? <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> : <RotateCcw size={13} />}
                                  Ya, Restore
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3 border-t" style={{ borderColor: D.border }}>
              <p className="text-[10px] text-center" style={{ color: D.muted }}>Maksimal 7 backup tersimpan · Diperbarui otomatis setiap buka aplikasi</p>
            </div>
          </>
        )}

        {/* ======================== TAB: EXPORT JSON ======================== */}
        {activeTab === 'export' && (
          <div className="flex-1 flex flex-col px-5 py-6 gap-4">
            <div className="rounded-xl p-4 space-y-2" style={{ background: D.elevated, border: `1px solid ${D.border}` }}>
              <p className="text-xs font-semibold mb-3" style={{ color: D.text }}>Isi file yang akan di-export:</p>
              {[
                { label: 'Produk', val: storeData.inventory?.length || 0 },
                { label: 'Restock', val: storeData.restocks?.length || 0 },
                { label: 'Penjualan Fashion', val: storeData.sales?.length || 0 },
                { label: 'Penjualan FnB', val: storeData.fnbSales?.length || 0 },
                { label: 'Pengeluaran', val: storeData.expenses?.length || 0 },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: D.muted }}>{item.label}</p>
                  <p className="text-xs font-medium" style={{ color: D.text }}>{item.val} data</p>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 rounded-xl flex gap-3 items-start" style={{ background: D.successDim, border: `1px solid ${D.success}22` }}>
              <CheckCircle size={15} style={{ color: D.success, marginTop: 1, flexShrink: 0 }} />
              <p className="text-xs leading-relaxed" style={{ color: D.success }}>
                File JSON ini bisa di-import kembali ke toko manapun. Semua field Firestore ikut ter-export.
              </p>
            </div>

            <button
              onClick={handleExportJson}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
              style={{ background: D.accent, color: '#fff' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Download size={15} />
              Download JSON
            </button>
          </div>
        )}

        {/* ======================== TAB: IMPORT JSON ======================== */}
        {activeTab === 'import' && (
          <div className="flex-1 flex flex-col px-5 py-6 gap-4 overflow-y-auto">

            {(importStatus === 'idle' || importStatus === 'parsing') && (
              <>
                <div className="px-4 py-3 rounded-xl flex gap-3 items-start" style={{ background: D.warningDim, border: `1px solid ${D.warning}22` }}>
                  <AlertTriangle size={15} style={{ color: D.warning, marginTop: 1, flexShrink: 0 }} />
                  <p className="text-xs leading-relaxed" style={{ color: D.warning }}>
                    Data yang sudah ada <strong>tidak akan ditimpa</strong>. Hanya data baru (SKU/ID berbeda) yang akan ditambahkan.
                  </p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importStatus === 'parsing'}
                  className="w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition"
                  style={{ borderColor: D.accent + '44', background: D.accentDim, color: D.accent }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = D.accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = D.accent + '44')}
                >
                  {importStatus === 'parsing' ? (
                    <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: D.accent, borderTopColor: 'transparent' }} />
                  ) : (
                    <Upload size={24} />
                  )}
                  <div className="text-center">
                    <p className="text-sm font-semibold">{importStatus === 'parsing' ? 'Membaca file...' : 'Pilih file JSON'}</p>
                    <p className="text-xs mt-0.5" style={{ color: D.muted }}>Format: systempos-{activeStore}-*.json</p>
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
              </>
            )}

            {importStatus === 'error' && (
              <div className="space-y-4">
                <div className="rounded-xl p-4 flex gap-3 items-start" style={{ background: D.dangerDim, border: `1px solid ${D.danger}22` }}>
                  <XCircle size={15} style={{ color: D.danger, marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: D.danger }}>Gagal membaca file</p>
                    <p className="text-xs mt-1" style={{ color: D.muted }}>{importError}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setImportStatus('idle'); setImportError(''); }}
                  className="w-full py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: D.elevated, color: D.text, border: `1px solid ${D.border}` }}
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {importStatus === 'preview' && parsedData && (
              <div className="space-y-4">
                <p className="text-xs font-semibold" style={{ color: D.text }}>Preview data yang akan diimport:</p>

                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
                  {[
                    { label: 'Produk', count: parsedData.inventory?.length || 0 },
                    { label: 'Restock', count: parsedData.restocks?.length || 0 },
                    { label: 'Penjualan Fashion', count: parsedData.sales?.length || 0 },
                    { label: 'Penjualan FnB', count: parsedData.fnbSales?.length || 0 },
                    { label: 'Pengeluaran', count: parsedData.expenses?.length || 0 },
                  ].map((item, i) => (
                    <div key={item.label} className="flex items-center justify-between px-4 py-3" style={{ background: i % 2 === 0 ? D.elevated : D.surface }}>
                      <p className="text-xs" style={{ color: D.muted }}>{item.label}</p>
                      <p className="text-xs font-medium" style={{ color: D.accent }}>{item.count} data</p>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 rounded-xl flex gap-3 items-start" style={{ background: D.accentDim, border: `1px solid ${D.accent}22` }}>
                  <AlertTriangle size={15} style={{ color: D.accent, marginTop: 1, flexShrink: 0 }} />
                  <p className="text-xs leading-relaxed" style={{ color: D.accent }}>
                    Data dengan SKU/ID yang sama akan di-skip. Hanya data baru yang masuk.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setImportStatus('idle'); setParsedData(null); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: D.elevated, color: D.muted, border: `1px solid ${D.border}` }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: D.accent, color: '#fff' }}
                  >
                    <Upload size={14} /> Import Sekarang
                  </button>
                </div>
              </div>
            )}

            {importStatus === 'importing' && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: D.accent, borderTopColor: 'transparent' }} />
                <p className="text-sm" style={{ color: D.muted }}>Menyimpan data...</p>
              </div>
            )}

            {importStatus === 'done' && importResult && (
              <div className="space-y-4">
                <div className="rounded-xl p-4 flex gap-3 items-start" style={{ background: D.successDim, border: `1px solid ${D.success}22` }}>
                  <CheckCircle size={15} style={{ color: D.success, marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: D.success }}>Import berhasil!</p>
                    <p className="text-xs mt-0.5" style={{ color: D.muted }}>Data sudah tersimpan ke Firestore.</p>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
                  <div className="grid grid-cols-3 px-4 py-2" style={{ background: D.elevated }}>
                    <p className="text-[10px] font-semibold" style={{ color: D.muted }}>Field</p>
                    <p className="text-[10px] font-semibold text-center" style={{ color: D.success }}>Ditambah</p>
                    <p className="text-[10px] font-semibold text-center" style={{ color: D.muted }}>Di-skip</p>
                  </div>
                  {[
                    { label: 'Produk', added: importResult.added.inventory, skipped: importResult.skipped.inventory },
                    { label: 'Restock', added: importResult.added.restocks, skipped: importResult.skipped.restocks },
                    { label: 'Penjualan', added: importResult.added.sales + importResult.added.fnbSales, skipped: importResult.skipped.sales + importResult.skipped.fnbSales },
                    { label: 'Pengeluaran', added: importResult.added.expenses, skipped: importResult.skipped.expenses },
                  ].map((item, i) => (
                    <div key={item.label} className="grid grid-cols-3 px-4 py-2.5" style={{ background: i % 2 === 0 ? D.surface : D.elevated }}>
                      <p className="text-xs" style={{ color: D.muted }}>{item.label}</p>
                      <p className="text-xs font-semibold text-center" style={{ color: item.added > 0 ? D.success : D.muted }}>{item.added}</p>
                      <p className="text-xs text-center" style={{ color: D.muted }}>{item.skipped}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: D.accent, color: '#fff' }}
                >
                  Selesai
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
