import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function ShopListScreen() {
    const router = useRouter();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchShops();
    }, []);

    async function fetchShops() {
        setLoading(true);
        try {
            // Get the current logged-in user
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.error('Auth error:', authError);

                // For demo mode users - show a default test shop
                console.warn('No authenticated user - might be in demo mode');
                setShops([]);
                setLoading(false);
                return;
            }

            console.log('Logged in user ID:', user.id);
            console.log('User email:', user.email);

            // Get user's assigned shop from the users table
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('shop_id, role, name, email')
                .eq('id', user.id)
                .single();

            console.log('User data from database:', userData);
            console.log('User query error:', userError);

            if (userError) {
                // Check if it's a 502 error (network issue)
                if (userError.message?.includes('502') || userError.message?.includes('Bad Gateway')) {
                    console.error('Network error (502 Bad Gateway) - Supabase server issue');
                    setShops([]);
                    setLoading(false);
                    return;
                }

                console.error('Error fetching user data:', userError);
                setShops([]);
                setLoading(false);
                return;
            }

            // If user doesn't have an assigned shop, show error
            if (!userData?.shop_id) {
                console.warn('No shop assigned to this user');
                console.log('User record:', userData);
                setShops([]);
                setLoading(false);
                return;
            }

            console.log('Fetching shop with ID:', userData.shop_id);

            // Fetch ONLY the assigned shop for this salesman
            const { data, error } = await supabase
                .from('shops')
                .select('*')
                .eq('id', userData.shop_id)
                .single();

            console.log('Shop data retrieved:', data);
            console.log('Shop query error:', error);

            if (error) {
                // Check for 502 errors
                if (error.message?.includes('502') || error.message?.includes('Bad Gateway')) {
                    console.error('Network error (502 Bad Gateway) - Cannot reach Supabase');
                } else {
                    console.error("Error fetching shop:", error);
                }
                setShops([]);
            } else {
                // Return as array to work with FlatList
                setShops(data ? [data] : []);
                console.log('Successfully loaded shop:', data?.name);
            }
        } catch (error: any) {
            console.error('Error in fetchShops:', error);
            console.error('Error details:', error.message);
            setShops([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            {/* Modern Header with Gradient */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerSubtitle}>Ready to Order?</Text>
                    <Text style={styles.headerTitle}>Select Your Shop</Text>
                </View>
                <TouchableOpacity
                    style={styles.refreshBtn}
                    onPress={() => fetchShops()}
                >
                    <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2196F3" />
                        <Text style={styles.loadingText}>Loading your shop...</Text>
                    </View>
                ) : shops.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="storefront-outline" size={64} color="#cbd5e1" />
                        </View>
                        <Text style={styles.emptyTitle}>No Shop Assigned</Text>
                        <Text style={styles.emptyText}>
                            You don't have a shop assigned yet.{'\n\n'}
                            Please contact your manager to assign a shop to your account.{'\n\n'}
                            <Text style={{ fontSize: 13, color: '#999' }}>
                                Tip: Check the console logs for detailed diagnostic information.
                            </Text>
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={shops}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.shopCard}
                                onPress={() => router.push({ pathname: '/requests/create', params: { shop_id: item.id, shop_name: item.name } })}
                                activeOpacity={0.7}
                            >
                                <View style={styles.shopCardLeft}>
                                    <View style={styles.shopIconContainer}>
                                        <Ionicons name="storefront" size={28} color="#2196F3" />
                                    </View>
                                    <View style={styles.shopInfo}>
                                        <Text style={styles.shopName}>{item.name}</Text>
                                        <Text style={styles.shopSubtitle}>Your assigned location</Text>
                                    </View>
                                </View>
                                <View style={styles.shopCardRight}>
                                    <View style={styles.arrowContainer}>
                                        <Ionicons name="arrow-forward" size={20} color="#2196F3" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    header: {
        backgroundColor: '#2196F3',
        padding: 24,
        paddingTop: 60,
        paddingBottom: 28,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerContent: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 12
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 4,
        fontWeight: '500'
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5
    },
    refreshBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    content: {
        flex: 1
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '600'
    },
    listContent: {
        padding: 20,
        paddingBottom: 40
    },
    shopCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    shopCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    shopIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    shopInfo: {
        flex: 1
    },
    shopName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 4
    },
    shopSubtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500'
    },
    shopCardRight: {
        marginLeft: 12
    },
    arrowContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 60
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 12,
        textAlign: 'center'
    },
    emptyText: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500'
    }
});
