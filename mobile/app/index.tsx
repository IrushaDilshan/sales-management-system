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
                router.replace('/login');
                return;
            }

            // Optimization: Check metadata first (offline support)
            const metadataRole = session.user.user_metadata?.role;
            if (metadataRole) {
                console.log('Role found in session metadata:', metadataRole);
                handleRoleRedirect(metadataRole);
                return;
            }

            // Fallback: Fetch role from database
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (userError || !userData?.role) {
                console.log('Could not fetch user role (network issue?):', userError?.message);
                router.replace('/login');
                return;
            }

            console.log('Role fetched from DB:', userData.role);
            handleRoleRedirect(userData.role);

        } catch (error: any) {
            console.log('Auth check error:', error);

            // Handle invalid refresh token specifically
            if (error?.message?.includes('refresh token') ||
                JSON.stringify(error).includes('refresh token') ||
                error?.name === 'AuthSessionMissingError') {
                console.log('Refresh token invalid, clearing session...');
                await supabase.auth.signOut().catch(() => { });
            }

            router.replace('/login');
        }
    };

    const handleRoleRedirect = (role: string) => {
        switch (role.toLowerCase()) {
            case 'salesman':
            case 'shop_owner':
                router.replace('/(tabs)/home');
                break;
            case 'rep':
            case 'representative':
                router.replace('/rep/(tabs)/home');
                break;
            case 'storekeeper':
                router.replace('/storekeeper/(tabs)/home');
                break;
            case 'admin':
                router.replace('/dashboard');
                break;
            default:
                console.warn('Unknown role:', role);
                router.replace('/(tabs)/home');
        }
    };

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
