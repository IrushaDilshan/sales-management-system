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
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // User is logged in, redirect to dashboard with tabs
                router.replace('/(tabs)/home');
            } else {
                // No session, redirect to login
                router.replace('/login');
            }
        } catch (error) {
            console.error('Auth check error:', error);
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
