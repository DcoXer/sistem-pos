import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
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

  useEffect(() => {
    if (!user || !activeStore) {
      setStoreData(emptyData);
      return;
    }

    setIsStoreLoading(true);
    const docRef = doc(db, 'stores', activeStore);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreData;
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

    // Firestore tidak bisa simpan field undefined — strip semua undefined dari inventory
    const cleanInventory = newData.inventory.map(item => ({
      sku: item.sku,
      name: item.name,
      hpp: item.hpp,
      price: item.price,
      imageUrl: item.imageUrl ?? null,
    }));

    // Preserve field password
    const current = await getDoc(docRef);
    const existingPassword = current.exists() ? current.data()?.password : undefined;

    await setDoc(docRef, {
      ...newData,
      inventory: cleanInventory,
      ...(existingPassword ? { password: existingPassword } : {})
    });
  };

  return { storeData, setStoreData, saveToCloud, isStoreLoading };
}
