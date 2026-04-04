import { X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const D = { surface: '#13131a', elevated: '#1a1a24', border: '#ffffff0d', accent: '#8b5cf6', text: '#f1f0f5', muted: '#6b7280', danger: '#ef4444', dangerDim: '#ef444415' };

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Hapus', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: '#00000080' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
        <div className="flex items-start gap-4 p-5">
          <div className="p-2 rounded-lg shrink-0" style={{ background: D.dangerDim }}>
            <AlertTriangle size={18} style={{ color: D.danger }} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold" style={{ color: D.text }}>{title}</h3>
            <p className="text-sm mt-1" style={{ color: D.muted }}>{message}</p>
          </div>
          <button onClick={onCancel} style={{ color: D.muted }}><X size={17} /></button>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onCancel}
            className="flex-1 py-2 text-sm rounded-lg font-medium transition"
            style={{ background: D.elevated, color: D.muted, border: `1px solid ${D.border}` }}>
            Batal
          </button>
          <button onClick={() => { onConfirm(); onCancel(); }}
            className="flex-1 py-2 text-sm rounded-lg font-medium transition"
            style={{ background: D.danger, color: '#fff' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmState {
  isOpen: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ isOpen: false, title: '', message: '', confirmLabel: 'Hapus', onConfirm: () => {} });
  const confirm = (title: string, message: string, onConfirm: () => void, confirmLabel = 'Hapus') =>
    setState({ isOpen: true, title, message, onConfirm, confirmLabel });
  const cancel = () => setState(prev => ({ ...prev, isOpen: false }));
  return { confirmState: state, confirm, cancelConfirm: cancel };
}
