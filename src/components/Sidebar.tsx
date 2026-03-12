import { LayoutDashboard, Package, ShoppingCart, Receipt, LogOut } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeStore: string;
  handleLogoutStore: () => void;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'stok', icon: Package, label: 'Stok' },
  { id: 'penjualan', icon: ShoppingCart, label: 'Penjualan' },
  { id: 'pengeluaran', icon: Receipt, label: 'Pengeluaran' }
];

export default function Sidebar({ activeTab, setActiveTab, activeStore, handleLogoutStore }: SidebarProps) {
  return (
    <>
      {/* ===================== */}
      {/* DESKTOP SIDEBAR       */}
      {/* ===================== */}
      <nav className="hidden md:flex bg-gray-900 text-white w-64 shrink-0 min-h-screen flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-wider text-blue-400">
            MERCHANT<span className="text-white">OS</span>
          </h1>
          <div className="mt-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Kode Toko Aktif</p>
            <p className="font-mono text-sm text-green-400 font-bold">{activeStore}</p>
          </div>
        </div>

        <ul className="space-y-1 px-3 flex-1">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogoutStore}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition text-sm font-medium"
          >
            <LogOut size={16} />
            <span>Keluar Toko</span>
          </button>
        </div>
      </nav>

      {/* ===================== */}
      {/* MOBILE TOP BAR        */}
      {/* ===================== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="text-base font-bold tracking-wider text-blue-400">
          MERCHANT<span className="text-white">OS</span>
        </h1>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-green-400 font-bold bg-gray-800 px-2 py-1 rounded">
            {activeStore}
          </span>
          <button
            onClick={handleLogoutStore}
            className="p-1.5 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition"
            title="Keluar Toko"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ===================== */}
      {/* MOBILE BOTTOM NAV     */}
      {/* ===================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 flex">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              activeTab === item.id
                ? 'text-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
