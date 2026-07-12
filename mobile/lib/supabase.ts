import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oezxiullyolewlqyilqy.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lenhpdWxseW9sZXdscXlpbHF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDU5MDQsImV4cCI6MjA4MTQ4MTkwNH0.Vux7rzhj1oSOn8ZP0jj42C108NaUjDF-vfEEfAuyuaI'

console.log('Supabase URL:', supabaseUrl); // Debug log

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    global: {
        headers: {
            'X-Client-Info': 'supabase-js-react-native',
        },
        fetch: async (url, options = {}) => {
            const MAX_RETRIES = 3;
            let lastError;

            for (let i = 0; i < MAX_RETRIES; i++) {
                try {
                    return await fetch(url, options);
                } catch (error: any) {
                    lastError = error;
                    // Retry only on network errors (TypeError: Network request failed)
                    if (error.name === 'TypeError' || error.message?.includes('Network request failed')) {
                        const delay = 500 * Math.pow(2, i); // 500, 1000, 2000ms
                        console.log(`Supabase request failed, retrying in ${delay}ms... (${i + 1}/${MAX_RETRIES})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    // For other errors, throw immediately
                    throw error;
                }
            }
            throw lastError;
        },
    },
})
