

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import type { Product, Category } from '@/lib/types';

// This context now only handles PUBLIC data.
// Admin-related data has been moved to AdminContext for performance optimization.
interface DataContextType {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  updateProductLocally: (product: Product) => void;
  addProductLocally: (product: Product) => void;
  deleteProductLocally: (productId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const isPolling = useRef(true);
  const isFetching = useRef(false);

  // Funções de atualização otimista (sem cache)
  const updateProductLocally = (product: Product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
  };

  const addProductLocally = (product: Product) => {
    setProducts(prev => {
      const exists = prev.some(p => p.id === product.id);
      if (exists) {
        return prev.map(p => p.id === product.id ? product : p);
      }
      return [...prev, product];
    });
  };

  const deleteProductLocally = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  useEffect(() => {
    const fetchData = async (showLoading = false) => {
      if (isFetching.current) return;
      isFetching.current = true;
      if (showLoading) {
        setProductsLoading(true);
        setCategoriesLoading(true);
      }

      // Fetch Products
      try {
        const res = await fetch('/api/public/products', { cache: 'no-store' });
        if (res.ok) {
          const result = await res.json();
          if (result?.success && Array.isArray(result.data)) {
            setProducts(result.data as Product[]);
          }
        }
      } catch (error) {
        // silent
      } finally {
        if (showLoading) setProductsLoading(false);
      }

      // Fetch Categories
      try {
        const res = await fetch('/api/public/categories', { cache: 'no-store' });
        if (res.ok) {
          const result = await res.json();
          if (result?.success && Array.isArray(result.data)) {
            setCategories(result.data as Category[]);
          }
        }
      } catch (error) {
        // silent
      } finally {
        if (showLoading) setCategoriesLoading(false);
        isFetching.current = false;
      }
    };

    fetchData(true);

    const onVisibility = () => {
      isPolling.current = document.visibilityState === 'visible';
      if (isPolling.current) fetchData(false);
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Polling interval (Replace Realtime)
    const intervalId = setInterval(() => {
      if (isPolling.current) {
        fetchData(false);
      }
    }, 30000);

    return () => {
      clearInterval(intervalId);
      isPolling.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const isLoading = productsLoading || categoriesLoading;

  // Return ONLY active products for all public/shared views
  const activeProducts = useMemo(() => {
    return products.filter(p => !p.deletedAt);
  }, [products]);

  const value = useMemo(() => ({
    products: activeProducts,
    categories,
    isLoading,
    updateProductLocally,
    addProductLocally,
    deleteProductLocally,
  }), [
    activeProducts,
    categories,
    isLoading,
    updateProductLocally,
    addProductLocally,
    deleteProductLocally,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
