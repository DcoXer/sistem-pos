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
      {toasts.map(toast => <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />)}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3500);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, []);

  const isSuccess = toast.type === 'success';

  return (
    <div
      className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-300"
      style={{
        background: '#1a1a24',
        border: `1px solid ${isSuccess ? '#10b98130' : '#ef444430'}`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        boxShadow: '0 8px 32px #00000060',
      }}
    >
      <div className="shrink-0 mt-0.5" style={{ color: isSuccess ? '#10b981' : '#ef4444' }}>
        {isSuccess ? <CheckCircle size={16} /> : <XCircle size={16} />}
      </div>
      <p className="text-sm flex-1 leading-snug" style={{ color: '#f1f0f5' }}>{toast.message}</p>
      <button onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}
        className="shrink-0 mt-0.5" style={{ color: '#4b5563' }}>
        <X size={13} />
      </button>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const show = (type: ToastType, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
  };
  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));
  return { toasts, remove, success: (m: string) => show('success', m), error: (m: string) => show('error', m) };
}
