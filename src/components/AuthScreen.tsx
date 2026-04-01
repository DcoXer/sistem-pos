import { useState } from "react";
import { Users, Key, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { StoreType } from '../types';
import { db } from '../firebase';

interface AuthScreenProps {
  setActiveStore: (code: string) => void;
}

type Step = 'input_code' | 'set_type' | 'set_password' | 'input_password';

export default function AuthScreen({ setActiveStore }: AuthScreenProps) {
  const [storeCodeInput, setStoreCodeInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeType, setStoreType] = useState<StoreType>('fashion');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>('input_code');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: cek apakah toko sudah ada di Firestore
  const handleCheckStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = storeCodeInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!code) return;

    setIsLoading(true);
    setError('');

    try {
      // Pastikan anonymous auth sudah ada sebelum akses Firestore
      const { auth } = await import('../firebase');
      const { signInAnonymously } = await import('firebase/auth');
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const docRef = doc(db, 'stores', code);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.password) {
          // Toko sudah ada dan punya password
          setStep('input_password');
        } else {
          // Toko ada tapi belum punya password (data lama) — langsung masuk
          setActiveStore(code);
          localStorage.setItem('merchantOsStoreCode', code);
        }
      } else {
        // Toko baru — pilih tipe toko dulu
        setStep('set_type');
      }
    } catch (err) {
      setError('Gagal cek toko. Periksa koneksi internet lo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2a: set password untuk toko baru
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError('Password minimal 4 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password dan konfirmasi tidak sama.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const code = storeCodeInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      const docRef = doc(db, 'stores', code);
      // Buat toko baru dengan password
      await setDoc(docRef, {
        storeType,
        inventory: [],
        restocks: [],
        sales: [],
        fnbSales: [],
        expenses: [],
        password,
      });
      setActiveStore(code);
      localStorage.setItem('merchantOsStoreCode', code);
    } catch (err) {
      setError('Gagal membuat toko. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2b: verifikasi password toko yang sudah ada
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const code = storeCodeInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      const docRef = doc(db, 'stores', code);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.password === password) {
          setActiveStore(code);
          localStorage.setItem('merchantOsStoreCode', code);
        } else {
          setError('Password salah. Coba lagi.');
        }
      }
    } catch (err) {
      setError('Gagal verifikasi. Cek koneksi lo.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToStep1 = () => {
    setStep('input_code');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl border border-gray-100 text-center">

        <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
          {step === 'input_code' ? <Users size={32} /> : <Lock size={32} />}
        </div>

        <h1 className="text-2xl font-bold mb-2">
          MerchantOS <span className="text-blue-600">Cloud</span>
        </h1>

        {/* ===== STEP 1: INPUT KODE TOKO ===== */}
        {step === 'input_code' && (
          <>
            <p className="text-gray-500 text-sm mb-8">
              Masukkan Kode Toko untuk sinkronisasi data dengan partner bisnis lu secara real-time.
            </p>
            <form onSubmit={handleCheckStore} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Kode Toko
                </label>
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
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Lanjut
              </button>
            </form>
          </>
        )}

        {/* ===== STEP 1B: PILIH TIPE TOKO ===== */}
        {step === 'set_type' && (
          <>
            <p className="text-gray-500 text-sm mb-2">
              Toko <span className="font-bold text-gray-700">{storeCodeInput}</span> belum ada.
            </p>
            <p className="text-gray-500 text-sm mb-6">Pilih tipe toko kamu dulu.</p>
            <div className="space-y-3 text-left">
              <button
                onClick={() => setStoreType('fashion')}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition ${
                  storeType === 'fashion' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <span className="text-2xl">👕</span>
                <div>
                  <p className="font-bold text-gray-700">Toko Baju</p>
                  <p className="text-xs text-gray-400 mt-0.5">Stok per ukuran (S/M/L/XL), restock, status order, DP</p>
                </div>
              </button>
              <button
                onClick={() => setStoreType('fnb')}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition ${
                  storeType === 'fnb' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <span className="text-2xl">🍔</span>
                <div>
                  <p className="font-bold text-gray-700">Toko Jajanan</p>
                  <p className="text-xs text-gray-400 mt-0.5">Kasir sederhana, input produk & penjualan, tanpa ukuran</p>
                </div>
              </button>
            </div>
            <button
              onClick={() => setStep('set_password')}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-blue-200"
            >
              Lanjut →
            </button>
            <button type="button" onClick={resetToStep1}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition mt-2">
              ← Ganti kode toko
            </button>
          </>
        )}

        {/* ===== STEP 2A: SET PASSWORD BARU ===== */}
        {step === 'set_password' && (
          <>
            <p className="text-gray-500 text-sm mb-2">
              Toko <span className="font-bold text-gray-700">{storeCodeInput}</span> · {storeType === 'fashion' ? '👕 Toko Baju' : '🍔 Toko Jajanan'}
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Buat password untuk mengamankan toko baru kamu.
            </p>
            <form onSubmit={handleSetPassword} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Password Toko
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 4 karakter"
                    className="pl-10 pr-10 w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:ring-0 focus:border-blue-500 outline-none transition"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Konfirmasi Password
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    className="pl-10 w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:ring-0 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Buat Toko & Masuk
              </button>
              <button type="button" onClick={resetToStep1}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition">
                ← Ganti kode toko
              </button>
            </form>
          </>
        )}

        {/* ===== STEP 2B: INPUT PASSWORD TOKO EXISTING ===== */}
        {step === 'input_password' && (
          <>
            <p className="text-gray-500 text-sm mb-2">
              Toko <span className="font-bold text-gray-700">{storeCodeInput}</span> ditemukan.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Masukkan password toko untuk melanjutkan.
            </p>
            <form onSubmit={handleVerifyPassword} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Password Toko
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Masukkan password"
                    className={`pl-10 pr-10 w-full border-2 rounded-xl p-3 font-bold focus:ring-0 outline-none transition ${
                      error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Masuk
              </button>
              <button type="button" onClick={resetToStep1}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition">
                ← Ganti kode toko
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
