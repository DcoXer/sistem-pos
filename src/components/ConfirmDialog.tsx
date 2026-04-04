import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen, title, message, confirmLabel = 'Hapus', onConfirm, onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-start gap-4 p-6">
          <div className="p-2 bg-red-100 rounded-full shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onCancel}
            className="flex-1 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition font-medium">
            Batal
          </button>
          <button onClick={() => { onConfirm(); onCancel(); }}
            className="flex-1 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 transition font-medium">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================
// HOOK — useConfirm
// ==============================
import { useState } from 'react';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Hapus',
    onConfirm: () => {},
  });

  const confirm = (title: string, message: string, onConfirm: () => void, confirmLabel = 'Hapus') => {
    setState({ isOpen: true, title, message, onConfirm, confirmLabel });
  };

  const cancel = () => setState(prev => ({ ...prev, isOpen: false }));

  return { confirmState: state, confirm, cancelConfirm: cancel };
}
