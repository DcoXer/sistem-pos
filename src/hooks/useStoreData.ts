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
  const lastKnownCountRef = useRef<{
    inventory: number;
    sales: number;
    fnbSales: number;
    expenses: number;
  }>({ inventory: 0, sales: 0, fnbSales: 0, expenses: 0 });

  useEffect(() => {
    if (!user || !activeStore) {
      setStoreData(emptyData);
      passwordRef.current = undefined;
      isLoadedRef.current = false;
      storeTypeRef.current = 'fashion';
      hasExistedRef.current = false;
      lastKnownCountRef.current = { inventory: 0, sales: 0, fnbSales: 0, expenses: 0 };
      return;
    }

    setIsStoreLoading(true);
    isLoadedRef.current = false;

    const docRef = doc(db, 'stores', activeStore);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        hasExistedRef.current = true;

        if (data?.password) passwordRef.current = data.password;
        if (data?.storeType) storeTypeRef.current = data.storeType as StoreType;

        const incoming: StoreData = {
          storeType: storeTypeRef.current,
          inventory: data.inventory || [],
          restocks: data.restocks || [],
          sales: data.sales || [],
          fnbSales: data.fnbSales ?? [],
          expenses: data.expenses || [],
        };

        // Guard: tolak snapshot kalau suspicious wipe
        const last = lastKnownCountRef.current;
        const suspiciousWipe =
          (last.inventory > 2 && incoming.inventory.length === 0) ||
          (last.sales > 2 && incoming.sales.length === 0) ||
          (last.fnbSales > 2 && (incoming.fnbSales ?? []).length === 0);

        if (suspiciousWipe) {
          console.error('[useStoreData] SUSPICIOUS WIPE DETECTED — snapshot ditolak', {
            last,
            incoming: {
              inventory: incoming.inventory.length,
              sales: incoming.sales.length,
              fnbSales: (incoming.fnbSales ?? []).length,
            }
          });
          setIsStoreLoading(false);
          return;
        }

        // autoBackup hanya jalan saat pertama load dan data ada isinya
        if (!isLoadedRef.current) {
          const hasData =
            incoming.inventory.length > 0 ||
            incoming.sales.length > 0 ||
            (incoming.fnbSales ?? []).length > 0 ||
            incoming.expenses.length > 0;
          if (hasData) autoBackup(incoming);
        }

        // Update last known count dengan data valid
        lastKnownCountRef.current = {
          inventory: incoming.inventory.length,
          sales: incoming.sales.length,
          fnbSales: (incoming.fnbSales ?? []).length,
          expenses: incoming.expenses.length,
        };

        isLoadedRef.current = true;
        setStoreData(incoming);
      } else {
        if (!hasExistedRef.current) {
          setDoc(docRef, emptyData);
          setStoreData(emptyData);
        } else {
          console.warn('[useStoreData] Document not found tapi sudah pernah exist — network glitch, skip');
        }
      }
      setIsStoreLoading(false);
    }, (error) => {
      console.error('[useStoreData] Snapshot error:', error);
      setIsStoreLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeStore]);

  const autoBackup = async (data: StoreData) => {
    if (!activeStore) return;

    const isEmpty =
      data.inventory.length === 0 &&
      data.sales.length === 0 &&
      (data.fnbSales ?? []).length === 0 &&
      data.expenses.length === 0;
    if (isEmpty) {
      console.warn('[autoBackup] Skip — data kosong');
      return;
    }

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

    // Guard: jangan nulis array kosong kalau last known ada isinya
    const last = lastKnownCountRef.current;
    if (last.inventory > 0 && newData.inventory.length === 0) {
      console.error('[saveToCloud] BLOCKED — inventory tiba-tiba kosong');
      return;
    }
    if (
      last.sales > 0 && newData.sales.length === 0 &&
      last.fnbSales > 0 && (newData.fnbSales ?? []).length === 0
    ) {
      console.error('[saveToCloud] BLOCKED — semua sales kosong sekaligus, suspicious');
      return;
    }

    const docRef = doc(db, 'stores', activeStore);

    const cleanInventory = newData.inventory.map(item => ({
      sku: item.sku,
      name: item.name,
      hpp: item.hpp,
      price: item.price,
      imageUrl: item.imageUrl ?? null,
    }));

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

    const cleanFnbSales = (newData.fnbSales ?? []).map(s => ({
      id: s.id,
      date: s.date,
      items: s.items,
      total: s.total,
    }));

    await updateDoc(docRef, {
      inventory: cleanInventory,
      restocks: newData.restocks || [],
      sales: cleanSales,
      fnbSales: cleanFnbSales,
      expenses: newData.expenses || [],
    });
  };

  return { storeData, setStoreData, saveToCloud, isStoreLoading };
}
