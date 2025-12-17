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

            // 2.5b Fetch Stock levels
            const { data: stockData, error: stockError } = await supabase
                .from('stock')
                .select('item_id, qty')
                .in('item_id', itemIds);

            if (stockError && stockError.code !== 'PGRST116') throw stockError;

            const itemsMap = new Map();
            const stockMap = new Map();

            productsData?.forEach((p: any) => itemsMap.set(p.id, p.name));
            stockData?.forEach((s: any) => stockMap.set(s.item_id, s.qty));

            // STEP 3: Aggregate in Memory
            const itemsAggregationMap = new Map<number, PendingItem>();

            itemsData?.forEach((row: any) => {
                const pending = row.qty - (row.delivered_qty || 0);
                if (pending <= 0) return; // Skip completed

                const itemId = row.item_id;
                // Safety check if item is null (e.g. item deleted)
                if (!itemId) return;

                const itemName = itemsMap.get(itemId) || 'Unknown Item';
                const currentStock = stockMap.get(itemId) || 0;

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
                <TouchableOpacity onPress={fetchPendingRequests}>
                    <Ionicons name="refresh" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.navContainer}>
                <TouchableOpacity style={styles.navButton} onPress={navigateToShops}>
                    <Ionicons name="storefront-outline" size={24} color="white" />
                    <Text style={styles.navButtonText}>Shop Requests</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.navButton, { backgroundColor: '#FF9800' }]} onPress={navigateToStock}>
                    <Ionicons name="cube-outline" size={24} color="white" />
                    <Text style={styles.navButtonText}>Company Stock</Text>
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
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 40 },
    title: { fontSize: 24, fontWeight: 'bold' },
    navContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    navButton: { flex: 1, backgroundColor: '#2196F3', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    navButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#333' },
    list: { paddingBottom: 20 },
    card: { backgroundColor: 'white', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white' },
    headerTitle: { flex: 1 },
    itemName: { fontSize: 18, fontWeight: '600', color: '#333' },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10 },
    totalBadge: { fontSize: 14, color: '#e65100', fontWeight: 'bold' },
    stockBadge: { fontSize: 14, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 16 }
});
