import { Download, DollarSign, TrendingUp, TrendingDown, Box, Package } from 'lucide-react';

const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subValue?: string;
  comment?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, subValue, comment }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="flex justify-between items-start">
      <div>
        <p className={`text-sm font-medium ${color.includes('red') ? 'text-red-500' : 'text-gray-500'}`}>{title}</p>
        <h3 className={`text-2xl font-bold mt-1 ${color.includes('red') ? 'text-red-600' : 'text-gray-800'}`}>
          {value} {subValue && <span className="text-base font-normal text-gray-500">{subValue}</span>}
        </h3>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} />
      </div>
    </div>
    {comment && <p className="text-xs text-gray-400 mt-2">{comment}</p>}
  </div>
);

interface DashboardTabProps {
  metrics: any;
  handleExportData: () => void;
}

export default function DashboardTab({ metrics, handleExportData }: DashboardTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Laporan Eksekutif</h2>
          <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold mt-2">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Cloud Synced
          </span>
        </div>
        <button 
          onClick={handleExportData}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
        >
          <Download size={18} />
          <span>Export ke Excel</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Omzet" value={formatRp(metrics.totalRevenue)} icon={DollarSign} color="bg-green-100 text-green-600" />
        <MetricCard 
          title="Laba Bersih" 
          value={formatRp(metrics.netProfit)} 
          icon={metrics.netProfit < 0 ? TrendingDown : TrendingUp} 
          color={metrics.netProfit < 0 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} 
        />
        <MetricCard title="Stok Tersedia" value={metrics.totalStockPcs} subValue="pcs" icon={Box} color="bg-purple-100 text-purple-600" />
        <MetricCard 
          title="Nilai Aset Stok Mati" 
          value={formatRp(metrics.deadStockValue)} 
          icon={Package} 
          color="bg-red-50 text-red-400"
          comment="Modal uang di gudang belum jadi duit"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg mb-4">Rincian Laba Rugi</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Pendapatan Kotor (Omzet)</span><span className="font-medium">{formatRp(metrics.totalRevenue)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">HPP (Modal Barang Laku)</span><span className="font-medium text-red-500">- {formatRp(metrics.totalHppSold)}</span></div>
            <div className="flex justify-between text-sm border-t pt-2"><span className="text-gray-800 font-bold">Laba Kotor</span><span className="font-bold">{formatRp(metrics.grossProfit)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Total Pengeluaran Operasional</span><span className="font-medium text-red-500">- {formatRp(metrics.totalExpenses)}</span></div>
            <div className="flex justify-between text-lg border-t pt-2"><span className="text-gray-800 font-bold">Laba Bersih</span><span className={`font-bold ${metrics.netProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatRp(metrics.netProfit)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
