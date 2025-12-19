import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type PendingItem = {
    itemId: number;
    itemName: string;
    totalPendingQty: number;
    availableStock?: number;
};

export default function RepHome() {
    const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [repName, setRepName] = useState('Representative');
    const router = useRouter();

    useEffect(() => {
        fetchPendingRequests();
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            if (userEmail) {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('name')
                    .eq('email', userEmail)
                    .single();

                if (userRecord?.name) {
                    setRepName(userRecord.name);
                }
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    };

    const fetchPendingRequests = async () => {
        setLoading(true);
        try {
            // Get current user
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            let currentUserId = null;
            if (userEmail) {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', userEmail)
                    .single();
                currentUserId = userRecord?.id;
            }

            // 1. First, find all routes where this rep is assigned
            console.log('🔍 Current User ID:', currentUserId);

            const { data: myRoutes, error: routesError } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', currentUserId);

            if (routesError && routesError.code !== 'PGRST116') throw routesError;

            const myRouteIds = myRoutes?.map(r => r.id) || [];
            console.log('🛣️ Routes assigned to this rep:', myRouteIds);

            // 2. Find all shops assigned to this rep (either directly or through routes)
            let shopsQuery = supabase
                .from('shops')
                .select('id, name, rep_id, route_id');

            // Build the query to find shops where:
            // - rep_id matches current user (direct assignment)
            // - OR route_id is in the rep's assigned routes
            if (myRouteIds.length > 0) {
                // Rep has routes OR direct shop assignments
                shopsQuery = shopsQuery.or(`rep_id.eq.${currentUserId},route_id.in.(${myRouteIds.join(',')})`);
            } else {
                // Rep only has direct shop assignments, no routes
                shopsQuery = shopsQuery.eq('rep_id', currentUserId);
            }

            const { data: shopsData, error: shopsError } = await shopsQuery;

            if (shopsError) throw shopsError;

            console.log('🏪 Shops assigned to this rep:', shopsData);

            if (!shopsData || shopsData.length === 0) {
                console.log('⚠️ No shops found for this rep');
                setPendingItems([]);
                return;
            }

            const shopIds = shopsData.map(s => s.id);
            console.log('📝 Shop IDs:', shopIds);

            // 2. Fetch pending requests for these shops
            const { data: requestsData, error: reqError } = await supabase
                .from('requests')
                .select('id, status, shop_id')
                .eq('status', 'pending')
                .in('shop_id', shopIds);

            if (reqError) throw reqError;

            console.log('📋 Pending requests for these shops:', requestsData);

            if (!requestsData || requestsData.length === 0) {
                setPendingItems([]);
                return;
            }

            // Fetch request items
            const requestIds = requestsData.map(r => r.id);
            const { data: itemsData, error: itemsError } = await supabase
                .from('request_items')
                .select('id, request_id, qty, delivered_qty, item_id')
                .in('request_id', requestIds);

            if (itemsError) throw itemsError;

            // Get unique item IDs
            const itemIds = Array.from(new Set(itemsData?.map(row => row.item_id)));

            // Fetch item details
            const { data: productsData, error: productsError } = await supabase
                .from('items')
                .select('id, name')
                .in('id', itemIds);

            if (productsError) throw productsError;

            // Fetch rep's stock
            const { data: repTransactions, error: stockError } = await supabase
                .from('stock_transactions')
                .select('item_id, qty, type')
                .eq('rep_id', currentUserId)
                .in('item_id', itemIds);

            if (stockError && stockError.code !== 'PGRST116') throw stockError;

            const itemsMap = new Map();
            const repStockMap = new Map();

            productsData?.forEach(p => itemsMap.set(p.id, p.name));

            // Calculate rep's available stock per item
            repTransactions?.forEach(trans => {
                const currentStock = repStockMap.get(trans.item_id) || 0;
                if (trans.type === 'OUT') {
                    repStockMap.set(trans.item_id, currentStock + trans.qty);
                }
            });

            // Aggregate pending items
            const itemsAggregationMap = new Map<number, PendingItem>();

            itemsData?.forEach(row => {
                const pending = row.qty - (row.delivered_qty || 0);
                if (pending <= 0) return;

                const itemId = row.item_id;
                if (!itemId) return;

                const itemName = itemsMap.get(itemId) || 'Unknown Item';
                const currentStock = repStockMap.get(itemId) || 0;

                if (itemsAggregationMap.has(itemId)) {
                    const existing = itemsAggregationMap.get(itemId)!;
                    existing.totalPendingQty += pending;
                } else {
                    itemsAggregationMap.set(itemId, {
                        itemId: itemId,
                        itemName: itemName,
                        totalPendingQty: pending,
                        availableStock: currentStock
                    });
                }
            });

            setPendingItems(Array.from(itemsAggregationMap.values()));

        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPendingRequests();
    };

    const renderItem = ({ item }: { item: PendingItem }) => {
        const hasEnough = (item.availableStock || 0) >= item.totalPendingQty;
        const statusColor = hasEnough ? '#4CAF50' : '#FF9800';
        const statusIcon = hasEnough ? 'checkmark-circle' : 'alert-circle';

        return (
            <View style={styles.card}>
                {/* Left Icon */}
                <View style={styles.itemIconWrapper}>
                    <Ionicons name="cube" size={20} color="#2196F3" />
                </View>

                {/* Item Name */}
                <View style={styles.itemNameContainer}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>
                </View>

                {/* Quantities */}
                <View style={styles.quantitiesRow}>
                    <View style={styles.compactBadge}>
                        <Text style={styles.compactLabel}>Pending</Text>
                        <Text style={[styles.compactValue, { color: '#DC2626' }]}>
                            {item.totalPendingQty}
                        </Text>
                    </View>

                    <View style={styles.compactBadge}>
                        <Text style={styles.compactLabel}>Stock</Text>
                        <Text style={[styles.compactValue, { color: hasEnough ? '#4CAF50' : '#FF9800' }]}>
                            {item.availableStock || 0}
                        </Text>
                    </View>
                </View>

                {/* Status Icon */}
                <Ionicons name={statusIcon} size={24} color={statusColor} />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Gradient Header */}
            <LinearGradient
                colors={['#2196F3', '#1976D2', '#1565C0']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerSubtitle}>Welcome back</Text>
                        <Text style={styles.headerTitle}>{repName}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={onRefresh}
                        style={styles.headerButton}
                    >
                        <Ionicons name="refresh" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Pending Items List */}
            <View style={styles.listContainer}>
                <Text style={styles.sectionTitle}>Pending Items Summary</Text>

                {loading && !refreshing ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#2196F3" />
                    </View>
                ) : (
                    <FlatList
                        data={pendingItems}
                        keyExtractor={item => item.itemId.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#2196F3"
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="checkmark-done-circle" size={80} color="#E5E7EB" />
                                <Text style={styles.emptyTitle}>All Clear!</Text>
                                <Text style={styles.emptyText}>No pending items at the moment</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA'
    },
    header: {
        paddingTop: 50,
        paddingBottom: 24,
        paddingHorizontal: 20,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        marginBottom: 4,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase'
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.5
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A2E',
        marginBottom: 16,
        letterSpacing: -0.3
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60
    },
    list: {
        paddingBottom: 100,
        gap: 8
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 14,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2
    },
    itemIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center'
    },
    itemNameContainer: {
        flex: 1,
        minWidth: 0
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1A1A2E',
        letterSpacing: -0.2
    },
    quantitiesRow: {
        flexDirection: 'row',
        gap: 8
    },
    compactBadge: {
        alignItems: 'center',
        minWidth: 50
    },
    compactLabel: {
        fontSize: 9,
        color: '#9CA3AF',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 2
    },
    compactValue: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.3
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1A2E',
        marginTop: 16,
        marginBottom: 8
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20
    }
});
