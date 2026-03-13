import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!user || !activeStore) {
      setStoreData(emptyData);
      return;
    }

    const docRef = doc(db, 'stores', activeStore);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreData;
        setStoreData({
          inventory: data.inventory || [],
          restocks: data.restocks || [],   // backward compat: data lama ga punya restocks
          sales: data.sales || [],
          expenses: data.expenses || []
        });
      } else {
        setDoc(docRef, emptyData);
        setStoreData(emptyData);
      }
    }, (error) => {
      console.error("Error sinkronisasi data:", error);
      alert("Koneksi terputus. Cek internet lu.");
    });

    return () => unsubscribe();
  }, [user, activeStore]);

  const saveToCloud = async (newData: StoreData) => {
    if (!user || !activeStore) return;
    const docRef = doc(db, 'stores', activeStore);
    await setDoc(docRef, newData);
  };

  return { storeData, setStoreData, saveToCloud };
}
