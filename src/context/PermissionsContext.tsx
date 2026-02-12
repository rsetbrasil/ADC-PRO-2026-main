
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { RolePermissions } from '@/lib/types';
import { initialPermissions } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';

interface PermissionsContextType {
    permissions: RolePermissions | null;
    updatePermissions: (newPermissions: RolePermissions) => Promise<void>;
    isLoading: boolean;
    resetPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
    const [permissions, setPermissions] = useState<RolePermissions | null>(initialPermissions);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useAuth();
    const { logAction } = useAudit();
    const isPolling = useRef(true);
    const isFetching = useRef(false);
    const abortRef = useRef<AbortController | null>(null);

    const fetchPermissions = useCallback(async () => {
        if (isFetching.current) return;
        if (document.visibilityState !== 'visible') return;

        isFetching.current = true;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const res = await fetch('/api/admin/permissions', { cache: 'no-store', signal: controller.signal });
            const result = await res.json();
            if (result?.success && result?.data) {
                setPermissions(result.data as RolePermissions);
            }
        } catch (error) {
            console.error("Failed to load permissions:", error);
        } finally {
            setIsLoading(false);
            isFetching.current = false;
        }
    }, []);

    useEffect(() => {
        const tick = () => {
            if (!isPolling.current) return;
            fetchPermissions();
        };

        tick();

        const onVisibility = () => {
            if (document.visibilityState === 'visible') tick();
        };
        document.addEventListener('visibilitychange', onVisibility);

        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') tick();
        }, 30000);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', onVisibility);
            isPolling.current = false;
            abortRef.current?.abort();
        };
    }, [fetchPermissions]);

    const updatePermissions = useCallback(async (newPermissions: RolePermissions) => {
        try {
            const res = await fetch('/api/admin/permissions', {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ permissions: newPermissions }),
            });
            const result = await res.json();
            if (!result?.success) throw new Error(result?.error);

            setPermissions(newPermissions); // Optimistic update

            logAction('Atualização de Permissões', 'As permissões de acesso dos perfis foram alteradas.', user);
            toast({
                title: "Permissões Salvas!",
                description: "As regras de acesso foram atualizadas com sucesso.",
            });
        } catch (error) {
            console.error("Error updating permissions:", error);
            toast({ title: "Erro", description: "Não foi possível salvar as permissões.", variant: "destructive" });
        }
    }, [toast, logAction, user]);

    const resetPermissions = useCallback(async () => {
        await updatePermissions(initialPermissions);
    }, [updatePermissions]);

    return (
        <PermissionsContext.Provider value={{ permissions, updatePermissions, isLoading, resetPermissions }}>
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => {
    const context = useContext(PermissionsContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
};
