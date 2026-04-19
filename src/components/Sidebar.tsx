import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Receipt, 
  LogOut, 
  CalendarCheck,
  RotateCcw,
} from 'lucide-react';
import type { StoreType } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeStore: string;
  storeType?: StoreType;
  handleLogoutStore: () => void;
  onOpenBackupRestore: () => void;
}

const fashionNavItems = [
  { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard'  },
  { id: 'stok',        icon: Package,         label: 'Stok'        },
  { id: 'penjualan',   icon: ShoppingCart,    label: 'Penjualan'   },
  { id: 'pengeluaran', icon: Receipt,         label: 'Pengeluaran' },
  { id: 'closing',     icon: CalendarCheck,   label: 'Closing'     },
];

const fnbNavItems = [
  { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard'  },
  { id: 'stok',        icon: Package,         label: 'Produk'      },
  { id: 'penjualan',   icon: ShoppingCart,    label: 'Kasir'       },
  { id: 'pengeluaran', icon: Receipt,         label: 'Pengeluaran' },
  { id: 'closing',     icon: CalendarCheck,   label: 'Closing'     },
];

export default function Sidebar({ activeTab, setActiveTab, activeStore, storeType, handleLogoutStore, onOpenBackupRestore }: SidebarProps) {
  const navItems = storeType === 'fnb' ? fnbNavItems : fashionNavItems;

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <nav className="hidden md:flex flex-col w-64 shrink-0 min-h-screen border-r"
        style={{ background: '#0d0d14', borderColor: '#ffffff0d' }}>

        {/* Logo */}
        <div className="px-6 py-6 border-b" style={{ borderColor: '#ffffff0d' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
              <Receipt size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide" style={{ color: '#f1f0f5' }}>SystemPOS</p>
              <p className="text-[10px] font-mono" style={{ color: '#8b5cf6' }}>{activeStore}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <ul className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium"
                  style={{
                    background: isActive ? '#8b5cf615' : 'transparent',
                    color: isActive ? '#8b5cf6' : '#6b7280',
                    borderLeft: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                  }}
                >
                  <item.icon size={17} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t space-y-0.5" style={{ borderColor: '#ffffff0d' }}>
          {/* Backup Restore */}
          <button
            onClick={onOpenBackupRestore}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium"
            style={{ color: '#6b7280' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#8b5cf6'; (e.currentTarget as HTMLElement).style.background = '#8b5cf615'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <RotateCcw size={17} />
            <span>Restore Backup</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogoutStore}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium"
            style={{ color: '#6b7280' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = '#ef444410'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <LogOut size={17} />
            <span>Keluar Toko</span>
          </button>
        </div>
      </nav>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: '#0d0d14', borderColor: '#ffffff0d' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
            <Receipt size={13} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: '#f1f0f5' }}>SystemPOS</p>
            <p className="text-[9px] font-mono" style={{ color: '#8b5cf6' }}>{activeStore}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Backup restore button mobile */}
          <button
            onClick={onOpenBackupRestore}
            className="p-1.5 rounded-lg transition"
            style={{ color: '#6b7280' }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={handleLogoutStore}
            className="p-1.5 rounded-lg transition"
            style={{ color: '#ef4444' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{ background: '#0d0d14', borderColor: '#ffffff0d' }}>
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all"
              style={{ color: isActive ? '#8b5cf6' : '#4b5563' }}
            >
              <item.icon size={18} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
