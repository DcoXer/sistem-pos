import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthFilterProps {
  value: string;
  onChange: (val: string) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const D = {
  surface: '#1a1a24',
  border: '#ffffff0d',
  accent: '#8b5cf6',
  text: '#f1f0f5',
  muted: '#6b7280',
};

export default function MonthFilter({ value, onChange }: MonthFilterProps) {
  const [year, month] = value.split('-').map(Number);

  const prev = () => {
    const d = new Date(year, month - 2);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const next = () => {
    const d = new Date(year, month);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() + 1 === month;
  };

  const btnStyle = {
    background: D.surface,
    border: `1px solid ${D.border}`,
    color: D.muted,
    padding: '6px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={prev} style={btnStyle}>
        <ChevronLeft size={15} />
      </button>

      <div className="px-4 py-1.5 rounded-lg flex items-center justify-center min-w-[148px]"
        style={{ background: D.surface, border: `1px solid ${D.border}` }}>
        <span className="text-sm font-medium" style={{ color: D.text }}>
          {MONTH_NAMES[month - 1]} {year}
        </span>
      </div>

      <button onClick={next} disabled={isCurrentMonth()}
        style={{ ...btnStyle, opacity: isCurrentMonth() ? 0.3 : 1, cursor: isCurrentMonth() ? 'not-allowed' : 'pointer' }}>
        <ChevronRight size={15} />
      </button>

      {!isCurrentMonth() && (
        <button
          onClick={() => {
            const now = new Date();
            onChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
          }}
          className="text-xs font-medium px-2 py-1.5 rounded-lg transition"
          style={{ color: D.accent, background: `${D.accent}15` }}
        >
          Bulan Ini
        </button>
      )}
    </div>
  );
}
