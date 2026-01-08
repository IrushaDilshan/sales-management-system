import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ShopListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchShops();
    }, []);

    async function fetchShops() {
        setLoading(true);
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                setShops([]);
                setLoading(false);
                return;
            }

            const { data: userData } = await supabase
                .from('users')
                .select('shop_id, role, name, email')
                .eq('id', user.id)
                .single();

            if (!userData?.shop_id) {
                setShops([]);
                setLoading(false);
                return;
            }

            const { data } = await supabase
                .from('shops')
                .select('*')
                .eq('id', userData.shop_id)
                .single();

            setShops(data ? [data] : []);
        } catch (error) {
            setShops([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

            {/* Header Area */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.refreshBtn}
                        onPress={() => fetchShops()}
                    >
                        <Ionicons name="refresh" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.headerContent}>
                    <Text style={styles.headerSubtitle}>Ready to Order?</Text>
                    <Text style={styles.headerTitle}>Select Your Shop</Text>
                </View>
            </View>

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text style={styles.loadingText}>Loading your shop...</Text>
                    </View>
                ) : shops.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="storefront-outline" size={64} color="#CBD5E1" />
                        </View>
                        <Text style={styles.emptyTitle}>No Shop Assigned</Text>
                        <Text style={styles.emptyText}>
                            You don't have a shop assigned yet.{'\n'}
                            Please contact your manager.
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
                                        <Ionicons name="storefront" size={28} color="#2563EB" />
                                    </View>
                                    <View style={styles.shopInfo}>
                                        <Text style={styles.shopName}>{item.name}</Text>
                                        <Text style={styles.shopSubtitle}>Your assigned location</Text>
                                    </View>
                                </View>
                                <View style={styles.shopCardRight}>
                                    <View style={styles.arrowContainer}>
                                        <Ionicons name="chevron-forward" size={24} color="#2563EB" />
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
        backgroundColor: '#FFFFFF'
    },
    header: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingBottom: 32,
        paddingTop: 10,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        alignItems: 'center'
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    refreshBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerContent: {
        paddingBottom: 10
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 8,
        fontWeight: '500'
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
    },
    content: {
        flex: 1
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600'
    },
    listContent: {
        padding: 24,
        paddingTop: 30
    },
    shopCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    shopCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    shopIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 18,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#DBEAFE'
    },
    shopInfo: {
        flex: 1
    },
    shopName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4
    },
    shopSubtitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500'
    },
    shopCardRight: {
        marginLeft: 12
    },
    arrowContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: -60
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
        textAlign: 'center'
    },
    emptyText: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500'
    }
});
