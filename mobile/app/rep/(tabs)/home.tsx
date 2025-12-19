import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl, Animated } from 'react-native';
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
            const { data: myRoutes, error: routesError } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', currentUserId);

            if (routesError && routesError.code !== 'PGRST116') throw routesError;

            const myRouteIds = myRoutes?.map(r => r.id) || [];

            // 2. Find all shops assigned to this rep (either directly or through routes)
            let shopsQuery = supabase
                .from('shops')
                .select('id, name, rep_id, route_id');

            if (myRouteIds.length > 0) {
                shopsQuery = shopsQuery.or(`rep_id.eq.${currentUserId},route_id.in.(${myRouteIds.join(',')})`);
            } else {
                shopsQuery = shopsQuery.eq('rep_id', currentUserId);
            }

            const { data: shopsData, error: shopsError } = await shopsQuery;
            if (shopsError) throw shopsError;

            if (!shopsData || shopsData.length === 0) {
                setPendingItems([]);
                return;
            }

            const shopIds = shopsData.map(s => s.id);

            // 3. Fetch pending requests for these shops
            const { data: requestsData, error: reqError } = await supabase
                .from('requests')
                .select('id, status, shop_id')
                .eq('status', 'pending')
                .in('shop_id', shopIds);

            if (reqError) throw reqError;

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

    // Calculate stats
    const totalPendingQty = pendingItems.reduce((sum, item) => sum + item.totalPendingQty, 0);
    const totalAvailableStock = pendingItems.reduce((sum, item) => sum + (item.availableStock || 0), 0);
    const itemsInShortage = pendingItems.filter(item => (item.availableStock || 0) < item.totalPendingQty).length;
    const fulfillmentRate = pendingItems.length > 0
        ? Math.round(((pendingItems.length - itemsInShortage) / pendingItems.length) * 100)
        : 100;

    const renderItem = ({ item, index }: { item: PendingItem; index: number }) => {
        const hasEnough = (item.availableStock || 0) >= item.totalPendingQty;
        const shortage = item.totalPendingQty - (item.availableStock || 0);
        const canFulfill = hasEnough;

        return (
            <TouchableOpacity
                style={[styles.compactCard, {
                    borderLeftWidth: 5,
                    borderLeftColor: canFulfill ? '#10B981' : '#EF4444'
                }]}
                activeOpacity={0.7}
            >
                {/* Left: Item Info */}
                <View style={styles.itemSection}>
                    <View style={[styles.itemIcon, {
                        backgroundColor: canFulfill ? '#ECFDF5' : '#FEF2F2'
                    }]}>
                        <Ionicons
                            name="cube"
                            size={20}
                            color={canFulfill ? '#10B981' : '#EF4444'}
                        />
                    </View>
                    <View style={styles.itemDetails}>
                        <Text style={styles.compactItemName} numberOfLines={1}>
                            {item.itemName}
                        </Text>
                        {!canFulfill && (
                            <View style={styles.compactShortageTag}>
                                <Ionicons name="alert-circle" size={10} color="#DC2626" />
                                <Text style={styles.compactShortageText}>
                                    Short {shortage}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Center: Quick Stats */}
                <View style={styles.quickStats}>
                    <View style={styles.quickStatCol}>
                        <Text style={styles.quickStatNum}>{item.totalPendingQty}</Text>
                        <Text style={styles.quickStatText}>Need</Text>
                    </View>
                    <View style={styles.quickStatDivider} />
                    <View style={styles.quickStatCol}>
                        <Text style={[styles.quickStatNum, {
                            color: canFulfill ? '#10B981' : '#F59E0B'
                        }]}>
                            {item.availableStock || 0}
                        </Text>
                        <Text style={styles.quickStatText}>Have</Text>
                    </View>
                </View>

                {/* Right: Status Badge */}
                <View style={styles.statusSection}>
                    {canFulfill ? (
                        <View style={styles.readyBadgeLarge}>
                            <Ionicons name="checkmark-circle" size={18} color="#059669" />
                            <Text style={styles.readyBadgeText}>READY</Text>
                        </View>
                    ) : (
                        <View style={styles.urgentBadgeLarge}>
                            <Ionicons name="alert" size={18} color="#DC2626" />
                            <Text style={styles.urgentBadgeText}>LOW</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Hero Header with Gradient */}
            <LinearGradient
                colors={['#667EEA', '#764BA2', '#F093FB']}
                style={styles.heroHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Header Content */}
                <View style={styles.headerTop}>
                    <View style={styles.greetingContainer}>
                        <Text style={styles.greetingText}>Good {getGreeting()}</Text>
                        <Text style={styles.repNameLarge}>{repName}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={onRefresh}
                        style={styles.refreshButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="refresh" size={22} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Quick Stats Cards */}
                <View style={styles.quickStatsContainer}>
                    <View style={styles.quickStatCard}>
                        <View style={styles.quickStatIconWrapper}>
                            <LinearGradient
                                colors={['#667EEA', '#764BA2']}
                                style={styles.quickStatIconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="list" size={20} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <View style={styles.quickStatInfo}>
                            <Text style={styles.quickStatValue}>{pendingItems.length}</Text>
                            <Text style={styles.quickStatLabel}>Items</Text>
                        </View>
                    </View>

                    <View style={styles.quickStatCard}>
                        <View style={styles.quickStatIconWrapper}>
                            <LinearGradient
                                colors={['#F093FB', '#F5576C']}
                                style={styles.quickStatIconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="cube" size={20} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <View style={styles.quickStatInfo}>
                            <Text style={styles.quickStatValue}>{totalPendingQty}</Text>
                            <Text style={styles.quickStatLabel}>Pending</Text>
                        </View>
                    </View>

                    <View style={styles.quickStatCard}>
                        <View style={styles.quickStatIconWrapper}>
                            <LinearGradient
                                colors={['#4FACFE', '#00F2FE']}
                                style={styles.quickStatIconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="checkmark-done" size={20} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <View style={styles.quickStatInfo}>
                            <Text style={styles.quickStatValue}>{fulfillmentRate}%</Text>
                            <Text style={styles.quickStatLabel}>Ready</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Content Section */}
            <View style={styles.contentSection}>
                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>Pending Requests</Text>
                        <Text style={styles.sectionSubtitle}>
                            {itemsInShortage > 0
                                ? `${itemsInShortage} item${itemsInShortage > 1 ? 's' : ''} need attention`
                                : 'All items ready to fulfill'}
                        </Text>
                    </View>
                    {itemsInShortage > 0 && (
                        <View style={styles.alertBadge}>
                            <Ionicons name="alert-circle" size={16} color="#DC2626" />
                        </View>
                    )}
                </View>

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#667EEA" />
                        <Text style={styles.loadingText}>Loading requests...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={pendingItems}
                        keyExtractor={item => item.itemId.toString()}
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
                                    <Ionicons name="checkmark-done-circle" size={64} color="#667EEA" />
                                </LinearGradient>
                                <Text style={styles.emptyTitle}>All Clear!</Text>
                                <Text style={styles.emptyText}>
                                    No pending requests at the moment.{'\n'}
                                    Great job staying on top of things!
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

// Helper function
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
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
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24
    },
    greetingContainer: {
        flex: 1
    },
    greetingText: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: 0.5
    },
    repNameLarge: {
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
    quickStatsContainer: {
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
    contentSection: {
        flex: 1,
        paddingTop: 24,
        paddingHorizontal: 20
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.5,
        marginBottom: 4
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500'
    },
    alertBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center'
    },
    listContent: {
        paddingBottom: 100,
        gap: 10
    },
    compactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 14,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    itemSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minWidth: 0
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    itemDetails: {
        flex: 1,
        minWidth: 0
    },
    compactItemName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        letterSpacing: -0.2,
        marginBottom: 2
    },
    compactShortageTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start'
    },
    compactShortageText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#DC2626',
        textTransform: 'uppercase',
        letterSpacing: 0.3
    },
    quickStats: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 8
    },
    quickStatCol: {
        alignItems: 'center'
    },
    quickStatNum: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: -0.5
    },
    quickStatText: {
        fontSize: 9,
        color: '#64748B',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginTop: 2
    },
    quickStatDivider: {
        width: 1,
        height: '100%',
        backgroundColor: '#E2E8F0'
    },
    statusSection: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    readyBadgeLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#A7F3D0'
    },
    readyBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#059669',
        letterSpacing: 0.5
    },
    urgentBadgeLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FECACA'
    },
    urgentBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#DC2626',
        letterSpacing: 0.5
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
