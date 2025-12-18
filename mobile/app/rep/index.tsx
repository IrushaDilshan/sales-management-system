import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type PendingItem = {
    itemId: number;
    itemName: string;
    totalPendingQty: number;
    availableStock?: number;
};

export default function RepDashboard() {
    const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const fetchPendingRequests = async () => {
        setLoading(true);
        try {
            // STEP 1: Fetch all pending REQUESTS first
            // Removed 'shop:shops (name)' because FK might be missing
            const { data: requestsData, error: reqError } = await supabase
                .from('requests')
                .select(`
                    id,
                    status,
                    shop_id
                `)
                .eq('status', 'pending');

            if (reqError) throw reqError;

            if (!requestsData || requestsData.length === 0) {
                setPendingItems([]);
                return;
            }

            // STEP 2: Fetch REQUEST ITEMS for these requests
            const requestIds = requestsData.map((r: any) => r.id);
            const { data: itemsData, error: itemsError } = await supabase
                .from('request_items')
                .select(`
                    id,
                    request_id,
                    qty,
                    delivered_qty,
                    item_id
                `)
                .in('request_id', requestIds);

            if (itemsError) throw itemsError;

            // STEP 2.5: Fetch ITEMS manually
            // Get all unique item_ids from the request items
            const itemIds = Array.from(new Set(itemsData?.map((row: any) => row.item_id)));

            // 2.5a Fetch Items
            const { data: productsData, error: productsError } = await supabase
                .from('items')
                .select('id, name')
                .in('id', itemIds);

            if (productsError) throw productsError;

            // 2.5b Fetch current user (rep) and their assigned stock
            const { data: userData } = await supabase.auth.getUser();
            const authUserId = userData?.user?.id;
            const userEmail = userData?.user?.email;

            // Get the user's ID from the users table (not auth ID)
            let currentUserId = null;
            if (userEmail) {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', userEmail)
                    .single();
                currentUserId = userRecord?.id;
                console.log('Rep User ID from users table:', currentUserId);
            }

            // Validate user ID exists
            if (!currentUserId) {
                console.warn('No user record found for email:', userEmail);
                // Continue with empty stock
                const itemsMap = new Map();
                const repStockMap = new Map();
                productsData?.forEach((p: any) => itemsMap.set(p.id, p.name));

                // STEP 3: Aggregate with zero stock
                const itemsAggregationMap = new Map<number, PendingItem>();
                itemsData?.forEach((row: any) => {
                    const pending = row.qty - (row.delivered_qty || 0);
                    if (pending <= 0) return;
                    const itemId = row.item_id;
                    if (!itemId) return;

                    const itemName = itemsMap.get(itemId) || 'Unknown Item';

                    if (itemsAggregationMap.has(itemId)) {
                        const existing = itemsAggregationMap.get(itemId)!;
                        existing.totalPendingQty += pending;
                    } else {
                        itemsAggregationMap.set(itemId, {
                            itemId: itemId,
                            itemName: itemName,
                            totalPendingQty: pending,
                            availableStock: 0
                        });
                    }
                });

                setPendingItems(Array.from(itemsAggregationMap.values()));
                return;
            }

            // Fetch rep's stock from stock_transactions (what storekeeper issued to them)
            const { data: repTransactions, error: stockError } = await supabase
                .from('stock_transactions')
                .select('item_id, qty, type')
                .eq('rep_id', currentUserId)
                .in('item_id', itemIds);

            if (stockError && stockError.code !== 'PGRST116') throw stockError;

            console.log('Rep Stock Transactions:', repTransactions);

            const itemsMap = new Map();
            const repStockMap = new Map();

            productsData?.forEach((p: any) => itemsMap.set(p.id, p.name));

            // Calculate rep's available stock per item from transactions
            repTransactions?.forEach((trans: any) => {
                const currentStock = repStockMap.get(trans.item_id) || 0;
                if (trans.type === 'OUT') {
                    // Stock issued to this rep
                    repStockMap.set(trans.item_id, currentStock + trans.qty);
                }
                // Future: handle RETURN transactions if needed
            });

            console.log('Calculated Rep Stock Map:', Array.from(repStockMap.entries()));

            // STEP 3: Aggregate in Memory
            const itemsAggregationMap = new Map<number, PendingItem>();

            itemsData?.forEach((row: any) => {
                const pending = row.qty - (row.delivered_qty || 0);
                if (pending <= 0) return; // Skip completed

                const itemId = row.item_id;
                // Safety check if item is null (e.g. item deleted)
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
        }
    };

    // Navigation Buttons
    const navigateToShops = () => router.push('/rep/shops');
    const navigateToStock = () => router.push('/rep/stock');

    const renderItem = ({ item }: { item: PendingItem }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerTitle}>
                    <Text style={styles.itemName}>
                        {item.itemName} <Text style={{ color: '#e65100', fontWeight: 'bold' }}>({item.totalPendingQty})</Text>
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Rep Dashboard</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity onPress={fetchPendingRequests}>
                        <Ionicons name="refresh" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={async () => {
                        await supabase.auth.signOut();
                        router.replace('/login' as any);
                    }}>
                        <Ionicons name="log-out-outline" size={24} color="#007AFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.navContainer}>
                <TouchableOpacity style={styles.navButton} onPress={navigateToShops}>
                    <Ionicons name="storefront-outline" size={24} color="white" />
                    <Text style={styles.navButtonText}>Shop Requests</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.navButton, { backgroundColor: '#FF9800' }]} onPress={navigateToStock}>
                    <Ionicons name="cube-outline" size={24} color="white" />
                    <Text style={styles.navButtonText}>My Stock</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Summary (All Items)</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={pendingItems}
                    keyExtractor={item => item.itemId.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.emptyText}>No pending items.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 50,
        paddingHorizontal: 20
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1a1a2e',
        letterSpacing: -0.5
    },
    navContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
        paddingHorizontal: 20
    },
    navButton: {
        flex: 1,
        backgroundColor: '#2196F3',
        padding: 18,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    navButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: 0.3
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
        color: '#1a1a2e',
        paddingHorizontal: 20,
        letterSpacing: -0.3
    },
    list: {
        paddingBottom: 30,
        paddingHorizontal: 20
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        marginBottom: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white'
    },
    headerTitle: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center'
    },
    itemName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1a1a2e',
        letterSpacing: -0.2
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 12
    },
    totalBadge: {
        fontSize: 15,
        color: '#ff6b35',
        fontWeight: '700'
    },
    stockBadge: {
        fontSize: 15,
        fontWeight: '700'
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 60,
        color: '#9ca3af',
        fontSize: 16,
        fontWeight: '500'
    }
});
