import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthFilterProps {
  value: string; // format: "YYYY-MM"
  onChange: (val: string) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function MonthFilter({ value, onChange }: MonthFilterProps) {
  const [year, month] = value.split('-').map(Number);

  const prev = () => {
    const d = new Date(year, month - 2); // month-2 karena month 1-indexed
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const next = () => {
    const d = new Date(year, month); // month sudah 1-indexed, jadi ini = bulan berikutnya
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() + 1 === month;
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={prev}
        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-500"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-lg min-w-[160px] justify-center">
        <span className="text-sm font-semibold text-gray-700">
          {MONTH_NAMES[month - 1]} {year}
        </span>
      </div>

      <button
        onClick={next}
        disabled={isCurrentMonth()}
        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} />
      </button>

      {!isCurrentMonth() && (
        <button
          onClick={() => {
            const now = new Date();
            onChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
          }}
          className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1.5 rounded-lg hover:bg-blue-50 transition"
        >
          Bulan Ini
        </button>
      )}
    </div>
  );
}
