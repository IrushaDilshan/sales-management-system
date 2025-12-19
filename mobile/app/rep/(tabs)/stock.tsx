import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
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

            // 4. Merge
            const merged: StockItem[] = (itemsData || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                qty: repStockMap.get(item.id) || 0
            }));

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
        const hasStock = item.qty > 0;
        const statusColor = hasStock ? '#4CAF50' : '#EF4444';
        const statusIcon = hasStock ? 'checkmark-circle' : 'alert-circle';

        return (
            <View style={styles.card}>
                {/* Left Icon */}
                <View style={[styles.iconWrapper, {
                    backgroundColor: hasStock ? '#E8F5E9' : '#FFEBEE'
                }]}>
                    <Ionicons name="cube" size={20} color={statusColor} />
                </View>

                {/* Item Name */}
                <View style={styles.itemNameContainer}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                </View>

                {/* Quantity */}
                <View style={styles.compactBadge}>
                    <Text style={styles.compactLabel}>Qty</Text>
                    <Text style={[styles.compactValue, { color: statusColor }]}>
                        {item.qty}
                    </Text>
                </View>

                {/* Status Icon */}
                <Ionicons name={statusIcon} size={24} color={statusColor} />
            </View>
        );
    };

    // Calculate stats
    const totalItems = items.length;
    const inStockItems = items.filter(i => i.qty > 0).length;
    const outOfStockItems = items.filter(i => i.qty === 0).length;
    const totalQuantity = items.reduce((sum, item) => sum + item.qty, 0);

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
                    <Ionicons name="cube" size={32} color="#FFF" />
                    <Text style={styles.headerTitle}>My Assigned Stock</Text>
                </View>
            </LinearGradient>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Items</Text>
                    <Text style={[styles.statValue, { color: '#2196F3' }]}>{totalItems}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>In Stock</Text>
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>{inStockItems}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Out of Stock</Text>
                    <Text style={[styles.statValue, { color: '#EF4444' }]}>{outOfStockItems}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Qty</Text>
                    <Text style={[styles.statValue, { color: '#FF9800' }]}>{totalQuantity}</Text>
                </View>
            </View>

            {/* Items List */}
            <View style={styles.listContainer}>
                <Text style={styles.sectionTitle}>Inventory Details</Text>

                {loading && !refreshing ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#2196F3" />
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={item => item.id.toString()}
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
                                <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
                                <Text style={styles.emptyTitle}>No Stock Assigned</Text>
                                <Text style={styles.emptyText}>
                                    Contact storekeeper to get stock assigned to you
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
        alignItems: 'center',
        gap: 16
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.5
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: -30,
        marginBottom: 20,
        gap: 10
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3
    },
    statLabel: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 20
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
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 10,
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
