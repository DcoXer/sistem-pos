import { useMemo } from 'react';
import type { StoreData } from '../types';

export function useMetrics(storeData: StoreData) {
  return useMemo(() => {
    let totalRevenue = 0;
    let totalHppSold = 0;
    let totalExpenses = 0;

    const inv = storeData.inventory || [];
    const restocks = storeData.restocks || [];
    const sls = storeData.sales || [];
    const fnbSales = storeData.fnbSales || [];
    const exp = storeData.expenses || [];
    const isFnb = storeData.storeType === 'fnb';

    // Build stockMap dari master inventory
    const stockMap = inv.reduce((acc, item) => {
      acc[item.sku] = {
        ...item,
        totalRestocked: 0,
        restockedBySize: {} as Record<string, number>,
        sold: 0,
        soldBySize: {} as Record<string, number>,
        current: 0,
        currentBySize: {} as Record<string, number>,
        restockHistory: [] as typeof restocks,
      };
      return acc;
    }, {} as { [key: string]: any });

    if (!isFnb) {
      // ===== FASHION: kalkulasi dari restocks & sales =====
      restocks.forEach(restock => {
        const item = stockMap[restock.sku];
        if (!item) return;
        item.restockHistory.push(restock);
        restock.sizes.forEach(s => {
          item.totalRestocked += s.stock;
          item.restockedBySize[s.size] = (item.restockedBySize[s.size] || 0) + s.stock;
        });
      });

      sls.forEach(sale => {
        const item = stockMap[sale.sku];
        if (!item) return;
        totalRevenue += item.price * sale.qty;
        totalHppSold += item.hpp * sale.qty;
        item.sold += sale.qty;
        if (sale.size) {
          item.soldBySize[sale.size] = (item.soldBySize[sale.size] || 0) + sale.qty;
        }
      });

      Object.values(stockMap).forEach((item: any) => {
        item.current = item.totalRestocked - item.sold;
        Object.keys(item.restockedBySize).forEach(size => {
          item.currentBySize[size] =
            (item.restockedBySize[size] || 0) - (item.soldBySize[size] || 0);
        });
      });

    } else {
      // ===== FNB: kalkulasi dari fnbSales =====
      fnbSales.forEach(sale => {
        // total sudah tersimpan di sale.total saat transaksi dibuat
        totalRevenue += sale.total;

        // Hitung HPP dari items
        sale.items.forEach(si => {
          const item = stockMap[si.sku];
          if (!item) return;
          totalHppSold += item.hpp * si.qty;
          item.sold += si.qty;
        });
      });

      // FnB tidak pakai stok fisik — current = 0 (tidak relevan)
      Object.values(stockMap).forEach((item: any) => {
        item.current = 0;
      });
    }

    // Pengeluaran — sama untuk semua tipe toko
    exp.forEach(e => {
      totalExpenses += Number(e.amount);
    });

    const grossProfit = totalRevenue - totalHppSold;
    const netProfit = grossProfit - totalExpenses;

    let totalStockPcs = 0;
    let deadStockValue = 0;
    if (!isFnb) {
      Object.values(stockMap).forEach((item: any) => {
        totalStockPcs += item.current;
        deadStockValue += item.current * item.hpp;
      });
    }

    return {
      totalRevenue,
      totalHppSold,
      grossProfit,
      totalExpenses,
      netProfit,
      totalStockPcs,
      deadStockValue,
      stockMap
    };
  }, [storeData]);
}
