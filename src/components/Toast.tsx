import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
}

export function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setVisible(true), 10);
    // Auto dismiss setelah 3.5 detik
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3500);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, []);

  const isSuccess = toast.type === 'success';

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${
        isSuccess
          ? 'bg-green-700 border-green-200'
          : 'bg-red-700 border-red-200'
      }`}
    >
      <div className={`shrink-0 mt-0.5 ${isSuccess ? 'text-white' : 'text-white'}`}>
        {isSuccess ? <CheckCircle size={18} /> : <XCircle size={18} />}
      </div>
      <p className="text-sm text-white flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}
        className="shrink-0 text-white hover:text-gray-300 transition mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ==============================
// HOOK
// ==============================
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = (type: ToastType, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const remove = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const success = (message: string) => show('success', message);
  const error = (message: string) => show('error', message);

  return { toasts, remove, success, error };
}
