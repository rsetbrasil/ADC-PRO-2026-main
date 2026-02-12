'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { User } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

export async function getUsersAction() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error: sError } = await supabase
            .from('users')
            .select('*');
        if (sError) throw sError;
        const mapped: User[] = (data || []).map((u: any) => ({
            id: u.id,
            username: u.username,
            password: u.password || undefined,
            name: u.name,
            role: u.role,
            canBeAssigned: u.can_be_assigned ?? true,
        }));
        return { success: true, data: mapped };
    } catch (error: any) {
        return { success: true, data: [] };
    }
}

export async function createUserAction(data: Omit<User, 'id'>) {
    try {
        if (!data.password) {
            return { success: false, error: 'Senha é obrigatória.' };
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const payload: any = {
            username: data.username,
            password: data.password,
            name: data.name,
            role: data.role,
            can_be_assigned: data.canBeAssigned ?? true,
        };

        const { data: created, error } = await supabase
            .from('users')
            .insert(payload)
            .select('*')
            .single();
        if (error) throw error;

        revalidatePath('/admin');
        revalidatePath('/admin/configuracao');
        return {
            success: true,
            data: {
                id: created.id,
                username: created.username,
                password: created.password || undefined,
                name: created.name,
                role: created.role,
                canBeAssigned: created.can_be_assigned ?? true,
            } as User
        };
    } catch (error: any) {
        try {
            if (!data.password) {
                return { success: false, error: 'Senha é obrigatória.' };
            }

            const newUser = await db.user.create({
                data: {
                    ...data,
                    password: data.password,
                    canBeAssigned: data.canBeAssigned ?? true,
                }
            });

            revalidatePath('/admin');
            revalidatePath('/admin/configuracao');
            return { success: true, data: newUser as unknown as User };
        } catch (e: any) {
            return { success: false, error: e?.message || error?.message || 'Erro ao criar usuário.' };
        }
    }
}

export async function updateUserAction(userId: string, data: Partial<Omit<User, 'id'>>) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const payload: any = {};
        if (data.username !== undefined) payload.username = data.username;
        if (data.password !== undefined) payload.password = data.password;
        if (data.name !== undefined) payload.name = data.name;
        if (data.role !== undefined) payload.role = data.role;
        if (data.canBeAssigned !== undefined) payload.can_be_assigned = data.canBeAssigned;

        const { error } = await supabase.from('users').update(payload).eq('id', userId);
        if (error) throw error;

        revalidatePath('/admin');
        revalidatePath('/admin/configuracao');
        return { success: true };
    } catch (error: any) {
        try {
            await db.user.update({
                where: { id: userId },
                data: data
            });
            revalidatePath('/admin');
            revalidatePath('/admin/configuracao');
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e?.message || error?.message };
        }
    }
}

export async function deleteUserAction(userId: string) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) throw error;

        revalidatePath('/admin');
        revalidatePath('/admin/configuracao');
        return { success: true };
    } catch (error: any) {
        try {
            await db.user.delete({
                where: { id: userId }
            });
            revalidatePath('/admin');
            revalidatePath('/admin/configuracao');
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e?.message || error?.message };
        }
    }
}

export async function restoreUsersAction(usersToRestore: User[]) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const payload = (usersToRestore || []).map((u) => ({
            id: u.id,
            username: u.username,
            password: u.password || '',
            name: u.name,
            role: u.role,
            can_be_assigned: u.canBeAssigned ?? true,
        }));

        const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
        if (error) throw error;

        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        try {
            await db.$transaction(
                usersToRestore.map(u =>
                    db.user.upsert({
                        where: { id: u.id },
                        update: { ...u, password: u.password || '' } as any,
                        create: { ...u, password: u.password || '' } as any
                    })
                )
            );

            revalidatePath('/admin');
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e?.message || error?.message };
        }
    }
}

export async function seedDefaultUsersAction(usersToSeed: User[]) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const payload = (usersToSeed || []).map((u) => ({
            id: u.id,
            username: u.username,
            password: u.password || '',
            name: u.name,
            role: u.role,
            can_be_assigned: u.canBeAssigned ?? true,
        }));
        const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        revalidatePath('/admin/usuarios');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Falha ao semear usuários' };
    }
}
