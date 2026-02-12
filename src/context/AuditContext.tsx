
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { AuditLog, User } from '@/lib/types';

interface AuditContextType {
  auditLogs: AuditLog[];
  logAction: (action: string, details: string, user: User | null) => void;
  isLoading: boolean;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider = ({ children }: { children: ReactNode }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isPolling = useRef(true);

  const fetchLogs = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/audit/logs', { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const result = await res.json();
        if (result?.success && Array.isArray(result.data)) {
          setAuditLogs(result.data as AuditLog[]);
        }
      }
    } catch (error) {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    const intervalId = setInterval(() => {
      if (isPolling.current) fetchLogs();
    }, 15000);

    return () => {
      clearInterval(intervalId);
      isPolling.current = false;
    };
  }, [fetchLogs]);


  const logAction = useCallback(async (action: string, details: string, user: User | null) => {
    if (!user) return;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      await fetch('/api/audit/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, details, user }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (error) {
      // silent
    }
  }, []);

  return (
    <AuditContext.Provider value={{ auditLogs, logAction, isLoading }}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};
