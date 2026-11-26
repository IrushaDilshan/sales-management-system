
import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function RepHomeDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [userName, setUserName] = useState('User');
    const [refreshing, setRefreshing] = useState(false);
    const [pendingRequests, setPendingRequests] = useState(0);
    const [totalItemsCount, setTotalItemsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<{ name: string; total: number }[]>([]);
    const [rawRequests, setRawRequests] = useState<any[]>([]);
    const [rawRequestItems, setRawRequestItems] = useState<any[]>([]);
    const [productMap, setProductMap] = useState<Record<string, string>>({});
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('ALL');

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    const recomputeLoad = useCallback((
        dateFilter: string,
        reqs: any[],
        reqItems: any[],
        prodMap: Record<string, string>
    ) => {
        const filteredReqs = dateFilter === 'ALL'
            ? reqs
            : reqs.filter((r) => (r.required_date || (r.created_at || '').split('T')[0]) === dateFilter);

        setPendingRequests(filteredReqs.length);

        const reqIdSet = new Set(filteredReqs.map((r) => r.id));
        const totals: Record<string, number> = {};
        let grandTotal = 0;

        reqItems.forEach((item: any) => {
            if (!reqIdSet.has(item.request_id)) return;
            const remaining = (item.qty || 0) - (item.delivered_qty || 0);
            if (remaining > 0) {
                totals[item.item_id] = (totals[item.item_id] || 0) + remaining;
                grandTotal += remaining;
            }
        });

        setTotalItemsCount(grandTotal);
        const summaryList = Object.entries(totals)
            .map(([id, qty]) => ({
                name: prodMap[id] || 'Item Unavailable',
                total: qty,
            }))
            .sort((a, b) => b.total - a.total);
        setSummary(summaryList);
    }, []);

    const handleSelectDate = (dateKey: string) => {
        setSelectedDate(dateKey);
        recomputeLoad(dateKey, rawRequests, rawRequestItems, productMap);
    };

    const formatDateChip = (dateStr: string) => {
        if (dateStr === 'ALL') return 'All Dates';
        const todayStr = new Date().toISOString().split('T')[0];
        const tmr = new Date();
        tmr.setDate(tmr.getDate() + 1);
        const tmrStr = tmr.toISOString().split('T')[0];
        if (dateStr === todayStr) return 'Today';
        if (dateStr === tmrStr) return 'Tomorrow';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Name
            const { data: userData } = await supabase.from('users').select('id, name').eq('id', user.id).maybeSingle();
            if (userData?.name) setUserName(userData.name);

            // 1. Resolve Rep's assigned routes and shops
            const { data: myRoutes } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', user.id);
            const myRouteIds = (myRoutes || []).map((r: any) => r.id);

            let shopsQuery = supabase.from('shops').select('id');
            if (myRouteIds.length > 0) {
                shopsQuery = shopsQuery.or(`rep_id.eq.${user.id},route_id.in.(${myRouteIds.join(',')})`);
            } else {
                shopsQuery = shopsQuery.eq('rep_id', user.id);
            }
            const { data: myShops } = await shopsQuery;
            const myShopIds = (myShops || []).map((s: any) => s.id).filter(Boolean);

            if (myShopIds.length === 0) {
                setRawRequests([]);
                setRawRequestItems([]);
                setAvailableDates([]);
                setPendingRequests(0);
                setTotalItemsCount(0);
                setSummary([]);
                return;
            }

            // 2. Fetch Pending Requests ONLY for this Rep's assigned route/shops
            const { data: requestsData, error: reqError } = await supabase
                .from('requests')
                .select('id, shop_id, required_date, created_at')
                .eq('status', 'pending')
                .in('shop_id', myShopIds)
                .order('required_date', { ascending: true });

            if (!reqError && requestsData) {
                const dates = Array.from(
                    new Set(
                        requestsData
                            .map((r: any) => r.required_date || (r.created_at || '').split('T')[0])
                            .filter(Boolean)
                    )
                ).sort();

                setRawRequests(requestsData);
                setAvailableDates(dates);

                let itemsData: any[] = [];
                let prodMap: Record<string, string> = {};

                if (requestsData.length > 0) {
                    const reqIds = requestsData.map((r: any) => r.id);
                    const { data: reqItems, error: itemsError } = await supabase
                        .from('request_items')
                        .select('request_id, item_id, qty, delivered_qty')
                        .in('request_id', reqIds);

                    if (reqItems && !itemsError) {
                        itemsData = reqItems;
                        const itemIds = Array.from(new Set(reqItems.map((i: any) => i.item_id).filter(Boolean)));
                        if (itemIds.length > 0) {
                            const { data: products } = await supabase
                                .from('items')
                                .select('id, name')
                                .in('id', itemIds);
                            (products || []).forEach((p: any) => {
                                prodMap[p.id] = p.name;
                            });
                        }
                    }
                }

                setRawRequestItems(itemsData);
                setProductMap(prodMap);

                const activeDate = selectedDate !== 'ALL' && dates.includes(selectedDate)
                    ? selectedDate
                    : (dates[0] || 'ALL');
                setSelectedDate(activeDate);
                recomputeLoad(activeDate, requestsData, itemsData, prodMap);
            }

        } catch (error) { console.error(error) } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Clean Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.brandText}>
                        <Text style={{ color: '#F59E0B' }}>NLDB</Text>
                        <Text style={{ color: '#0F172A' }}>Sales</Text>
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.greetingText}>Good Morning!</Text>
                    <Text style={styles.userName}>{userName}</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.bodyContent}>

                    {/* Pending Requests Section Header */}
                    <Text style={styles.sectionTitle}>Pending Requests</Text>

                    <View style={styles.statusRow}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>All items have stock</Text>
                    </View>

                    {/* View Real-Time Button */}
                    <TouchableOpacity
                        onPress={() => router.push('/rep/real-time-requests')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#A855F7', '#EC4899']}
                            style={styles.actionBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="eye" size={20} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.actionBtnText}>View Real-Time</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Delivery Date Filter Chips */}
                    {availableDates.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, marginTop: 14, paddingVertical: 2 }}
                        >
                            {['ALL', ...availableDates].map((dKey) => {
                                const active = selectedDate === dKey;
                                return (
                                    <TouchableOpacity
                                        key={dKey}
                                        onPress={() => handleSelectDate(dKey)}
                                        style={{
                                            paddingHorizontal: 14,
                                            paddingVertical: 7,
                                            borderRadius: 999,
                                            backgroundColor: active ? '#2563EB' : '#F1F5F9',
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: '700',
                                            color: active ? '#FFFFFF' : '#475569',
                                        }}>
                                            {formatDateChip(dKey)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* Central Empty State / Content */}
                    <View style={styles.centerContent}>
                        {pendingRequests === 0 ? (
                            <>
                                <View style={styles.emptyCircle}>
                                    <Ionicons name="checkmark" size={48} color="#7C3AED" />
                                </View>
                                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                                <Text style={styles.emptyText}>
                                    No pending requests right now.{'\n'}
                                    You're doing an amazing job! 🎉
                                </Text>
                            </>
                        ) : (
                            <>
                                <View style={[styles.emptyCircle, { backgroundColor: '#FEF2F2' }]}>
                                    <View style={[styles.badgeCount, { width: 80, height: 80, borderRadius: 40 }]}>
                                        <Text style={[styles.badgeCountText, { fontSize: 28 }]}>{totalItemsCount}</Text>
                                    </View>
                                </View>
                                <Text style={styles.emptyTitle}>Pending Load</Text>
                                {summary.length > 0 ? (
                                    <View style={{ alignItems: 'center', marginTop: 8 }}>
                                        <Text style={styles.summaryTitle}>Total Items to Load</Text>
                                        {summary.slice(0, 3).map((item, idx) => (
                                            <Text key={idx} style={styles.summaryText}>
                                                {item.name}: <Text style={{ fontWeight: '700', color: '#2563EB' }}>{item.total}</Text>
                                            </Text>
                                        ))}
                                        {summary.length > 3 && (
                                            <Text style={[styles.summaryText, { fontSize: 12, opacity: 0.7 }]}>
                                                + {summary.length - 3} more items...
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <Text style={styles.emptyText}>
                                        You have {pendingRequests} pending shop requests ready for preparation.
                                    </Text>
                                )}
                            </>
                        )}
                    </View>

                </View>
                {/* Spacer for Tab Bar */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FCFCFD'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        marginBottom: 10
    },
    brandText: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    greetingText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500'
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A'
    },
    scrollContent: {
        flexGrow: 1
    },
    bodyContent: {
        paddingHorizontal: 24,
        paddingTop: 10
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 8,
        letterSpacing: -0.5
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981'
    },
    statusText: {
        color: '#10B981',
        fontWeight: '600',
        fontSize: 14
    },
    actionBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 40,
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    actionBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15
    },
    centerContent: {
        alignItems: 'center',
        marginTop: 20
    },
    emptyCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3E8FF', // Light purple
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24
    },
    badgeCount: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    badgeCountText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '800'
    },
    emptyTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 16
    },
    emptyText: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500'
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    summaryText: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
        marginBottom: 4
    }
});
