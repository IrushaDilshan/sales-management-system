import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StockItem = {
    id: number;
    name: string;
    qty: number;
};

export default function StockScreen() {
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            let currentUserId = null;
            if (userEmail) {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', userEmail)
                    .single();
                currentUserId = userRecord?.id;
            }

            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('id, name')
                .order('name');

            if (itemsError) throw itemsError;

            const repStockMap = new Map();

            if (currentUserId) {
                const { data: repTransactions, error: stockError } = await supabase
                    .from('stock_transactions')
                    .select('item_id, qty, type')
                    .eq('rep_id', currentUserId);

                if (stockError && stockError.code !== 'PGRST116') throw stockError;

                repTransactions?.forEach((trans: any) => {
                    const currentStock = repStockMap.get(trans.item_id) || 0;
                    if (trans.type === 'OUT') {
                        repStockMap.set(trans.item_id, currentStock + trans.qty);
                    }
                });
            }

            const merged: StockItem[] = (itemsData || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                qty: repStockMap.get(item.id) || 0
            }));

            // Sort to show items with stock first
            merged.sort((a, b) => b.qty - a.qty);

            setItems(merged);

        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: StockItem }) => (
        <View style={styles.card}>
            <View style={styles.iconContainer}>
                <Ionicons name="cube-outline" size={24} color="#3B82F6" />
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.code}>ID: {item.id}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: item.qty > 0 ? '#DCFCE7' : '#FEE2E2' }]}>
                <Text style={[styles.qty, { color: item.qty > 0 ? '#16A34A' : '#EF4444' }]}>
                    {item.qty}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.title}>My Assigned Stock</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={styles.emptyText}>No items found</Text>
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
        padding: 20,
        gap: 12
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 12
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    infoContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2
    },
    code: {
        fontSize: 12,
        color: '#94A3B8'
    },
    badge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 60,
        alignItems: 'center'
    },
    qty: {
        fontWeight: '700',
        fontSize: 16
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 16
    }
});
