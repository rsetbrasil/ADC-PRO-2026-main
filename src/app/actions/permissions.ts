'use server';

import { db } from '@/lib/db';
import { RolePermissions } from '@/lib/types';
import { initialPermissions } from '@/lib/permissions';
import { createClient } from '@supabase/supabase-js';

export async function getRolePermissionsAction() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'rolePermissions')
            .maybeSingle();
        if (error) throw error;

        if (data?.value) {
            return { success: true, data: data.value as unknown as RolePermissions };
        }

        const { error: insertError } = await supabase
            .from('config')
            .insert({ key: 'rolePermissions', value: initialPermissions as any });
        if (insertError) throw insertError;

        return { success: true, data: initialPermissions };
    } catch {
        try {
            const result = await db.config.findUnique({
                where: { key: 'rolePermissions' }
            });

            if (result) {
                return { success: true, data: result.value as unknown as RolePermissions };
            }

            await db.config.create({
                data: { key: 'rolePermissions', value: initialPermissions as any }
            });

            return { success: true, data: initialPermissions };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

export async function updateRolePermissionsAction(permissions: RolePermissions) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabase
            .from('config')
            .upsert({ key: 'rolePermissions', value: permissions as any }, { onConflict: 'key' });
        if (error) throw error;

        return { success: true };
    } catch {
        try {
            await db.config.upsert({
                where: { key: 'rolePermissions' },
                update: { value: permissions as any },
                create: { key: 'rolePermissions', value: permissions as any }
            });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
