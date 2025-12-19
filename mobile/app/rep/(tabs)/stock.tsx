import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type StockItem = {
    id: number;
    name: string;
    qty: number;
};

export default function StockScreen() {
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        setLoading(true);
        try {
            // Get current user from users table (not auth ID)
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            // Get the user's ID from the users table
            let currentUserId = null;
            if (userEmail) {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', userEmail)
                    .single();
                currentUserId = userRecord?.id;
            }

            // 1. Fetch Item Definitions
            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('id, name')
                .order('name');

            if (itemsError) throw itemsError;

            // 2. Fetch Rep's Stock from Transactions (issued by storekeeper)
            const repStockMap = new Map();

            // Only fetch if we have a valid user ID
            if (currentUserId) {
                const { data: repTransactions, error: stockError } = await supabase
                    .from('stock_transactions')
                    .select('item_id, qty, type')
                    .eq('rep_id', currentUserId);

                if (stockError && stockError.code !== 'PGRST116') throw stockError;

                // 3. Calculate rep's stock per item
                repTransactions?.forEach((trans: any) => {
                    const currentStock = repStockMap.get(trans.item_id) || 0;
                    if (trans.type === 'OUT') {
                        // Stock issued to rep
                        repStockMap.set(trans.item_id, currentStock + trans.qty);
                    }
                    // Future: handle RETURN if needed
                });
            } else {
                console.warn('No user ID found, stock will show as 0');
            }

            // 4. Merge - only show items with stock
            const merged: StockItem[] = (itemsData || [])
                .map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    qty: repStockMap.get(item.id) || 0
                }))
                .filter(item => item.qty > 0); // Only show items with stock

            setItems(merged);

        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchStock();
    };

    const renderItem = ({ item }: { item: StockItem }) => {
        const stockLevel = item.qty >= 50 ? 'high' : item.qty >= 20 ? 'medium' : 'low';
        const stockColor = stockLevel === 'high' ? '#10B981' : stockLevel === 'medium' ? '#F59E0B' : '#EF4444';
        const bgColor = stockLevel === 'high' ? '#ECFDF5' : stockLevel === 'medium' ? '#FFFBEB' : '#FEF2F2';

        return (
            <View style={[styles.stockCard, { borderLeftWidth: 5, borderLeftColor: stockColor }]}>
                {/* Icon & Name */}
                <View style={styles.itemSection}>
                    <View style={[styles.itemIcon, { backgroundColor: bgColor }]}>
                        <Ionicons name="cube" size={20} color={stockColor} />
                    </View>
                    <View style={styles.itemDetails}>
                        <Text style={styles.itemName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={[styles.stockLevel, { color: stockColor }]}>
                            {stockLevel.toUpperCase()} STOCK
                        </Text>
                    </View>
                </View>

                {/* Quantity */}
                <View style={styles.quantitySection}>
                    <Text style={[styles.quantityNum, { color: stockColor }]}>
                        {item.qty}
                    </Text>
                    <Text style={styles.quantityLabel}>Units</Text>
                </View>

                {/* Status Indicator */}
                <View style={[styles.statusIndicator, { backgroundColor: stockColor }]} />
            </View>
        );
    };

    // Calculate stats
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.qty, 0);
    const highStock = items.filter(i => i.qty >= 50).length;
    const lowStock = items.filter(i => i.qty < 20).length;

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
                        <Text style={styles.headerSubtitle}>My Inventory</Text>
                        <Text style={styles.headerTitle}>Stock</Text>
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
                                colors={['#6366F1', '#8B5CF6']}
                                style={styles.quickStatIconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="list" size={18} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <View style={styles.quickStatInfo}>
                            <Text style={styles.quickStatValue}>{totalItems}</Text>
                            <Text style={styles.quickStatLabel}>Items</Text>
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
                                <Ionicons name="cube" size={18} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <View style={styles.quickStatInfo}>
                            <Text style={styles.quickStatValue}>{totalQuantity}</Text>
                            <Text style={styles.quickStatLabel}>Total</Text>
                        </View>
                    </View>

                    <View style={styles.quickStatCard}>
                        <View style={styles.quickStatIconWrapper}>
                            <LinearGradient
                                colors={lowStock > 0 ? ['#EF4444', '#DC2626'] : ['#10B981', '#059669']}
                                style={styles.quickStatIconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons
                                    name={lowStock > 0 ? 'alert' : 'checkmark-done'}
                                    size={18}
                                    color="#FFF"
                                />
                            </LinearGradient>
                        </View>
                        <View style={styles.quickStatInfo}>
                            <Text style={styles.quickStatValue}>
                                {lowStock > 0 ? lowStock : highStock}
                            </Text>
                            <Text style={styles.quickStatLabel}>
                                {lowStock > 0 ? 'Low' : 'High'}
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Content */}
            <View style={styles.contentSection}>
                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>Inventory Items</Text>
                        <Text style={styles.sectionSubtitle}>
                            {lowStock > 0
                                ? `${lowStock} item${lowStock > 1 ? 's' : ''} running low`
                                : 'All items well stocked'}
                        </Text>
                    </View>
                    {lowStock > 0 && (
                        <View style={styles.alertBadge}>
                            <Ionicons name="alert-circle" size={16} color="#DC2626" />
                        </View>
                    )}
                </View>

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#667EEA" />
                        <Text style={styles.loadingText}>Loading stock...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={item => item.id.toString()}
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
                                    <Ionicons name="cube-outline" size={64} color="#667EEA" />
                                </LinearGradient>
                                <Text style={styles.emptyTitle}>No Stock Yet</Text>
                                <Text style={styles.emptyText}>
                                    Contact the storekeeper to get stock assigned to you
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
    stockCard: {
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
    itemName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        letterSpacing: -0.2,
        marginBottom: 3
    },
    stockLevel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    quantitySection: {
        alignItems: 'center',
        paddingHorizontal: 8
    },
    quantityNum: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    quantityLabel: {
        fontSize: 9,
        color: '#64748B',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginTop: 2
    },
    statusIndicator: {
        width: 8,
        height: 36,
        borderRadius: 4
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
