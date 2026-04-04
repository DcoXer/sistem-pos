import { useState } from "react";
import { Key, Lock, Eye, EyeOff, Loader2, Zap, ArrowRight } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { StoreType } from '../types';

interface AuthScreenProps {
  setActiveStore: (code: string) => void;
}

type Step = 'input_code' | 'set_type' | 'set_password' | 'input_password';

export default function AuthScreen({ setActiveStore }: AuthScreenProps) {
  const [storeCodeInput, setStoreCodeInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>('input_code');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeType, setStoreType] = useState<StoreType>('fashion');

  const handleCheckStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = storeCodeInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!code) return;
    setIsLoading(true);
    setError('');
    try {
      const { auth } = await import('../firebase');
      const { signInAnonymously } = await import('firebase/auth');
      if (!auth.currentUser) await signInAnonymously(auth);

      const docRef = doc(db, 'stores', code);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.password) setStep('input_password');
        else { setActiveStore(code); localStorage.setItem('systemPosStoreCode', code); }
      } else {
        setStep('set_type');
      }
    } catch {
      setError('Gagal cek toko. Periksa koneksi internet kamu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) { setError('Password minimal 4 karakter.'); return; }
    if (password !== confirmPassword) { setError('Password dan konfirmasi tidak sama.'); return; }
    setIsLoading(true);
    setError('');
    try {
      const code = storeCodeInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      await setDoc(doc(db, 'stores', code), {
        storeType, inventory: [], restocks: [], sales: [], fnbSales: [], expenses: [], password,
      });
      setActiveStore(code);
      localStorage.setItem('systemPosStoreCode', code);
    } catch {
      setError('Gagal membuat toko. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const code = storeCodeInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      const docSnap = await getDoc(doc(db, 'stores', code));
      if (docSnap.exists() && docSnap.data()?.password === password) {
        setActiveStore(code);
        localStorage.setItem('systemPosStoreCode', code);
      } else {
        setError('Password salah. Coba lagi.');
      }
    } catch {
      setError('Gagal verifikasi. Cek koneksi kamu.');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => { setStep('input_code'); setPassword(''); setConfirmPassword(''); setError(''); setShowPassword(false); };

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all";
  const btnPrimary = "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50";

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-base)' }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--accent)', boxShadow: '0 0 32px var(--accent-glow)' }}>
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
            System<span style={{ color: 'var(--accent)' }}>POS</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Point of Sale System</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

          {/* STEP 1: Input kode toko */}
          {step === 'input_code' && (
            <form onSubmit={handleCheckStore} className="space-y-4">
              <div>
                <p className="text-base font-semibold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>Masuk ke Toko</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Masukkan kode toko untuk melanjutkan</p>
              </div>
              <div className="relative">
                <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type="text" required value={storeCodeInput}
                  onChange={e => setStoreCodeInput(e.target.value.toUpperCase())}
                  placeholder="KODE-TOKO-123"
                  className={inputClass}
                  style={{ paddingLeft: '2.5rem', fontFamily: 'monospace', letterSpacing: '0.1em', fontWeight: 700 }}
                />
              </div>
              {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button type="submit" disabled={isLoading} className={btnPrimary}
                style={{ background: 'var(--accent)', color: 'white' }}>
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><span>Lanjut</span><ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* STEP 1B: Pilih tipe toko */}
          {step === 'set_type' && (
            <div className="space-y-4">
              <div>
                <p className="text-base font-semibold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>Tipe Toko</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Toko <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{storeCodeInput}</span> belum ada. Pilih tipe toko kamu.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { type: 'fashion' as StoreType, emoji: '👕', label: 'Toko Baju', desc: 'Stok per ukuran, restock, status order, DP' },
                  { type: 'fnb' as StoreType, emoji: '🍔', label: 'Toko Jajanan', desc: 'Kasir sederhana, input produk & penjualan' },
                ].map(({ type, emoji, label, desc }) => (
                  <button key={type} onClick={() => setStoreType(type)}
                    className="w-full flex items-start gap-3 p-3.5 rounded-xl transition-all text-left"
                    style={{
                      background: storeType === type ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                      border: storeType === type ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border)',
                    }}>
                    <span className="text-xl">{emoji}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('set_password')} className={btnPrimary}
                style={{ background: 'var(--accent)', color: 'white' }}>
                <span>Lanjut</span><ArrowRight size={16} />
              </button>
              <button onClick={reset} className="w-full text-xs text-center transition"
                style={{ color: 'var(--text-muted)' }}>← Ganti kode toko</button>
            </div>
          )}

          {/* STEP 2A: Set password baru */}
          {step === 'set_password' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <p className="text-base font-semibold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>Buat Password</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {storeCodeInput} · {storeType === 'fashion' ? '👕 Toko Baju' : '🍔 Toko Jajanan'}
                </p>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Min. 4 karakter"
                  className={inputClass} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type={showPassword ? 'text' : 'password'} required value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} placeholder="Ulangi password"
                  className={inputClass} style={{ paddingLeft: '2.5rem' }} />
              </div>
              {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button type="submit" disabled={isLoading} className={btnPrimary}
                style={{ background: 'var(--accent)', color: 'white' }}>
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><span>Buat Toko & Masuk</span><ArrowRight size={16} /></>}
              </button>
              <button type="button" onClick={reset} className="w-full text-xs text-center"
                style={{ color: 'var(--text-muted)' }}>← Ganti kode toko</button>
            </form>
          )}

          {/* STEP 2B: Input password */}
          {step === 'input_password' && (
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <div>
                <p className="text-base font-semibold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>Masukkan Password</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Toko <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{storeCodeInput}</span> ditemukan
                </p>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type={showPassword ? 'text' : 'password'} required autoFocus value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="Password toko"
                  className={inputClass}
                  style={{
                    paddingLeft: '2.5rem', paddingRight: '2.5rem',
                    borderColor: error ? 'var(--danger)' : undefined,
                  }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button type="submit" disabled={isLoading} className={btnPrimary}
                style={{ background: 'var(--accent)', color: 'white' }}>
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><span>Masuk</span><ArrowRight size={16} /></>}
              </button>
              <button type="button" onClick={reset} className="w-full text-xs text-center"
                style={{ color: 'var(--text-muted)' }}>← Ganti kode toko</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
