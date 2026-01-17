import { useState, useCallback } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

type RealTimeRequest = {
    id: number;
    shopName: string;
    shopId: number;
    date: string;
    created_at?: string;
    itemCount: number;
};

type GroupedSection = {
    title: string;
    data: RealTimeRequest[];
};

const groupByDate = (requests: RealTimeRequest[]): GroupedSection[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const groups = new Map<string, RealTimeRequest[]>();

    requests.forEach(request => {
        const dateStr = request.created_at || request.date;
        const requestDate = new Date(dateStr);
        const requestDay = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());

        const diffTime = today.getTime() - requestDay.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let dateLabel: string;
        if (diffDays === 0) dateLabel = 'Today';
        else if (diffDays === 1) dateLabel = 'Yesterday';
        else if (diffDays < 7) dateLabel = `${diffDays} days ago`;
        else dateLabel = requestDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (!groups.has(dateLabel)) groups.set(dateLabel, []);
        groups.get(dateLabel)!.push(request);
    });

    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
};

export default function RealTimeRequests() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [realTimeRequests, setRealTimeRequests] = useState<GroupedSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Today', 'Yesterday'])); // Default expanded

    useFocusEffect(
        useCallback(() => {
            fetchRealTimeRequests();
        }, [])
    );

    const toggleSection = (sectionTitle: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionTitle)) newSet.delete(sectionTitle);
            else newSet.add(sectionTitle);
            return newSet;
        });
    };

    const fetchRealTimeRequests = async () => {
        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            let currentUserId = null;
            if (userEmail) {
                const { data: userRecord } = await supabase.from('users').select('id').eq('email', userEmail).maybeSingle();
                currentUserId = userRecord?.id;
            }

            if (!currentUserId) {
                setRealTimeRequests([]);
                setLoading(false);
                return;
            }

            const { data: myRoutes } = await supabase.from('routes').select('id').eq('rep_id', currentUserId);
            const myRouteIds = myRoutes?.map(r => r.id) || [];

            let shopsQuery = supabase.from('shops').select('id, name');
            if (myRouteIds.length > 0) shopsQuery = shopsQuery.or(`rep_id.eq.${currentUserId},route_id.in.(${myRouteIds.join(',')})`);
            else shopsQuery = shopsQuery.eq('rep_id', currentUserId);

            const { data: shopsData } = await shopsQuery;
            if (!shopsData || shopsData.length === 0) {
                setRealTimeRequests([]);
                setLoading(false);
                return;
            }

            const shopNamesMap = new Map();
            shopsData.forEach(shop => shopNamesMap.set(shop.id, shop.name));
            const shopIds = shopsData.map(s => s.id).filter(id => id != null);

            const { data: requestsData } = await supabase
                .from('requests')
                .select('id, shop_id, date, created_at')
                .eq('status', 'pending')
                .in('shop_id', shopIds)
                .order('created_at', { ascending: false });

            if (!requestsData || requestsData.length === 0) {
                setRealTimeRequests([]);
                return;
            }

            const requestIds = requestsData.map(r => r.id);
            const { data: itemsData } = await supabase
                .from('request_items')
                .select('request_id')
                .in('request_id', requestIds);

            const itemCountMap = new Map();
            itemsData?.forEach(item => {
                const count = itemCountMap.get(item.request_id) || 0;
                itemCountMap.set(item.request_id, count + 1);
            });

            const realTimeReqs: RealTimeRequest[] = requestsData.map(req => ({
                id: req.id,
                shopName: shopNamesMap.get(req.shop_id) || 'Unknown Shop',
                shopId: req.shop_id,
                date: req.date,
                created_at: req.created_at,
                itemCount: itemCountMap.get(req.id) || 0
            }));

            const grouped = groupByDate(realTimeReqs);
            setRealTimeRequests(grouped);

            // Expand all initially if wanted, or just Today/Yesterday
            // setExpandedSections(new Set(grouped.map(g => g.title)));

        } catch (err: any) {
            console.log('Error fetching requests:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const renderRequest = ({ item }: { item: RealTimeRequest }) => {
        const hasTime = item.created_at && item.created_at.length > 10;
        let timeAgo = '';
        if (hasTime) {
            let dateStr = item.created_at!;
            if (!dateStr.endsWith('Z') && !dateStr.includes('+')) dateStr += 'Z';
            const requestDate = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - requestDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) timeAgo = 'Just now';
            else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
            else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
            else timeAgo = `${diffDays}d ago`;
        } else {
            timeAgo = new Date(item.date).toLocaleDateString();
        }

        const isNew = hasTime ? (Date.now() - new Date(item.created_at!).getTime()) < 24 * 60 * 60 * 1000 : true;

        return (
            <TouchableOpacity
                style={styles.requestCard}
                onPress={() => router.push(`/rep/request-details/${item.id}` as any)}
            >
                <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="storefront" size={24} color="#EA580C" />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.shopName} numberOfLines={1}>{item.shopName}</Text>
                        <View style={styles.meta}>
                            <Ionicons name="time-outline" size={13} color="#64748B" />
                            <Text style={styles.time}>{timeAgo}</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{item.itemCount} items</Text>
                            </View>
                        </View>
                    </View>
                </View>
                {isNew && (
                    <View style={styles.newIndicator}>
                        <Text style={styles.newText}>NEW</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.title}>Real-Time Requests</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <SectionList
                    sections={realTimeRequests.map(section => ({
                        ...section,
                        data: expandedSections.has(section.title) ? section.data : []
                    }))}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderRequest}
                    renderSectionHeader={({ section }) => (
                        <TouchableOpacity
                            style={styles.sectionHeader}
                            onPress={() => toggleSection(section.title)}
                        >
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{section.data.length}</Text>
                                </View>
                                <Ionicons name={expandedSections.has(section.title) ? "chevron-up" : "chevron-down"} size={16} color="#64748B" />
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRealTimeRequests(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={styles.emptyText}>No pending requests</Text>
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
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    list: {
        paddingBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginTop: 10
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase'
    },
    countBadge: {
        backgroundColor: '#CBD5E1',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12
    },
    countText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155'
    },
    requestCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        marginHorizontal: 20,
        marginVertical: 6,
        borderRadius: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFEDD5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    shopName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    time: {
        fontSize: 13,
        color: '#64748B'
    },
    badge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8
    },
    badgeText: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '600'
    },
    newIndicator: {
        backgroundColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8
    },
    newText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#FFFFFF'
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 15
    }
});
