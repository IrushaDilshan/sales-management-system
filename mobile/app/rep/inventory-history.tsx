import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HistoryItem = {
    date: string;
    items: {
        id: number;
        name: string;
        qty: number;
        type: string;
        time: string;
    }[];
    totalQty: number;
};

export default function InventoryHistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            if (!userEmail) { setHistoryData([]); setLoading(false); return; }

            const { data: userRecord } = await supabase
                .from('users')
                .select('id')
                .eq('email', userEmail)
                .single();

            if (!userRecord) { setHistoryData([]); setLoading(false); return; }

            const { data: transactions, error } = await supabase
                .from('stock_transactions')
                .select(`id, item_id, quantity, type, created_at, items (name)`)
                .eq('rep_id', userRecord.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const groupedByDate = new Map<string, any[]>();
            transactions?.forEach((trans: any) => {
                const date = new Date(trans.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                const time = new Date(trans.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                if (!groupedByDate.has(date)) groupedByDate.set(date, []);
                groupedByDate.get(date)?.push({
                    id: trans.id,
                    name: trans.items?.name || 'Unknown Item',
                    qty: trans.quantity,
                    type: trans.type,
                    time: time
                });
            });

            const historyArray: HistoryItem[] = Array.from(groupedByDate.entries()).map(([date, items]) => ({
                date,
                items,
                totalQty: items.reduce((sum, item) => sum + item.qty, 0)
            }));

            setHistoryData(historyArray);

        } catch (err: any) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const toggleDate = (date: string) => {
        setExpandedDates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(date)) newSet.delete(date);
            else newSet.add(date);
            return newSet;
        });
    };

    const renderDateGroup = ({ item }: { item: HistoryItem }) => {
        const isToday = item.date === new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const isExpanded = expandedDates.has(item.date);

        return (
            <View style={styles.dateGroup}>
                <TouchableOpacity
                    style={[styles.dateHeader, isExpanded && styles.dateHeaderExpanded]}
                    onPress={() => toggleDate(item.date)}
                    activeOpacity={0.8}
                >
                    <View style={styles.dateLeft}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="calendar-outline" size={20} color="#64748B" />
                        </View>
                        <View>
                            <Text style={styles.dateText}>
                                {isToday ? 'Today' : item.date}
                            </Text>
                            {isToday && <Text style={styles.dateSubtext}>{item.date}</Text>}
                        </View>
                    </View>
                    <View style={styles.dateRight}>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{item.items.length}</Text>
                        </View>
                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#94A3B8" />
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.itemsList}>
                        {item.items.map((trans, idx) => (
                            <View key={trans.id} style={[styles.itemCard, idx < item.items.length - 1 && styles.borderBottom]}>
                                <View style={styles.itemIconContainer}>
                                    <View style={[styles.statusDot, { backgroundColor: trans.type === 'OUT' ? '#10B981' : '#EF4444' }]} />
                                    <Ionicons name={trans.type === 'OUT' ? "arrow-down" : "arrow-up"} size={16} color="#64748B" />
                                </View>
                                <View style={styles.itemDetails}>
                                    <Text style={styles.itemName}>{trans.name}</Text>
                                    <Text style={styles.itemTime}>{trans.time} • {trans.type === 'OUT' ? 'Received' : 'Returned'}</Text>
                                </View>
                                <Text style={[styles.itemQty, { color: trans.type === 'OUT' ? '#10B981' : '#EF4444' }]}>
                                    {trans.type === 'OUT' ? '+' : '-'}{trans.qty}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
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
                <Text style={styles.title}>Inventory History</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={historyData}
                    keyExtractor={(item) => item.date}
                    renderItem={renderDateGroup}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={styles.emptyText}>No history records found.</Text>
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
        paddingTop: 0 // Spacing handled by header
    },
    dateGroup: {
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFFFFF'
    },
    dateHeaderExpanded: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    dateLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    dateText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A'
    },
    dateSubtext: {
        fontSize: 12,
        color: '#64748B'
    },
    dateRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    countBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12
    },
    countText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2563EB'
    },
    itemsList: {
        backgroundColor: '#FFFFFF'
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC'
    },
    itemIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
    },
    statusDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FFF'
    },
    itemDetails: {
        flex: 1
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 2
    },
    itemTime: {
        fontSize: 12,
        color: '#64748B'
    },
    itemQty: {
        fontSize: 16,
        fontWeight: '700'
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
