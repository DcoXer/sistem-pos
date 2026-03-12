import { useState } from "react";
import { Users, Key } from 'lucide-react';

interface AuthScreenProps {
  setActiveStore: (code: string) => void;
}

export default function AuthScreen({ setActiveStore }: AuthScreenProps) {
  const [storeCodeInput, setStoreCodeInput] = useState('');

  const handleJoinStore = (e: React.FormEvent) => {
    e.preventDefault();
    const code = storeCodeInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!code) return;
    setActiveStore(code);
    localStorage.setItem('merchantOsStoreCode', code);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
          <Users size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">MerchantOS <span className="text-blue-600">Cloud</span></h1>
        <p className="text-gray-500 text-sm mb-8">Masukkan Kode Toko untuk sinkronisasi data dengan partner bisnis lu secara real-time.</p>
        
        <form onSubmit={handleJoinStore} className="space-y-4">
          <div className="text-left">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kode Toko (Bebas bikin)</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Key size={18} />
              </div>
              <input 
                type="text" 
                required
                value={storeCodeInput}
                onChange={e => setStoreCodeInput(e.target.value.toUpperCase())}
                placeholder="Contoh: BAJU-KITA-123" 
                className="pl-10 w-full border-2 border-gray-200 rounded-xl p-3 text-lg font-bold tracking-widest focus:ring-0 focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-blue-200">
            Masuk / Buat Toko Baru
          </button>
        </form>
      </div>
    </div>
  );
}
