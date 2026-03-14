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
    if (!user || !activeStore) return;
    const docRef = doc(db, 'stores', activeStore);

    // Firestore tidak bisa simpan field undefined sama sekali
    // Solusi: JSON.parse(JSON.stringify()) akan strip semua undefined otomatis
    const stripped = JSON.parse(JSON.stringify({
      inventory: newData.inventory.map(item => ({
        sku: item.sku,
        name: item.name,
        hpp: item.hpp,
        price: item.price,
        imageUrl: item.imageUrl ?? null,
      })),
      restocks: newData.restocks,
      sales: newData.sales.map(s => ({
        id: s.id,
        date: s.date,
        invoice: s.invoice || '',
        sku: s.sku,
        qty: s.qty,
        size: s.size,
        status: s.status || 'selesai',
        dpAmount: s.dpAmount ?? null,
      })),
      expenses: newData.expenses,
    }));

    if (passwordRef.current) {
      stripped.password = passwordRef.current;
    }

    await setDoc(docRef, stripped);
  };

  return { storeData, setStoreData, saveToCloud, isStoreLoading };
}
