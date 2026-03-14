import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { StoreData } from '../types';
import type { User } from 'firebase/auth';

const emptyData: StoreData = {
  inventory: [],
  restocks: [],
  sales: [],
  expenses: []
};

export function useStoreData(user: User | null, activeStore: string) {
  const [storeData, setStoreData] = useState<StoreData>(emptyData);
  const [isStoreLoading, setIsStoreLoading] = useState(false);

  // Simpan password di ref — tidak trigger re-render, persist selama session
  const passwordRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!user || !activeStore) {
      setStoreData(emptyData);
      passwordRef.current = undefined;
      return;
    }

    setIsStoreLoading(true);
    const docRef = doc(db, 'stores', activeStore);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // Simpan password ke ref sekali saat load
        if (data?.password) {
          passwordRef.current = data.password;
        }

        setStoreData({
          inventory: data.inventory || [],
          restocks: data.restocks || [],
          sales: data.sales || [],
          expenses: data.expenses || []
        });
      } else {
        setDoc(docRef, emptyData);
        setStoreData(emptyData);
      }
      setIsStoreLoading(false);
    }, (error) => {
      console.error("Error sinkronisasi data:", error);
      alert("Koneksi terputus. Cek internet lu.");
      setIsStoreLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeStore]);

  const saveToCloud = async (newData: StoreData) => {
    if (!user || !activeStore) {
      alert('DEBUG: saveToCloud skip - user: ' + !!user + ', store: ' + activeStore);
      return;
    }
    const docRef = doc(db, 'stores', activeStore);

    // Clean undefined dari inventory — Firestore tidak bisa simpan undefined
    const cleanInventory = newData.inventory.map(item => ({
      sku: item.sku,
      name: item.name,
      hpp: item.hpp,
      price: item.price,
      imageUrl: item.imageUrl ?? null,
    }));

    const payload: any = {
      ...newData,
      inventory: cleanInventory,
    };

    // Preserve password dari ref — tidak perlu getDoc lagi
    if (passwordRef.current) {
      payload.password = passwordRef.current;
    }

    try {
      await setDoc(docRef, payload);
    } catch (err: any) {
      alert('DEBUG: Gagal simpan - ' + (err?.message || err?.code || 'unknown error'));
    }
  };

  return { storeData, setStoreData, saveToCloud, isStoreLoading };
}
