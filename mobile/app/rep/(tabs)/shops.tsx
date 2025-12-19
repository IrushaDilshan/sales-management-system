import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type ShopRequest = {
    shopId: number;
    shopName: string;
    requestCount: number;
    latestDate: string;
};

export default function ShopsListScreen() {
    const [shops, setShops] = useState<ShopRequest[]>([]);
    const [filteredShops, setFilteredShops] = useState<ShopRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchShops();
    }, []);

    const fetchShops = async () => {
        setLoading(true);
        try {
            // Get current user ID
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            let currentUserId = null;
            if (userEmail) {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('id, name')
                    .eq('email', userEmail)
                    .single();
                currentUserId = userRecord?.id;
            }

            if (!currentUserId) {
                Alert.alert('Error', 'Could not identify current user');
                setShops([]);
                setFilteredShops([]);
                setLoading(false);
                return;
            }

            // 1. Find all routes where this rep is assigned
            const { data: myRoutes, error: routesError } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', currentUserId);

            if (routesError && routesError.code !== 'PGRST116') throw routesError;

            const myRouteIds = myRoutes?.map(r => r.id) || [];

            // 2. Find all shops assigned to this rep (either directly or through routes)
            let shopsQuery = supabase
                .from('shops')
                .select('id, name');

            if (myRouteIds.length > 0) {
                shopsQuery = shopsQuery.or(`rep_id.eq.${currentUserId},route_id.in.(${myRouteIds.join(',')})`);
            } else {
                shopsQuery = shopsQuery.eq('rep_id', currentUserId);
            }

            const { data: shopsData, error: shopsError } = await shopsQuery;

            if (shopsError) throw shopsError;

            if (!shopsData || shopsData.length === 0) {
                setShops([]);
                setFilteredShops([]);
                return;
            }

            const shopIds = shopsData.map(s => s.id);

            // 3. Fetch pending requests for these shops
            const { data: requestsData, error: reqError } = await supabase
                .from('requests')
                .select('id, shop_id, date')
                .eq('status', 'pending')
                .in('shop_id', shopIds);

            if (reqError) throw reqError;

            if (!requestsData || requestsData.length === 0) {
                setShops([]);
                setFilteredShops([]);
                return;
            }

            // 4. Aggregate
            const shopsMap = new Map();
            shopsData?.forEach((s: any) => shopsMap.set(s.id, s.name));

            const shopIdsWithRequests = Array.from(new Set(requestsData.map((r: any) => r.shop_id)));

            const aggregated = shopIdsWithRequests.map(id => {
                const shopRequests = requestsData.filter((r: any) => r.shop_id === id);
                return {
                    shopId: id,
                    shopName: shopsMap.get(id) || 'Unknown Shop',
                    requestCount: shopRequests.length,
                    latestDate: shopRequests[0]?.date
                };
            });

            setShops(aggregated);
            setFilteredShops(aggregated);

        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchShops();
    };

    const handleSearch = (text: string) => {
        setSearch(text);
        if (text) {
            setFilteredShops(shops.filter(s => s.shopName.toLowerCase().includes(text.toLowerCase())));
        } else {
            setFilteredShops(shops);
        }
    };

    const renderItem = ({ item }: { item: ShopRequest }) => (
        <TouchableOpacity
            style={styles.shopCard}
            onPress={() => router.push(`/rep/request/${item.shopId}`)}
            activeOpacity={0.7}
        >
            {/* Shop Icon */}
            <View style={styles.shopIconWrapper}>
                <LinearGradient
                    colors={['#F59E0B', '#F97316']}
                    style={styles.shopIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name="storefront" size={24} color="#FFF" />
                </LinearGradient>
            </View>

            {/* Shop Details */}
            <View style={styles.shopDetails}>
                <Text style={styles.shopName} numberOfLines={1}>{item.shopName}</Text>
                <View style={styles.requestBadge}>
                    <Ionicons name="receipt-outline" size={12} color="#6366F1" />
                    <Text style={styles.requestText}>
                        {item.requestCount} {item.requestCount === 1 ? 'Request' : 'Requests'}
                    </Text>
                </View>
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={24} color="#CBD5E1" />
        </TouchableOpacity>
    );

    // Calculate stats
    const totalShops = filteredShops.length;
    const totalRequests = filteredShops.reduce((sum, shop) => sum + shop.requestCount, 0);
    const avgRequests = totalShops > 0 ? Math.round(totalRequests / totalShops) : 0;

    return (
        <View style={styles.container}>
            {/* Hero Header */}
            <LinearGradient
                colors={['#667EEA', '#764BA2', '#F093FB']}
                style={styles.heroHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerSubtitle}>My Assigned</Text>
                        <Text style={styles.headerTitle}>Shops</Text>
                    </View>
                    <TouchableOpacity
                        onPress={onRefresh}
                        style={styles.refreshButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="refresh" size={22} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Quick Stats */}
                <View style={styles.quickStatsRow}>
                    <View style={styles.quickStatCard}>
                        <View style={styles.quickStatIconWrapper}>
                            <LinearGradient
                                colors={['#F59E0B', '#F97316']}
                                style={styles.quickStatIconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="storefront" size={18} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <View style={styles.quickStatInfo}>
                            <Text style={styles.quickStatValue}>{totalShops}</Text>
                            <Text style={styles.quickStatLabel}>Shops</Text>
                        </View>
                    </View>

                    <View style={styles.quickStatCard}>
                        <View style={styles.quickStatIconWrapper}>
                            <LinearGradient
                                colors={['#6366F1', '#8B5CF6']}
                                style={styles.quickStatIconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="receipt" size={18} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <View style={styles.quickStatInfo}>
                            <Text style={styles.quickStatValue}>{totalRequests}</Text>
                            <Text style={styles.quickStatLabel}>Requests</Text>
                        </View>
                    </View>

                    <View style={styles.quickStatCard}>
                        <View style={styles.quickStatIconWrapper}>
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.quickStatIconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="stats-chart" size={18} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <View style={styles.quickStatInfo}>
                            <Text style={styles.quickStatValue}>{avgRequests}</Text>
                            <Text style={styles.quickStatLabel}>Avg</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#64748B" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search shops..."
                    placeholderTextColor="#94A3B8"
                    value={search}
                    onChangeText={handleSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Ionicons name="close-circle" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Shops List */}
            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#667EEA" />
                    <Text style={styles.loadingText}>Loading shops...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredShops}
                    keyExtractor={item => item.shopId.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#667EEA"
                            colors={['#667EEA', '#764BA2']}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <LinearGradient
                                colors={['#667EEA20', '#764BA220']}
                                style={styles.emptyIconCircle}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="storefront-outline" size={64} color="#667EEA" />
                            </LinearGradient>
                            <Text style={styles.emptyTitle}>No Shops Found</Text>
                            <Text style={styles.emptyText}>
                                {search ? 'Try a different search term' : 'No shops with pending requests'}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    heroHeader: {
        paddingTop: 50,
        paddingBottom: 32,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#667EEA',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: 0.5
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -1
    },
    refreshButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    quickStatsRow: {
        flexDirection: 'row',
        gap: 12
    },
    quickStatCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    quickStatIconWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3
    },
    quickStatIconGradient: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    quickStatInfo: {
        flex: 1
    },
    quickStatValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -0.5,
        marginBottom: 2
    },
    quickStatLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '500'
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        gap: 10
    },
    shopCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    shopIconWrapper: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3
    },
    shopIconGradient: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
    shopDetails: {
        flex: 1,
        minWidth: 0
    },
    shopName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        letterSpacing: -0.3,
        marginBottom: 6
    },
    requestBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    requestText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6366F1',
        letterSpacing: 0.2
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        color: '#64748B',
        fontWeight: '600'
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 80,
        paddingHorizontal: 32
    },
    emptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24
    },
    emptyTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 12,
        letterSpacing: -0.5
    },
    emptyText: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '500'
    }
});
