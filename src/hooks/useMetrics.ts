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
    const exp = storeData.expenses || [];

    // Build stockMap dari master inventory
    const stockMap = inv.reduce((acc, item) => {
      acc[item.sku] = {
        ...item,
        // Akumulasi stok dari semua restock entries
        totalRestocked: 0,           // total pcs masuk semua restock
        restockedBySize: {} as Record<string, number>, // total masuk per ukuran
        sold: 0,
        soldBySize: {} as Record<string, number>,
        current: 0,
        currentBySize: {} as Record<string, number>,
        restockHistory: [] as typeof restocks,
      };
      return acc;
    }, {} as { [key: string]: any });

    // Akumulasi stok dari restock entries
    restocks.forEach(restock => {
      const item = stockMap[restock.sku];
      if (!item) return;

      item.restockHistory.push(restock);

      restock.sizes.forEach(s => {
        item.totalRestocked += s.stock;
        item.restockedBySize[s.size] = (item.restockedBySize[s.size] || 0) + s.stock;
      });
    });

    // Kalkulasi penjualan
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

    // Hitung stok sisa per item dan per ukuran
    Object.values(stockMap).forEach((item: any) => {
      item.current = item.totalRestocked - item.sold;

      Object.keys(item.restockedBySize).forEach(size => {
        item.currentBySize[size] =
          (item.restockedBySize[size] || 0) - (item.soldBySize[size] || 0);
      });
    });

    // Pengeluaran
    exp.forEach(e => {
      totalExpenses += Number(e.amount);
    });

    const grossProfit = totalRevenue - totalHppSold;
    const netProfit = grossProfit - totalExpenses;

    let totalStockPcs = 0;
    let deadStockValue = 0;
    Object.values(stockMap).forEach((item: any) => {
      totalStockPcs += item.current;
      deadStockValue += item.current * item.hpp;
    });

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
