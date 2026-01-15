import { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    StatusBar,
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StockHistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'transfer' | 'return'>('all');

    useEffect(() => {
        fetchHistory();
    }, [filter]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                setLoading(false);
                return;
            }

            // Get user's shop
            const { data: userData } = await supabase
                .from('users')
                .select('shop_id, shops(name)')
                .eq('id', user.id)
                .single();

            const myShopId = userData?.shop_id;

            if (!myShopId) {
                setLoading(false);
                return;
            }

            // Build Query
            let query = supabase
                .from('stock_movements')
                .select('*, items(name, unit_of_measure), from_shop:from_outlet_id(name), to_shop:to_outlet_id(name)')
                .or(`from_outlet_id.eq.${myShopId},to_outlet_id.eq.${myShopId}`)
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('movement_type', filter);
            }

            const { data, error } = await query;

            if (error) {
                // Graceful handling for missing table
                if (error.message?.includes('stock_movements') || error.code === '42P01') {
                    console.warn('DB Mismatch: stock_movements table missing');
                    // Alert only once to avoid spamming
                    if (!refreshing) { // Simple check to avoid alert loop during strict mode dev
                        // Alert.alert('Database Update Required', 'The "stock_movements" table is missing. Please run Migration 02.');
                    }
                    setMovements([]);
                } else {
                    console.error('Error fetching movements:', error);
                }
            } else {
                setMovements(data || []);
            }

        } catch (error: any) {
            console.error('Fetch error:', error);
            // Safe fallback
            setMovements([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'transfer': return 'paper-plane';
            case 'return': return 'refresh-circle';
            default: return 'cube';
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'transfer': return '#2563EB'; // Blue
            case 'return': return '#EA580C';   // Orange
            default: return '#64748B';
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isTransfer = item.movement_type === 'transfer';
        const isReturn = item.movement_type === 'return';

        return (
            <View style={[styles.card, { borderLeftColor: getColor(item.movement_type) }]}>
                <View style={[styles.iconBox, { backgroundColor: `${getColor(item.movement_type)}15` }]}>
                    <Ionicons name={getIcon(item.movement_type) as any} size={24} color={getColor(item.movement_type)} />
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.row}>
                        <Text style={styles.itemName}>{item.items?.name || 'Unknown Item'}</Text>
                        <Text style={[styles.qty, { color: getColor(item.movement_type) }]}>
                            {isReturn ? '+' : ''}{item.quantity} {item.items?.unit_of_measure}
                        </Text>
                    </View>

                    <Text style={styles.typeLabel}>
                        {isTransfer ? 'Stock Transfer' : 'Customer Return'}
                    </Text>

                    {item.notes && (
                        <Text style={styles.notes} numberOfLines={1}>"{item.notes}"</Text>
                    )}

                    <View style={styles.footer}>
                        <View style={styles.locationContainer}>
                            {isTransfer && (
                                <>
                                    <Text style={styles.locationText}>{item.from_shop?.name || '...'}</Text>
                                    <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
                                    <Text style={styles.locationText}>{item.to_shop?.name || '...'}</Text>
                                </>
                            )}
                            {isReturn && (
                                <Text style={styles.locationText}>Returned to Inventory</Text>
                            )}
                        </View>
                        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const FilterChip = ({ label, value }: { label: string, value: string }) => (
        <TouchableOpacity
            style={[styles.chip, filter === value && styles.chipActive]}
            onPress={() => setFilter(value as any)}
        >
            <Text style={[styles.chipText, filter === value && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Stock History</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <FilterChip label="All Movements" value="all" />
                    <FilterChip label="Transfers" value="transfer" />
                    <FilterChip label="Returns" value="return" />
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={movements}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="documents-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyText}>No history found</Text>
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
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    filterContainer: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    chipActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB'
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B'
    },
    chipTextActive: {
        color: '#FFFFFF'
    },
    list: {
        padding: 20,
        paddingTop: 0
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderLeftWidth: 4,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    cardContent: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4
    },
    itemName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
        marginRight: 8
    },
    qty: {
        fontSize: 15,
        fontWeight: '800',
    },
    typeLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 4
    },
    notes: {
        fontSize: 12,
        color: '#94A3B8',
        fontStyle: 'italic',
        marginBottom: 8
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    locationText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B'
    },
    date: {
        fontSize: 11,
        color: '#94A3B8'
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        opacity: 0.5
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
        color: '#94A3B8'
    }
});
