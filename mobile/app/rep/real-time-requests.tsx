import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type RealTimeRequest = {
    id: number;
    shopName: string;
    shopId: number;
    date: string;
    itemCount: number;
};

export default function RealTimeRequests() {
    const router = useRouter();
    const [realTimeRequests, setRealTimeRequests] = useState<RealTimeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchRealTimeRequests();
    }, []);

    const fetchRealTimeRequests = async () => {
        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            let currentUserId = null;
            if (userEmail) {
                const { data: userRecord, error: userError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (userError) {
                    console.error('Error fetching user:', userError);
                }
                currentUserId = userRecord?.id;
            }

            if (!currentUserId) {
                setRealTimeRequests([]);
                setLoading(false);
                return;
            }

            // Get shops assigned to this rep
            const { data: myRoutes } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', currentUserId);

            const myRouteIds = myRoutes?.map(r => r.id) || [];

            let shopsQuery = supabase
                .from('shops')
                .select('id, name');

            if (myRouteIds.length > 0) {
                shopsQuery = shopsQuery.or(`rep_id.eq.${currentUserId},route_id.in.(${myRouteIds.join(',')})`);
            } else {
                shopsQuery = shopsQuery.eq('rep_id', currentUserId);
            }

            const { data: shopsData } = await shopsQuery;

            if (!shopsData || shopsData.length === 0) {
                setRealTimeRequests([]);
                setLoading(false);
                return;
            }

            // Create shop name map
            const shopNamesMap = new Map();
            shopsData.forEach(shop => shopNamesMap.set(shop.id, shop.name));

            const shopIds = shopsData.map(s => s.id).filter(id => id != null);

            if (shopIds.length === 0) {
                setRealTimeRequests([]);
                setLoading(false);
                return;
            }

            // Fetch ALL pending requests (no date filter - real-time)
            const { data: requestsData } = await supabase
                .from('requests')
                .select('id, shop_id, date')
                .eq('status', 'pending')
                .in('shop_id', shopIds)
                .order('date', { ascending: false });

            if (!requestsData || requestsData.length === 0) {
                setRealTimeRequests([]);
                setLoading(false);
                return;
            }

            // Get item counts for each request
            const requestIds = requestsData.map(r => r.id);
            const { data: itemsData } = await supabase
                .from('request_items')
                .select('request_id')
                .in('request_id', requestIds);

            // Count items per request
            const itemCountMap = new Map();
            itemsData?.forEach(item => {
                const count = itemCountMap.get(item.request_id) || 0;
                itemCountMap.set(item.request_id, count + 1);
            });

            // Build real-time requests array
            const realTimeReqs: RealTimeRequest[] = requestsData.map(req => ({
                id: req.id,
                shopName: shopNamesMap.get(req.shop_id) || 'Unknown Shop',
                shopId: req.shop_id,
                date: req.date,
                itemCount: itemCountMap.get(req.id) || 0
            }));

            setRealTimeRequests(realTimeReqs);

        } catch (err: any) {
            if (
                err.name === 'AbortError' ||
                err.message?.includes('aborted') ||
                err.message?.includes('Aborted')
            ) {
                return;
            }
            console.error('Error fetching real-time requests:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRealTimeRequests();
    };

    const renderRequest = ({ item }: { item: RealTimeRequest }) => {
        const requestDate = new Date(item.date);
        const now = new Date();
        const diffMs = now.getTime() - requestDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeAgo = '';
        if (diffMins < 1) timeAgo = 'Just now';
        else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
        else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
        else timeAgo = `${diffDays}d ago`;

        const isNew = diffHours < 24;

        return (
            <TouchableOpacity
                style={styles.requestCard}
                onPress={() => router.push(`/rep/request-details/${item.id}` as any)}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={isNew ? ['#F0F9FF', '#E0F2FE'] : ['#FFFFFF', '#F9FAFB']}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Shop Icon */}
                    <View style={styles.iconWrapper}>
                        <LinearGradient
                            colors={['#7C3AED', '#EC4899']}
                            style={styles.icon}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="storefront" size={20} color="#FFF" />
                        </LinearGradient>
                    </View>

                    {/* Shop Details */}
                    <View style={styles.details}>
                        <Text style={styles.shopName} numberOfLines={1}>
                            {item.shopName}
                        </Text>
                        <View style={styles.meta}>
                            <Ionicons name="time-outline" size={13} color="#64748B" />
                            <Text style={styles.time}>{timeAgo}</Text>
                            <View style={styles.itemBadge}>
                                <Ionicons name="cube-outline" size={12} color="#7C3AED" />
                                <Text style={styles.itemCount}>{item.itemCount} items</Text>
                            </View>
                        </View>
                    </View>

                    {/* New Badge & Chevron */}
                    <View style={styles.rightSection}>
                        {isNew && (
                            <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>NEW</Text>
                            </View>
                        )}
                        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Premium Gradient Header */}
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
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerSubtitle}>ALL SHOP REQUESTS</Text>
                        <Text style={styles.headerTitle}>Real-Time View</Text>
                    </View>
                    <View style={styles.backButton} />
                </View>

                {/* Live Counter */}
                <View style={styles.counterCard}>
                    <View style={styles.liveDot} />
                    <Text style={styles.counterText}>
                        {realTimeRequests.length} Active Request{realTimeRequests.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </LinearGradient>

            {/* Content */}
            <View style={styles.content}>
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
                        <Text style={styles.loadingText}>Loading requests...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={realTimeRequests}
                        keyExtractor={item => item.id.toString()}
                        renderItem={renderRequest}
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
                            <View style={styles.emptyState}>
                                <LinearGradient
                                    colors={['#7C3AED15', '#EC489915']}
                                    style={styles.emptyCircle}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={72} color="#7C3AED" />
                                </LinearGradient>
                                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                                <Text style={styles.emptyMessage}>
                                    No pending requests from your shops right now
                                </Text>
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
        backgroundColor: '#F8FAFC'
    },
    header: {
        paddingTop: 50,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 16,
        overflow: 'hidden'
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
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        zIndex: 1
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 12
    },
    headerSubtitle: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 1.2,
        textTransform: 'uppercase'
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.8,
        textAlign: 'center'
    },
    counterCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        zIndex: 1
    },
    liveDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
        marginRight: 8
    },
    counterText: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '800',
        letterSpacing: 0.3
    },
    content: {
        flex: 1,
        paddingTop: 20
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        gap: 12
    },
    requestCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    cardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderRadius: 16
    },
    iconWrapper: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3
    },
    icon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    details: {
        flex: 1,
        gap: 7
    },
    shopName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    time: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600'
    },
    itemBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10
    },
    itemCount: {
        fontSize: 12,
        color: '#7C3AED',
        fontWeight: '700'
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    newBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10
    },
    newBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5
    },
    loadingState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60
    },
    loadingCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    loadingText: {
        fontSize: 15,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 12
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40
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
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 12,
        letterSpacing: -1
    },
    emptyMessage: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '500'
    }
});
