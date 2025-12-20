import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Check if user is already logged in
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                // No session, redirect to login
                router.replace('/login');
                return;
            }

            // User is logged in, fetch role to determine where to go
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (userError || !userData?.role) {
                console.error('Error fetching user role:', userError);
                // Fallback to login if role is missing/error
                router.replace('/login');
                return;
            }

            console.log('Auto-login for role:', userData.role);

            // Redirect based on role (matching login.tsx logic)
            switch (userData.role.toLowerCase()) {
                case 'salesman':
                case 'shop_owner':
                    router.replace('/(tabs)/home');
                    break;
                case 'rep':
                case 'representative':
                    // Check if rep folder structure exists, otherwise fallback
                    router.replace('/rep/(tabs)/home');
                    break;
                case 'storekeeper':
                    router.replace('/storekeeper/(tabs)/home');
                    break;
                case 'admin':
                    router.replace('/dashboard');
                    break;
                default:
                    console.warn('Unknown role:', userData.role);
                    router.replace('/(tabs)/home'); // Default fallback
            }

        } catch (error: any) {
            console.error('Auth check error:', error);

            // Handle invalid refresh token specifically
            if (error?.message?.includes('refresh token') ||
                JSON.stringify(error).includes('refresh token') ||
                error?.name === 'AuthSessionMissingError') {
                console.log('Refresh token invalid, clearing session...');
                await supabase.auth.signOut().catch(() => { });
            }

            // On error, default to login
            router.replace('/login');
        }
    };

    // Show loading spinner while checking auth
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#2196F3" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa'
    }
});
