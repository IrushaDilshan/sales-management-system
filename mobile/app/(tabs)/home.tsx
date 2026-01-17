import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SalesmanDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [userName, setUserName] = useState('Salesman');
    const [refreshing, setRefreshing] = useState(false);

    // Stats state
    const [stats, setStats] = useState({
        requests: 0,
        income: 0
    });

    const [recentActivities, setRecentActivities] = useState<any[]>([]);

    useEffect(() => {
        fetchUserData();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchUserData(), fetchStats()]);
        setRefreshing(false);
    }, []);

    const fetchUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: userData } = await supabase.from('users').select('name').eq('id', user.id).single();
            setUserName(userData?.name || 'Salesman');
        } catch (error) { console.error(error) }
    };

    const fetchStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log('No user found');
                return;
            }

            console.log('Fetching ALL activities for user:', user.id);
            const activities: any[] = [];

            // 1. Get REQUESTS (Stock requests)
            try {
                console.log('=== FETCHING REQUESTS ===');
                console.log('User ID:', user.id);

                const { data: requests, error: reqError } = await supabase
                    .from('requests')
                    .select('id, created_at, status, shop_id, salesman_id')
                    .eq('salesman_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                console.log('Requests query error:', reqError);
                console.log('Requests found:', requests?.length || 0);
                if (requests && requests.length > 0) {
                    console.log('First request:', requests[0]);
                }

                if (requests && requests.length > 0) {
                    // Fetch shop names separately to avoid foreign key relationship issues
                    const shopIds = [...new Set(requests.map(r => r.shop_id))];
                    const { data: shops } = await supabase
                        .from('shops')
                        .select('id, name')
                        .in('id', shopIds);

                    const shopMap = new Map(shops?.map(s => [s.id, s.name]) || []);
                    console.log('Shop names fetched:', shopMap.size);

                    requests.forEach(req => {
                        const shopName = shopMap.get(req.shop_id) || 'Unknown Shop';
                        activities.push({
                            id: `req-${req.id}`,
                            type: 'request',
                            action: 'Stock request',
                            detail: shopName,
                            date: req.created_at,
                            status: req.status
                        });
                    });
                }
            } catch (err) {
                console.error('Error fetching requests:', err);
            }

            // 2. Get USER's SHOP ID for other queries
            let shopId = null;
            try {
                const { data: userData } = await supabase
                    .from('users')
                    .select('shop_id')
                    .eq('id', user.id)
                    .single();
                shopId = userData?.shop_id;
            } catch (err) {
                console.error('Error fetching user shop:', err);
            }

            if (shopId) {
                // 3. Get TRANSFERS (Stock movements - transfers)
                try {
                    const { data: transfers } = await supabase
                        .from('stock_movements')
                        .select('id, created_at, quantity, product_id, items(name)')
                        .eq('from_outlet_id', shopId)
                        .eq('movement_type', 'transfer_to_rep')
                        .order('created_at', { ascending: false })
                        .limit(10);

                    if (transfers) {
                        transfers.forEach(transfer => {
                            const itemName = Array.isArray(transfer.items) ? (transfer.items[0]?.name || 'Item') : ((transfer.items as any)?.name || 'Item');
                            activities.push({
                                id: `transfer-${transfer.id}`,
                                type: 'transfer',
                                action: 'Transferred stock',
                                detail: `${itemName} (${transfer.quantity} units)`,
                                date: transfer.created_at
                            });
                        });
                    }
                } catch (err) {
                    console.error('Error fetching transfers:', err);
                }

                // 4. Get RETURNS (Stock movements - returns)
                try {
                    const { data: returns } = await supabase
                        .from('stock_movements')
                        .select('id, created_at, quantity, product_id, items(name)')
                        .eq('from_outlet_id', shopId)
                        .eq('movement_type', 'return_to_rep')
                        .order('created_at', { ascending: false })
                        .limit(10);

                    if (returns) {
                        returns.forEach(ret => {
                            const itemName = Array.isArray(ret.items) ? (ret.items[0]?.name || 'Item') : ((ret.items as any)?.name || 'Item');
                            activities.push({
                                id: `return-${ret.id}`,
                                type: 'return',
                                action: 'Returned stock',
                                detail: `${itemName} (${ret.quantity} units)`,
                                date: ret.created_at
                            });
                        });
                    }
                } catch (err) {
                    console.error('Error fetching returns:', err);
                }

                // 5. Get SALES (Sales submissions)
                try {
                    const { data: sales } = await supabase
                        .from('sales')
                        .select('id, created_at, total_amount, customer_name')
                        .eq('shop_id', shopId)
                        .order('created_at', { ascending: false })
                        .limit(10);

                    if (sales) {
                        sales.forEach(sale => {
                            activities.push({
                                id: `sale-${sale.id}`,
                                type: 'sale',
                                action: 'Sale completed',
                                detail: sale.customer_name || `Rs. ${sale.total_amount}`,
                                date: sale.created_at,
                                amount: sale.total_amount
                            });
                        });
                    }
                } catch (err) {
                    console.error('Error fetching sales:', err);
                }

                // 6. Get INCOME (Income submissions)
                try {
                    const { data: incomes } = await supabase
                        .from('incomes')
                        .select('id, created_at, amount, notes')
                        .eq('shop_id', shopId)
                        .order('created_at', { ascending: false })
                        .limit(10);

                    if (incomes) {
                        incomes.forEach(income => {
                            activities.push({
                                id: `income-${income.id}`,
                                type: 'income',
                                action: 'Income submitted',
                                detail: income.notes || `Rs. ${income.amount}`,
                                date: income.created_at,
                                amount: income.amount
                            });
                        });
                    }
                } catch (err) {
                    console.error('Error fetching income:', err);
                }
            }

            // Sort all activities by date (most recent first)
            activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // Take only the most recent 10 for home screen
            const finalActivities = activities.slice(0, 10);
            console.log('Final activities count:', finalActivities.length);
            console.log('Activities:', finalActivities);
            setRecentActivities(finalActivities);

        } catch (error) {
            console.error('Stats fetch error:', error);
        }
    };

    const CircleAction = ({ title, icon, color, onPress, badge }: any) => (
        <TouchableOpacity style={styles.circleActionBtn} onPress={onPress}>
            <View style={styles.circleIconContainer}>
                <Ionicons name={icon} size={28} color="#1E293B" style={{ opacity: 0.8 }} />
                {badge && (
                    <View style={styles.badgeContainer}>
                        <View style={styles.badge} />
                    </View>
                )}
            </View>
            <Text style={styles.circleActionText} numberOfLines={2}>{title}</Text>
        </TouchableOpacity>
    );

    const CircleItem = ({ name, icon, color = "#475569", bg = "#FFF", onPress }: any) => (
        <TouchableOpacity style={styles.circleItemBtn} onPress={onPress}>
            <View style={[styles.circleItemAvatar, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.circleItemText} numberOfLines={1}>{name}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.brandTitle}>NLDB<Text style={{ color: '#1e293b' }}>Sales</Text></Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.greetingStart}>Good Morning!</Text>
                    <Text style={styles.greetingName}>{userName}</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Top Quick Actions Row */}
                <View style={styles.quickActionsRow}>
                    <CircleAction
                        title="New Sale"
                        icon="receipt-outline"
                        onPress={() => router.push('/salesman/submit-sale')}
                        badge
                    />
                    <CircleAction
                        title="Restock"
                        icon="cart-outline"
                        onPress={() => router.push('/shops')}
                    />
                    <CircleAction
                        title="Transfer"
                        icon="paper-plane-outline"
                        onPress={() => router.push('/salesman/transfer')}
                    />
                    <CircleAction
                        title="Returns"
                        icon="refresh-circle-outline"
                        onPress={() => router.push('/salesman/returns')}
                    />
                </View>

                {/* Section 1: Management (Like 'Favorite Transfers') */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>MANAGEMENT</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        <CircleItem
                            name="My Stock"
                            icon="cube-outline"
                            color="#2563EB"
                            onPress={() => router.push('/salesman/inventory')}
                        />
                        <CircleItem
                            name="Income"
                            icon="cash-outline"
                            color="#16A34A"
                            onPress={() => router.push('/shop-owner/submit-income')}
                        />
                        <CircleItem
                            name="Sales Rep"
                            icon="document-text-outline"
                            color="#2563EB"
                            onPress={() => router.push('/salesman/assigned-reps')}
                        />
                        <CircleItem
                            name="Support"
                            icon="headset-outline"
                            color="#EA580C"
                            onPress={() => router.push('/salesman/support')}
                        />
                    </ScrollView>
                </View>

                {/* Section 2: History & Reports (Like 'Pay Bills') */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>HISTORY & REPORTS</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        <CircleItem
                            name="Orders Info"
                            icon="time-outline"
                            onPress={() => router.push('/salesman/request-history')}
                            color="#0F172A"
                        />
                        <CircleItem
                            name="Income Log"
                            icon="bar-chart-outline"
                            onPress={() => router.push('/salesman/income-history')}
                            color="#0F172A"
                        />
                        <CircleItem
                            name="Stock Log"
                            icon="swap-horizontal-outline"
                            onPress={() => router.push('/salesman/stock-history')}
                            color="#0F172A"
                        />
                        <CircleItem
                            name="Analytics"
                            icon="pie-chart-outline"
                            onPress={() => router.push('/salesman/analytics')}
                            color="#64748B"
                        />
                    </ScrollView>
                </View>

                {/* Section 3: Recent Activity (Bottom) */}
                <View style={[styles.sectionContainer, { borderBottomWidth: 0, paddingBottom: 20 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
                        <TouchableOpacity onPress={() => router.push('/salesman/all-activities')}>
                            <Text style={styles.sectionLink}>VIEW ALL</Text>
                        </TouchableOpacity>
                    </View>

                    {recentActivities.length > 0 ? (
                        <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
                            {recentActivities.map((activity, index) => (
                                <View key={activity.id}>
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 14,
                                        gap: 12
                                    }}>
                                        <View style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            backgroundColor:
                                                activity.type === 'request' && activity.status === 'pending' ? '#FFFBEB' :
                                                    activity.type === 'request' && activity.status === 'approved' ? '#EFF6FF' :
                                                        activity.type === 'request' && activity.status === 'delivered' ? '#DCFCE7' :
                                                            activity.type === 'return' ? '#FEE2E2' :
                                                                activity.type === 'transfer' ? '#DBEAFE' :
                                                                    activity.type === 'sale' ? '#D1FAE5' :
                                                                        activity.type === 'income' ? '#FEF3C7' : '#F0F9FF',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}>
                                            <Ionicons
                                                name={
                                                    activity.type === 'request' ? 'receipt-outline' :
                                                        activity.type === 'return' ? 'return-up-back-outline' :
                                                            activity.type === 'transfer' ? 'paper-plane-outline' :
                                                                activity.type === 'sale' ? 'cart-outline' :
                                                                    activity.type === 'income' ? 'cash-outline' :
                                                                        'information-circle-outline'
                                                }
                                                size={20}
                                                color={
                                                    activity.type === 'request' && activity.status === 'pending' ? '#F59E0B' :
                                                        activity.type === 'request' && activity.status === 'approved' ? '#2563EB' :
                                                            activity.type === 'request' && activity.status === 'delivered' ? '#16A34A' :
                                                                activity.type === 'return' ? '#EF4444' :
                                                                    activity.type === 'transfer' ? '#0EA5E9' :
                                                                        activity.type === 'sale' ? '#10B981' :
                                                                            activity.type === 'income' ? '#F59E0B' : '#64748B'
                                                }
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 2 }}>
                                                {activity.action}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: '#64748B' }}>
                                                {activity.detail}
                                                {activity.amount ? ` • Rs. ${activity.amount.toLocaleString()}` : ''}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            {activity.status && (
                                                <View style={{
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    borderRadius: 6,
                                                    backgroundColor:
                                                        activity.status === 'pending' ? '#FFFBEB' :
                                                            activity.status === 'approved' ? '#EFF6FF' :
                                                                activity.status === 'delivered' ? '#DCFCE7' : '#FEF2F2',
                                                    marginBottom: 4
                                                }}>
                                                    <Text style={{
                                                        fontSize: 10,
                                                        fontWeight: '700',
                                                        color:
                                                            activity.status === 'pending' ? '#F59E0B' :
                                                                activity.status === 'approved' ? '#2563EB' :
                                                                    activity.status === 'delivered' ? '#16A34A' : '#DC2626',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {activity.status}
                                                    </Text>
                                                </View>
                                            )}
                                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                                                {(() => {
                                                    const date = new Date(activity.date);
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
                                                })()}
                                            </Text>
                                        </View>
                                    </View>
                                    {index < recentActivities.length - 1 && (
                                        <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 14 }} />
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={{ paddingVertical: 30, alignItems: 'center', backgroundColor: '#fff', borderRadius: 16 }}>
                            <View style={{
                                width: 60,
                                height: 60,
                                borderRadius: 30,
                                backgroundColor: '#F1F5F9',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 12
                            }}>
                                <Ionicons name="time-outline" size={28} color="#94A3B8" />
                            </View>
                            <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '600' }}>No recent activity</Text>
                            <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>Your actions will appear here</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 80 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Clean White
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
        backgroundColor: '#FFFFFF'
    },
    brandTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#F59E0B', // Gold/Dark Yellow color from example
        letterSpacing: -0.5
    },
    greetingStart: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 2
    },
    greetingName: {
        fontSize: 16,
        color: '#0F172A', // Dark Slate
        fontWeight: '700'
    },
    scrollContent: {
        paddingTop: 10
    },
    quickActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 32
    },
    circleActionBtn: {
        alignItems: 'center',
        width: 72,
    },
    circleIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8,
        // Soft Shadow
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    circleActionText: {
        fontSize: 12,
        color: '#334155',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 16
    },
    badgeContainer: {
        position: 'absolute',
        top: 18,
        right: 18,
    },
    badge: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B'
    },
    sectionContainer: {
        backgroundColor: '#F1F5F9', // Light Blue/Grey Background
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginHorizontal: 16,
        paddingVertical: 24,
        paddingHorizontal: 20,
        marginBottom: 20
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#334155',
        letterSpacing: 0.5
    },
    sectionLink: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2563EB', // Link Blue
        letterSpacing: 0.5
    },
    horizontalScroll: {
        marginHorizontal: -8, // Expand scroll area slightly
    },
    circleItemBtn: {
        alignItems: 'center',
        marginHorizontal: 12,
        width: 64
    },
    circleItemAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    circleItemText: {
        fontSize: 11,
        color: '#475569',
        textAlign: 'center',
        fontWeight: '600'
    }
});
