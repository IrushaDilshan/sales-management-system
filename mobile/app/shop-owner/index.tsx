import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function ShopOwnerDashboard() {
    const router = useRouter();
    const [shopInfo, setShopInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchShopInfo();
    }, []);

    const fetchShopInfo = async () => {
        try {
            // Get current user
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            if (!userEmail) {
                Alert.alert('Error', 'Please log in');
                return;
            }

            console.log('Fetching shop info for email:', userEmail);

            // Get user from users table
            const { data: userRecord, error: userError } = await supabase
                .from('users')
                .select('id, name, shop_id')
                .eq('email', userEmail)
                .single();

            if (userError) {
                console.error('Error fetching user:', userError);
                Alert.alert('Error', 'Could not fetch user information');
                return;
            }

            console.log('User record:', userRecord);

            if (userRecord?.shop_id) {
                // Get shop details
                const { data: shopData, error: shopError } = await supabase
                    .from('shops')
                    .select('*')
                    .eq('id', userRecord.shop_id)
                    .single();

                if (shopError) {
                    console.error('Error fetching shop:', shopError);
                    Alert.alert('Error', 'Could not fetch shop information');
                    return;
                }

                console.log('Shop data:', shopData);
                setShopInfo({ ...shopData, ownerName: userRecord.name });
            } else {
                console.warn('No shop_id found for user');
                Alert.alert('Notice', 'No shop assigned to your account. Please contact admin.');
            }
        } catch (error: any) {
            console.error('Error fetching shop info:', error);
            Alert.alert('Error', error.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const navigateToCreateRequest = () => {
        router.push({
            pathname: '/requests/create',
            params: {
                shop_id: shopInfo.id,
                shop_name: shopInfo.name
            }
        });
    };

    const navigateToSubmitIncome = () => {
        router.push({
            pathname: '/shop-owner/submit-income',
            params: {
                shop_id: shopInfo.id,
                shop_name: shopInfo.name
            }
        });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Shop Owner Dashboard</Text>
                {shopInfo && (
                    <View style={styles.shopInfoCard}>
                        <Ionicons name="storefront" size={24} color="#FF9800" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.shopName}>{shopInfo.name}</Text>
                            <Text style={styles.ownerName}>Owner: {shopInfo.ownerName}</Text>
                        </View>
                    </View>
                )}
            </View>

            <View style={styles.menuContainer}>
                <TouchableOpacity
                    style={[styles.menuCard, { backgroundColor: '#2196F3' }]}
                    onPress={navigateToCreateRequest}
                >
                    <Ionicons name="cart-outline" size={48} color="white" />
                    <Text style={styles.menuTitle}>Create Order Request</Text>
                    <Text style={styles.menuSubtitle}>
                        Submit new product orders
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.menuCard, { backgroundColor: '#4CAF50' }]}
                    onPress={navigateToSubmitIncome}
                >
                    <Ionicons name="cash-outline" size={48} color="white" />
                    <Text style={styles.menuTitle}>Submit Daily Income</Text>
                    <Text style={styles.menuSubtitle}>
                        Record today's sales
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 20
    },
    header: {
        marginTop: 40,
        marginBottom: 30
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1a1a2e',
        marginBottom: 20
    },
    shopInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3
    },
    shopName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e'
    },
    ownerName: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4
    },
    menuContainer: {
        gap: 16
    },
    menuCard: {
        padding: 24,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        alignItems: 'center'
    },
    menuTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: 'white',
        marginTop: 16,
        textAlign: 'center'
    },
    menuSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 8,
        textAlign: 'center'
    }
});
