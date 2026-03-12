import { LayoutDashboard, Package, ShoppingCart, Receipt, LogOut } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeStore: string;
  handleLogoutStore: () => void;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'stok', icon: Package, label: 'Database Stok' },
  { id: 'penjualan', icon: ShoppingCart, label: 'Penjualan' },
  { id: 'pengeluaran', icon: Receipt, label: 'Pengeluaran' }
];

export default function Sidebar({ activeTab, setActiveTab, activeStore, handleLogoutStore }: SidebarProps) {
  return (
    <nav className="bg-gray-900 text-white w-full md:w-64 shrink-0 md:min-h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-wider text-blue-400">MERCHANT<span className="text-white">OS</span></h1>
        <div className="mt-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700 flex justify-between items-center">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Kode Toko Aktif</p>
            <p className="font-mono text-sm text-green-400 font-bold">{activeStore}</p>
          </div>
        </div>
      </div>
      
      <ul className="space-y-1 px-3 flex-1">
        {navItems.map(item => (
          <li key={item.id}>
            <button
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="p-4 border-t border-gray-800">
        <button onClick={handleLogoutStore} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition text-sm font-medium">
          <LogOut size={16} />
          <span>Keluar Toko</span>
        </button>
      </div>
    </nav>
  );
}
