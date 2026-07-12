import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Activity = {
    id: string;
    type: 'request' | 'transfer' | 'return' | 'sale' | 'income';
    action: string;
    detail: string;
    date: string;
    status?: string;
    amount?: number;
};

export default function AllActivitiesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAllActivities();
    }, []);

    const fetchAllActivities = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const allActivities: Activity[] = [];

            // Get requests
            const { data: requests } = await supabase
                .from('requests')
                .select('id, created_at, status, shop_id, salesman_id')
                .eq('salesman_id', user.id)
                .order('created_at', { ascending: false });

            if (requests && requests.length > 0) {
                // Fetch shop names separately
                const shopIds = [...new Set(requests.map(r => r.shop_id))];
                const { data: shops } = await supabase
                    .from('shops')
                    .select('id, name')
                    .in('id', shopIds);

                const shopMap = new Map(shops?.map(s => [s.id, s.name]) || []);

                requests.forEach(req => {
                    const shopName = shopMap.get(req.shop_id) || 'Unknown Shop';
                    allActivities.push({
                        id: `req-${req.id}`,
                        type: 'request',
                        action: 'Stock request',
                        detail: shopName,
                        date: req.created_at,
                        status: req.status
                    });
                });
            }

            // Get user's shop ID
            const { data: userData } = await supabase
                .from('users')
                .select('shop_id')
                .eq('id', user.id)
                .single();

            const shopId = userData?.shop_id;

            if (shopId) {
                // Get transfers
                const { data: transfers } = await supabase
                    .from('stock_movements')
                    .select('id, created_at, quantity, items(name)')
                    .eq('from_outlet_id', shopId)
                    .eq('movement_type', 'transfer_to_rep')
                    .order('created_at', { ascending: false });

                if (transfers) {
                    transfers.forEach(transfer => {
                        const itemName = Array.isArray(transfer.items) ? (transfer.items[0]?.name || 'Item') : ((transfer.items as any)?.name || 'Item');
                        allActivities.push({
                            id: `transfer-${transfer.id}`,
                            type: 'transfer',
                            action: 'Transferred stock',
                            detail: `${itemName} (${transfer.quantity} units)`,
                            date: transfer.created_at
                        });
                    });
                }

                // Get returns
                const { data: returns } = await supabase
                    .from('stock_movements')
                    .select('id, created_at, quantity, items(name)')
                    .eq('from_outlet_id', shopId)
                    .eq('movement_type', 'return_to_rep')
                    .order('created_at', { ascending: false });

                if (returns) {
                    returns.forEach(ret => {
                        const itemName = Array.isArray(ret.items) ? (ret.items[0]?.name || 'Item') : ((ret.items as any)?.name || 'Item');
                        allActivities.push({
                            id: `return-${ret.id}`,
                            type: 'return',
                            action: 'Returned stock',
                            detail: `${itemName} (${ret.quantity} units)`,
                            date: ret.created_at
                        });
                    });
                }

                // Get sales
                const { data: sales } = await supabase
                    .from('sales')
                    .select('id, created_at, total_amount, customer_name')
                    .eq('shop_id', shopId)
                    .order('created_at', { ascending: false });

                if (sales) {
                    sales.forEach(sale => {
                        allActivities.push({
                            id: `sale-${sale.id}`,
                            type: 'sale',
                            action: 'Sale completed',
                            detail: sale.customer_name || 'Customer',
                            date: sale.created_at,
                            amount: sale.total_amount
                        });
                    });
                }

                // Get income
                const { data: incomes } = await supabase
                    .from('incomes')
                    .select('id, created_at, amount, notes')
                    .eq('shop_id', shopId)
                    .order('created_at', { ascending: false });

                if (incomes) {
                    incomes.forEach(income => {
                        allActivities.push({
                            id: `income-${income.id}`,
                            type: 'income',
                            action: 'Income submitted',
                            detail: income.notes || 'Income record',
                            date: income.created_at,
                            amount: income.amount
                        });
                    });
                }
            }

            // Sort by date
            allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setActivities(allActivities);
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchAllActivities();
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'request': return 'receipt-outline';
            case 'return': return 'return-up-back-outline';
            case 'transfer': return 'paper-plane-outline';
            case 'sale': return 'cart-outline';
            case 'income': return 'cash-outline';
            default: return 'information-circle-outline';
        }
    };

    const getActivityColor = (activity: Activity) => {
        if (activity.type === 'request') {
            if (activity.status === 'pending') return { bg: '#FFFBEB', text: '#F59E0B' };
            if (activity.status === 'approved') return { bg: '#EFF6FF', text: '#2563EB' };
            if (activity.status === 'delivered') return { bg: '#DCFCE7', text: '#16A34A' };
            return { bg: '#FEE2E2', text: '#DC2626' };
        }
        if (activity.type === 'return') return { bg: '#FEE2E2', text: '#EF4444' };
        if (activity.type === 'transfer') return { bg: '#DBEAFE', text: '#0EA5E9' };
        if (activity.type === 'sale') return { bg: '#D1FAE5', text: '#10B981' };
        if (activity.type === 'income') return { bg: '#FEF3C7', text: '#F59E0B' };
        return { bg: '#F1F5F9', text: '#64748B' };
    };

    const renderActivity = ({ item }: { item: Activity }) => {
        const colors = getActivityColor(item);

        return (
            <View style={styles.activityCard}>
                <View style={[styles.iconContainer, { backgroundColor: colors.bg }]}>
                    <Ionicons name={getActivityIcon(item.type) as any} size={22} color={colors.text} />
                </View>
                <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                        <Text style={styles.activityAction}>{item.action}</Text>
                        {item.status && (
                            <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                                <Text style={[styles.statusText, { color: colors.text }]}>
                                    {item.status.toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.activityDetail}>
                        {item.detail}
                        {item.amount ? ` • Rs. ${item.amount.toLocaleString()}` : ''}
                    </Text>
                    <Text style={styles.activityTime}>{formatTimeAgo(item.date)}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Activities</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={activities}
                    renderItem={renderActivity}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="time-outline" size={60} color="#CBD5E1" />
                            <Text style={styles.emptyText}>No activities yet</Text>
                            <Text style={styles.emptySubtext}>Your actions will appear here</Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF'
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A'
    },
    listContent: {
        padding: 20,
        paddingBottom: 40
    },
    activityCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        gap: 14
    },
    iconContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        justifyContent: 'center',
        alignItems: 'center'
    },
    activityContent: {
        flex: 1
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    activityAction: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 8
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    activityDetail: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 2
    },
    activityTime: {
        fontSize: 11,
        color: '#94A3B8'
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 16
    },
    emptySubtext: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 4
    }
});
