import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl, AppState } from 'react-native';
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

        // Auto-refresh when app comes to foreground
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                fetchPendingRequests();
            }
        });

        return () => {
            subscription?.remove();
        };
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

            const { data: myRoutes, error: routesError } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', currentUserId);

            if (routesError && routesError.code !== 'PGRST116') throw routesError;

            const myRouteIds = myRoutes?.map(r => r.id) || [];

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

            const requestIds = requestsData.map(r => r.id);
            const { data: itemsData, error: itemsError } = await supabase
                .from('request_items')
                .select('id, request_id, qty, delivered_qty, item_id')
                .in('request_id', requestIds);

            if (itemsError) throw itemsError;

            const itemIds = Array.from(new Set(itemsData?.map(row => row.item_id)));

            const { data: productsData, error: productsError } = await supabase
                .from('items')
                .select('id, name')
                .in('id', itemIds);

            if (productsError) throw productsError;

            // Calculate start of today (00:00:00) - Daily Stock Reset
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            // Only get TODAY's stock transactions (auto-resets at midnight)
            const { data: repTransactions, error: stockError } = await supabase
                .from('stock_transactions')
                .select('item_id, qty, type, created_at')
                .eq('rep_id', currentUserId)
                .in('item_id', itemIds)
                .gte('created_at', todayISO); // Filter: created_at >= today 00:00

            if (stockError && stockError.code !== 'PGRST116') throw stockError;

            const itemsMap = new Map();
            const repStockMap = new Map();

            productsData?.forEach(p => itemsMap.set(p.id, p.name));

            repTransactions?.forEach(trans => {
                const currentStock = repStockMap.get(trans.item_id) || 0;
                if (trans.type === 'OUT') {
                    // Stock assigned by storekeeper TODAY
                    repStockMap.set(trans.item_id, currentStock + trans.qty);
                }
            });

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
            // Suppress harmless errors
            if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                console.log('Request aborted (navigated away)');
                return;
            }

            if (err.message?.includes('Network request failed')) {
                console.log('Network issue, will retry on refresh');
                return;
            }

            console.error(err);
            Alert.alert('Error', err.message || 'Failed to load data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPendingRequests();
    };

    const totalPendingQty = pendingItems.reduce((sum, item) => sum + item.totalPendingQty, 0);
    const totalAvailableStock = pendingItems.reduce((sum, item) => sum + (item.availableStock || 0), 0);
    const itemsInShortage = pendingItems.filter(item => (item.availableStock || 0) < item.totalPendingQty).length;

    const renderItem = ({ item, index }: { item: PendingItem; index: number }) => {
        const hasEnough = (item.availableStock || 0) >= item.totalPendingQty;

        return (
            <TouchableOpacity
                style={styles.modernCard}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={hasEnough ? ['#ECFDF5', '#D1FAE5'] : ['#FEF2F2', '#FEE2E2']}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.simpleCardLayout}>
                        {/* Icon */}
                        <View style={[styles.modernIcon, {
                            backgroundColor: hasEnough ? '#10B98140' : '#EF444440'
                        }]}>
                            <Ionicons
                                name="cube-outline"
                                size={20}
                                color={hasEnough ? '#059669' : '#DC2626'}
                            />
                        </View>

                        {/* Item Name */}
                        <View style={styles.itemNameSection}>
                            <Text style={styles.modernItemName} numberOfLines={1}>
                                {item.itemName}
                            </Text>
                            <View style={styles.stockIndicator}>
                                <Ionicons
                                    name={hasEnough ? 'checkmark-circle' : 'alert-circle'}
                                    size={10}
                                    color={hasEnough ? '#059669' : '#DC2626'}
                                />
                                <Text style={[styles.stockStatusText, {
                                    color: hasEnough ? '#059669' : '#DC2626'
                                }]}>
                                    {hasEnough ? 'In Stock' : 'Low Stock'}
                                </Text>
                            </View>
                        </View>

                        {/* Pending Quantity Badge */}
                        <View style={styles.pendingBadge}>
                            <Text style={styles.pendingQty}>{item.totalPendingQty}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Premium Hero Header */}
            <LinearGradient
                colors={['#7C3AED', '#A78BFA', '#EC4899', '#F472B6']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative circles */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />

                <View style={styles.headerContent}>
                    <View style={styles.greetingSection}>
                        <View style={styles.subtitleRow}>
                            <Ionicons name="home" size={16} color="rgba(255, 255, 255, 0.9)" />
                            <Text style={styles.greetingText}>Good {getGreeting()}</Text>
                        </View>
                        <Text style={styles.userName}>{repName}</Text>
                        {pendingItems.length > 0 && (
                            <Text style={styles.itemCount}>
                                {pendingItems.length} {pendingItems.length === 1 ? 'Item' : 'Items'} • {totalPendingQty} Pending
                            </Text>
                        )}
                    </View>
                </View>
            </LinearGradient>

            {/* Main Content */}
            <View style={styles.mainContent}>
                <View style={styles.contentHeader}>
                    <View style={styles.sectionTitleContainer}>
                        <Text style={styles.contentTitle}>Pending Requests</Text>
                        <View style={styles.statusRow}>
                            {itemsInShortage > 0 ? (
                                <>
                                    <View style={styles.warningDot} />
                                    <Text style={styles.warningText}>
                                        {itemsInShortage} item{itemsInShortage > 1 ? 's' : ''} in shortage
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <View style={styles.successDot} />
                                    <Text style={styles.successText}>All items have stock</Text>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.loadingState}>
                        <LinearGradient
                            colors={['#7C3AED20', '#EC489920']}
                            style={styles.loadingCircle}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <ActivityIndicator size="large" color="#7C3AED" />
                        </LinearGradient>
                        <Text style={styles.loadingText}>Loading your requests...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={pendingItems}
                        keyExtractor={item => item.itemId.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#7C3AED"
                                colors={['#7C3AED', '#EC4899']}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <LinearGradient
                                    colors={['#7C3AED15', '#EC489915']}
                                    style={styles.emptyCircle}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="checkmark-done-circle-outline" size={72} color="#7C3AED" />
                                </LinearGradient>
                                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                                <Text style={styles.emptyMessage}>
                                    No pending requests right now.{'\n'}
                                    You're doing an amazing job! 🎉
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

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
    header: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        overflow: 'hidden',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 16
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        top: -50,
        right: -50
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        bottom: -30,
        left: -40
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        zIndex: 1
    },
    greetingSection: {
        flex: 1,
        gap: 6
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
    },
    greetingText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.95)',
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase'
    },
    userName: {
        fontSize: 40,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1.5,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8
    },
    itemCount: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '600',
        marginTop: 4,
        letterSpacing: 0.3
    },
    refreshBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4
    },
    statsCardsContainer: {
        flexDirection: 'row',
        gap: 12,
        zIndex: 1
    },
    statCardSmall: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        alignItems: 'center',
        gap: 6
    },
    statCardIconTop: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2
    },
    statCardValueNew: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -1,
        textShadowColor: 'rgba(0, 0, 0, 0.15)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        lineHeight: 32
    },
    statCardLabelNew: {
        fontSize: 9,
        color: 'rgba(255, 255, 255, 0.95)',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    statIconContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3
    },
    statIconGradient: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    statCardValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2
    },
    statCardLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: 2
    },
    mainContent: {
        flex: 1,
        paddingTop: 28
    },
    contentHeader: {
        paddingHorizontal: 24,
        marginBottom: 20
    },
    sectionTitleContainer: {
        gap: 8
    },
    contentTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.8
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    warningDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B'
    },
    warningText: {
        fontSize: 14,
        color: '#D97706',
        fontWeight: '600'
    },
    successDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981'
    },
    successText: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '600'
    },
    listContainer: {
        paddingHorizontal: 24,
        paddingBottom: 120,
        gap: 8
    },
    modernCard: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2
    },
    cardGradient: {
        padding: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)'
    },
    simpleCardLayout: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    itemNameSection: {
        flex: 1,
        gap: 4,
        minWidth: 0
    },
    pendingBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        minWidth: 46,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)'
    },
    pendingQty: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5
    },
    compactCardLayout: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 0
    },
    itemDetails: {
        flex: 1,
        gap: 4,
        minWidth: 0
    },
    statsCompact: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 12,
        padding: 8,
        gap: 8,
        alignItems: 'center'
    },
    statItem: {
        alignItems: 'center',
        minWidth: 44
    },
    statLabelCompact: {
        fontSize: 9,
        color: '#64748B',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 2
    },
    statValueCompact: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.3
    },
    statItemDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#CBD5E1',
        opacity: 0.4
    },
    modernIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modernItemName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.2
    },
    stockIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    stockStatusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2
    },
    progressMini: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 4,
        overflow: 'hidden'
    },
    progressFillMini: {
        height: '100%',
        borderRadius: 4
    },
    loadingState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
        gap: 24
    },
    loadingCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600',
        letterSpacing: 0.2
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 100,
        paddingHorizontal: 40,
        gap: 20
    },
    emptyCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28
    },
    emptyTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 12,
        letterSpacing: -1
    },
    emptyMessage: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
        letterSpacing: 0.2
    }
});
