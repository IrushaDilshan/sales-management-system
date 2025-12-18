import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type StockItem = {
    id: number;
    name: string;
    qty: number;
};

export default function StockScreen() {
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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
        }
    };

    const renderItem = ({ item }: { item: StockItem }) => (
        <View style={styles.card}>
            <View style={styles.row}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: item.qty > 0 ? '#E8F5E9' : '#FFEBEE' }]}>
                    <Text style={[styles.qty, { color: item.qty > 0 ? '#2E7D32' : '#C62828' }]}>
                        {item.qty} in Stock
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>My Assigned Stock</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 40 },
    backBtn: { marginRight: 16 },
    title: { fontSize: 24, fontWeight: 'bold' },
    list: { paddingBottom: 20 },
    card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10, elevation: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 16, fontWeight: '600', color: '#333' },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    qty: { fontWeight: 'bold' }
});
