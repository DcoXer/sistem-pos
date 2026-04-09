import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, collection, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { StoreData, StoreType } from '../types';
import type { User } from 'firebase/auth';

const emptyData: StoreData = {
  storeType: 'fashion',
  inventory: [],
  restocks: [],
  sales: [],
  fnbSales: [],
  expenses: []
};

export function useStoreData(user: User | null, activeStore: string) {
  const [storeData, setStoreData] = useState<StoreData>(emptyData);
  const [isStoreLoading, setIsStoreLoading] = useState(false);

  const passwordRef = useRef<string | undefined>(undefined);
  const isLoadedRef = useRef<boolean>(false);
  const storeTypeRef = useRef<StoreType>('fashion');
  const hasExistedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!user || !activeStore) {
      setStoreData(emptyData);
      passwordRef.current = undefined;
      isLoadedRef.current = false;
      storeTypeRef.current = 'fashion';
      hasExistedRef.current = false;
      return;
    }

    setIsStoreLoading(true);
    isLoadedRef.current = false;
    hasExistedRef.current = false;
    const docRef = doc(db, 'stores', activeStore);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        hasExistedRef.current = true;

        if (data?.password) passwordRef.current = data.password;
        if (data?.storeType) storeTypeRef.current = data.storeType as StoreType;

        const loadedData: StoreData = {
          storeType: storeTypeRef.current,
          inventory: data.inventory || [],
          restocks: data.restocks || [],
          sales: data.sales || [],
          fnbSales: data.fnbSales || [],
          expenses: data.expenses || [],
        };

        if (!isLoadedRef.current) autoBackup(loadedData);

        isLoadedRef.current = true;
        setStoreData(loadedData);
      } else {
        // Hanya init document baru kalau belum pernah exist
        if (!hasExistedRef.current) {
          setDoc(docRef, emptyData);
          setStoreData(emptyData);
        } else {
          console.warn('[useStoreData] Document not found tapi sudah pernah exist — network glitch, skip');
        }
      }
      setIsStoreLoading(false);
    }, (error) => {
      console.error("Error sinkronisasi data:", error);
      alert("Koneksi terputus. Cek internet kamu.");
      setIsStoreLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeStore]);

  const autoBackup = async (data: StoreData) => {
    if (!activeStore) return;
    try {
      const backupRef = doc(
        collection(doc(db, 'stores', activeStore), 'backups'),
        new Date().toISOString().replace(/[:.]/g, '-')
      );
      await setDoc(backupRef, { ...data, backedUpAt: new Date().toISOString() });

      const backupsRef = collection(doc(db, 'stores', activeStore), 'backups');
      const q = query(backupsRef, orderBy('backedUpAt', 'asc'));
      const snap = await getDocs(q);
      if (snap.size > 7) {
        const toDelete = snap.docs.slice(0, snap.size - 7);
        await Promise.all(toDelete.map(d => deleteDoc(d.ref)));
      }
    } catch (err) {
      console.warn('[autoBackup] Gagal backup:', err);
    }
  };

  // ==============================
  // saveToCloud — pakai updateDoc per field, BUKAN setDoc seluruh document
  // Ini jauh lebih aman: kalau ada field yang undefined/kosong,
  // field lain di Firestore tidak tersentuh
  // ==============================
  const saveToCloud = async (newData: StoreData) => {
    if (!user || !activeStore) return;
    if (!isLoadedRef.current) {
      console.warn('[saveToCloud] BLOCKED — data belum loaded');
      return;
    }
    if (!hasExistedRef.current) {
      console.warn('[saveToCloud] BLOCKED — document belum confirmed exist');
      return;
    }

    const docRef = doc(db, 'stores', activeStore);

    // Clean inventory — strip undefined
    const cleanInventory = newData.inventory.map(item => ({
      sku: item.sku,
      name: item.name,
      hpp: item.hpp,
      price: item.price,
      imageUrl: item.imageUrl ?? null,
    }));

    // Clean sales
    const cleanSales = newData.sales.map(s => ({
      id: s.id,
      date: s.date,
      invoice: s.invoice || '',
      sku: s.sku,
      qty: s.qty,
      size: s.size,
      status: s.status || 'selesai',
      dpAmount: s.dpAmount ?? null,
    }));

    // Clean fnbSales
    const cleanFnbSales = (newData.fnbSales || []).map(s => ({
      id: s.id,
      date: s.date,
      items: s.items,
      total: s.total,
    }));

    // updateDoc — hanya update field yang dikirim, field lain di Firestore TIDAK tersentuh
    // Ini mencegah race condition yang bisa hapus data field lain
    await updateDoc(docRef, {
      inventory: cleanInventory,
      restocks: newData.restocks || [],
      sales: cleanSales,
      fnbSales: cleanFnbSales,
      expenses: newData.expenses || [],
      // storeType TIDAK di-update — nilainya sudah fix saat pembuatan toko
    });
  };

  return { storeData, setStoreData, saveToCloud, isStoreLoading };
}
