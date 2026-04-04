import { ChevronLeft, ChevronRight } from 'lucide-react';

const D = { surface: '#1a1a24', border: '#ffffff0d', accent: '#8b5cf6', text: '#f1f0f5', muted: '#6b7280' };

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPages = (): (number | '...')[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const btn = (active: boolean) => ({
    width: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
    background: active ? D.accent : D.surface,
    color: active ? '#fff' : D.muted,
    border: `1px solid ${active ? D.accent : D.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
        style={{ ...btn(false), opacity: currentPage === 1 ? 0.3 : 1 }}>
        <ChevronLeft size={14} />
      </button>

      {getPages().map((page, i) =>
        page === '...'
          ? <span key={`d${i}`} className="px-1 text-xs" style={{ color: D.muted }}>...</span>
          : (
            <button key={page} onClick={() => onPageChange(page as number)}
              style={btn(currentPage === page)}>
              {page}
            </button>
          )
      )}

      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
        style={{ ...btn(false), opacity: currentPage === totalPages ? 0.3 : 1 }}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
