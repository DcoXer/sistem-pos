import { useState, useEffect } from 'react';
import { collection, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { X, RotateCcw, Database, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeStore: string;
  onRestore: (data: StoreData) => void;
}

export default function BackupRestoreModal({ isOpen, onClose, activeStore, onRestore }: Props) {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!isOpen || !activeStore) return;
    fetchBackups();
  }, [isOpen, activeStore]);

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

  if (!isOpen) return null;

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
              <p className="text-sm font-semibold" style={{ color: D.text }}>Restore Backup</p>
              <p className="text-xs" style={{ color: D.muted }}>Pilih titik backup untuk dikembalikan</p>
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

        {/* Warning */}
        <div className="mx-5 mt-4 px-4 py-3 rounded-xl flex gap-3 items-start" style={{ background: D.warningDim, border: `1px solid ${D.warning}22` }}>
          <AlertTriangle size={15} style={{ color: D.warning, marginTop: 1, flexShrink: 0 }} />
          <p className="text-xs leading-relaxed" style={{ color: D.warning }}>
            Restore akan <strong>menimpa data saat ini</strong> dengan data dari backup yang dipilih. Aksi ini tidak bisa dibatalkan.
          </p>
        </div>

        {/* List */}
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
                <div
                  key={entry.id}
                  className="rounded-xl overflow-hidden"
                  style={{ background: D.elevated, border: `1px solid ${D.border}` }}
                >
                  {/* Row */}
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: D.accentDim, color: D.accent }}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: D.text }}>
                          {formatDate(entry.backedUpAt)}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: D.muted }}>
                          {invCount} produk · {salesCount} transaksi · {expCount} pengeluaran
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="shrink-0 p-1.5 rounded-lg transition"
                      style={{ color: D.muted }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t pt-3" style={{ borderColor: D.border }}>
                      {/* Detail counts */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Produk', val: invCount },
                          { label: 'Transaksi', val: salesCount },
                          { label: 'Pengeluaran', val: expCount },
                        ].map(item => (
                          <div key={item.label} className="rounded-lg px-3 py-2 text-center" style={{ background: D.surface }}>
                            <p className="text-base font-bold" style={{ color: D.accent }}>{item.val}</p>
                            <p className="text-[10px]" style={{ color: D.muted }}>{item.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Confirm / Restore */}
                      {!isConfirming ? (
                        <button
                          onClick={() => setConfirmingId(entry.id)}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                          style={{ background: D.accentDim, color: D.accent, border: `1px solid ${D.accent}33` }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#8b5cf625')}
                          onMouseLeave={e => (e.currentTarget.style.background = D.accentDim)}
                        >
                          <RotateCcw size={14} />
                          Restore Backup Ini
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-center font-medium" style={{ color: D.warning }}>
                            ⚠️ Data saat ini akan ditimpa. Lanjutkan?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="flex-1 py-2 rounded-xl text-xs font-medium transition"
                              style={{ background: D.surface, color: D.muted, border: `1px solid ${D.border}` }}
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleRestore(entry)}
                              disabled={isRestoring}
                              className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                              style={{ background: D.danger, color: '#fff' }}
                            >
                              {isRestoring ? (
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
                              ) : (
                                <RotateCcw size={13} />
                              )}
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

        {/* Footer */}
        <div className="px-5 py-3 border-t" style={{ borderColor: D.border }}>
          <p className="text-[10px] text-center" style={{ color: D.muted }}>
            Maksimal 7 backup tersimpan · Diperbarui otomatis setiap buka aplikasi
          </p>
        </div>
      </div>
    </div>
  );
}
