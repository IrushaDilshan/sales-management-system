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
            // Create AbortController for timeout (React Native compatible)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                return response;
            } catch (error: any) {
                clearTimeout(timeoutId);
                // Log network errors but don't crash
                if (error.name === 'AbortError') {
                    console.warn('Supabase request timeout');
                } else {
                    console.warn('Supabase fetch error:', error.message);
                }
                // Re-throw to let Supabase handle retries
                throw error;
            }
        },
    },
})
