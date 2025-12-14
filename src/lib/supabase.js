import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Initializing Supabase...', { supabaseUrl: supabaseUrl ? 'Set' : 'Missing' });

let supabaseInstance = null;

// Helper to create a safe dummy chain
const createDummyChain = (methodName) => {
    return {
        select: () => createDummyChain('select'),
        insert: () => createDummyChain('insert'),
        update: () => createDummyChain('update'),
        delete: () => createDummyChain('delete'),
        eq: () => createDummyChain('eq'),
        order: () => createDummyChain('order'),
        single: () => Promise.resolve({ data: null, error: { message: `Supabase not connected (${methodName} failed)` } }),
        then: (resolve) => resolve({ data: [], error: { message: 'Supabase not connected' } })
    };
};

try {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Credentials');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase initialized successfully');
} catch (error) {
    console.error('CRITICAL: Supabase initialization failed:', error);

    // Robust Fallback Client that supports chaining
    supabaseInstance = {
        from: (table) => ({
            select: () => createDummyChain('select'),
            insert: () => createDummyChain('insert'),
            update: () => createDummyChain('update'),
            delete: () => createDummyChain('delete'),
        }),
        auth: {
            getSession: () => Promise.resolve({ data: { session: null } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
        }
    };
}

export const supabase = supabaseInstance;
