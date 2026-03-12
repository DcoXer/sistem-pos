import { useMemo } from 'react';
import type { StoreData } from '../types';

export function useMetrics(storeData: StoreData) {
  return useMemo(() => {
    let totalRevenue = 0;
    let totalHppSold = 0;
    let totalExpenses = 0;
    
    const inv = storeData.inventory || [];
    const sls = storeData.sales || [];
    const exp = storeData.expenses || [];

    const stockMap = inv.reduce((acc, item) => {
      acc[item.sku] = { ...item, sold: 0, current: item.stock };
      return acc;
    }, {} as { [key: string]: any });

    sls.forEach(sale => {
      const item = stockMap[sale.sku];
      if (item) {
        totalRevenue += (item.price * sale.qty);
        totalHppSold += (item.hpp * sale.qty);
        stockMap[sale.sku].sold += sale.qty;
        stockMap[sale.sku].current -= sale.qty;
      }
    });

    exp.forEach(e => {
      totalExpenses += Number(e.amount);
    });

    const grossProfit = totalRevenue - totalHppSold;
    const netProfit = grossProfit - totalExpenses;
    
    let totalStockPcs = 0;
    let deadStockValue = 0;
    Object.values(stockMap).forEach((item: any) => {
      totalStockPcs += item.current;
      deadStockValue += (item.current * item.hpp);
    });

    return { totalRevenue, totalHppSold, grossProfit, totalExpenses, netProfit, totalStockPcs, deadStockValue, stockMap };
  }, [storeData]);
}
