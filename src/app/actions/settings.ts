'use server';

import { db } from '@/lib/db';
import { StoreSettings } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { initialSettings } from '@/lib/settings-defaults';

export async function getSettingsAction() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'storeSettings')
            .maybeSingle();
        if (error) throw error;

        const remote = data?.value ? (data.value as unknown as Partial<StoreSettings>) : {};
        return { success: true, data: { ...initialSettings, ...remote } };
    } catch {
        try {
            const result = await db.config.findUnique({
                where: { key: 'storeSettings' }
            });
            const remote = result ? (result.value as unknown as Partial<StoreSettings>) : {};

            return { success: true, data: { ...initialSettings, ...remote } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

export async function updateSettingsAction(newSettings: StoreSettings) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabase
            .from('config')
            .upsert({ key: 'storeSettings', value: newSettings as any }, { onConflict: 'key' });
        if (error) throw error;

        return { success: true };
    } catch {
        try {
            await db.config.upsert({
                where: { key: 'storeSettings' },
                update: { value: newSettings as any },
                create: { key: 'storeSettings', value: newSettings as any }
            });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

export async function getAsaasSettingsAction() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'asaasSettings')
            .maybeSingle();
        if (error) throw error;

        return { success: true, data: data?.value };
    } catch {
        try {
            const result = await db.config.findUnique({
                where: { key: 'asaasSettings' }
            });
            return { success: true, data: result?.value };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

export async function updateAsaasSettingsAction(settings: any) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabase
            .from('config')
            .upsert({ key: 'asaasSettings', value: settings as any }, { onConflict: 'key' });
        if (error) throw error;

        return { success: true };
    } catch {
        try {
            await db.config.upsert({
                where: { key: 'asaasSettings' },
                create: { key: 'asaasSettings', value: settings as any },
                update: { value: settings as any }
            });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

export async function getCustomerCodeCounterAction() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'customerCodeCounter')
            .maybeSingle();
        if (error) throw error;

        return { success: true, data: data?.value };
    } catch {
        try {
            const result = await db.config.findUnique({
                where: { key: 'customerCodeCounter' }
            });
            return { success: true, data: result?.value };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

export async function updateCustomerCodeCounterAction(value: number) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabase
            .from('config')
            .upsert({ key: 'customerCodeCounter', value: value as any }, { onConflict: 'key' });
        if (error) throw error;

        return { success: true };
    } catch {
        try {
            await db.config.upsert({
                where: { key: 'customerCodeCounter' },
                create: { key: 'customerCodeCounter', value: value as any },
                update: { value: value as any }
            });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
