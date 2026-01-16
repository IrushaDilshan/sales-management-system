
import { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Modal,
    ScrollView,
    StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HistoryItem = {
    id: string | number;
    type: 'request' | 'movement';
    subType?: 'rep_transfer' | 'transfer_to_rep'; // For movements
    date: string;
    status: string;
    shopName?: string;
    items?: any[];
    totalItems?: number;
    notes?: string;
};

export default function RequestHistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                setHistoryItems([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // 1. Get User's Shop ID
            const { data: userData } = await supabase
                .from('users')
                .select('shop_id')
                .eq('id', user.id)
                .single();

            const shopId = userData?.shop_id;

            // 2. Fetch Requests
            const { data: requestsData } = await supabase
                .from('requests')
                .select('*')
                .eq('salesman_id', user.id)
                .order('date', { ascending: false });

            // 3. Fetch Stock Movements (Rep Transfers & Returns)
            let movements: any[] = [];
            if (shopId) {
                const { data: movementsData } = await supabase
                    .from('stock_movements')
                    .select('*')
                    .or(`to_outlet_id.eq.${shopId},from_outlet_id.eq.${shopId}`)
                    .in('movement_type', ['rep_transfer', 'transfer_to_rep'])
                    .order('created_at', { ascending: false });

                if (movementsData) movements = movementsData;
            }

            // 4. Process Requests
            const processedRequests: HistoryItem[] = (requestsData || []).map(req => ({
                id: req.id,
                type: 'request',
                date: req.date || req.created_at,
                status: req.status,
                shopName: 'Stock Request', // Default label
                // For requests, we accept we might need to fetch shop name if it varies, 
                // but usually salesman requests for their ONE shop.
            }));

            // 5. Process & Group Movements
            const groupedMovements: { [key: string]: HistoryItem } = {};

            // We need item names for movements quickly? 
            // Better to fetch them if needed, or store IDs and fetch details on modal.
            // For the list, we just show "X items".

            movements.forEach(mov => {
                // Group by timestamp (to the second) to allow batching
                // Or mostly, they share the exact created_at from the transaction
                const key = `${mov.created_at}_${mov.movement_type}`;

                if (!groupedMovements[key]) {
                    groupedMovements[key] = {
                        id: mov.id, // Use first ID as representative
                        type: 'movement',
                        subType: mov.movement_type,
                        date: mov.created_at,
                        status: 'Completed',
                        totalItems: 0,
                        items: [],
                        notes: mov.notes
                    };
                }

                groupedMovements[key].totalItems = (groupedMovements[key].totalItems || 0) + 1;
                groupedMovements[key].items?.push(mov);
            });

            const processedMovements = Object.values(groupedMovements);

            // 6. Merge & Sort
            const allItems = [...processedRequests, ...processedMovements].sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });

            setHistoryItems(allItems);

        } catch (error: any) {
            console.error(error);
            setHistoryItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    const fetchDetails = async (item: HistoryItem) => {
        setLoadingDetails(true);
        setModalVisible(true);
        setSelectedItem(item);

        try {
            let itemDetails: any[] = [];

            if (item.type === 'request') {
                const { data: requestItems } = await supabase
                    .from('request_items')
                    .select('*')
                    .eq('request_id', item.id);

                // Get Item Definitions
                const itemIds = [...new Set((requestItems || []).map(i => i.item_id))];
                const { data: items } = await supabase.from('items').select('id, name').in('id', itemIds as any);
                const itemMap = new Map(items?.map(i => [i.id, i.name]));

                itemDetails = (requestItems || []).map(ri => ({
                    name: itemMap.get(ri.item_id) || 'Item Unavailable',
                    qty: ri.qty,
                    subtext: 'Requested'
                }));

            } else if (item.type === 'movement') {
                // We already have the movement rows in item.items from the grouping
                const movements = item.items || [];
                const itemIds = [...new Set(movements.map(m => m.product_id))];

                const { data: items } = await supabase.from('items').select('id, name').in('id', itemIds as any);
                const itemMap = new Map(items?.map(i => [i.id, i.name]));

                itemDetails = movements.map(m => ({
                    name: itemMap.get(m.product_id) || 'Item Unavailable',
                    qty: m.quantity,
                    subtext: item.subType === 'rep_transfer' ? 'Received' : 'Returned'
                }));
            }

            setSelectedItem({
                ...item,
                details: itemDetails
            });

        } catch (error) {
            console.error(error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const getStatusColor = (item: HistoryItem) => {
        if (item.type === 'movement') {
            return item.subType === 'rep_transfer'
                ? { bg: '#DCFCE7', text: '#16A34A', label: 'Received' }
                : { bg: '#FEE2E2', text: '#EF4444', label: 'Returned' };
        }

        switch (item.status?.toLowerCase()) {
            case 'pending': return { bg: '#FFFBEB', text: '#F59E0B', label: 'Pending' };
            case 'approved': return { bg: '#EFF6FF', text: '#2563EB', label: 'Approved' };
            case 'delivered': return { bg: '#DCFCE7', text: '#16A34A', label: 'Delivered' };
            case 'rejected': return { bg: '#FEF2F2', text: '#DC2626', label: 'Rejected' };
            default: return { bg: '#F1F5F9', text: '#64748B', label: item.status };
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderItem = ({ item }: { item: HistoryItem }) => {
        const style = getStatusColor(item);

        let iconName: any = 'receipt-outline';
        let title = 'Stock Request';
        let color = '#2563EB';

        if (item.type === 'movement') {
            if (item.subType === 'rep_transfer') {
                iconName = 'arrow-down-circle-outline';
                title = 'Received from Rep';
                color = '#16A34A';
            } else {
                iconName = 'return-up-back-outline';
                title = 'Returned to Rep';
                color = '#EF4444';
            }
        }

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => fetchDetails(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardIconRow}>
                        <View style={[styles.iconContainer, { backgroundColor: item.type === 'movement' ? (item.subType === 'rep_transfer' ? '#DCFCE7' : '#FEE2E2') : '#EFF6FF' }]}>
                            <Ionicons name={iconName} size={20} color={color} />
                        </View>
                        <View>
                            <Text style={styles.cardTitle}>{title}</Text>
                            <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
                        <Text style={[styles.statusText, { color: style.text }]}>{style.label}</Text>
                    </View>
                </View>

                {item.notes && (
                    <Text style={styles.notesText} numberOfLines={1}>Note: {item.notes}</Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>History</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={historyItems}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString() + item.type}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="time-outline" size={48} color="#CBD5E1" />
                            </View>
                            <Text style={styles.emptyText}>No history yet</Text>
                        </View>
                    }
                />
            )}

            {/* Details Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Transaction Details</Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close-circle" size={30} color="#CBD5E1" />
                            </TouchableOpacity>
                        </View>

                        {loadingDetails ? (
                            <View style={styles.centered}>
                                <ActivityIndicator size="large" color="#2563EB" />
                            </View>
                        ) : selectedItem ? (
                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                <View style={styles.detailCard}>
                                    <Text style={styles.detailLabel}>TYPE</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedItem.type === 'request' ? 'Stock Request' :
                                            selectedItem.subType === 'rep_transfer' ? 'Received from Rep' : 'Returned to Rep'}
                                    </Text>
                                    <View style={{ height: 12 }} />
                                    <Text style={styles.detailLabel}>DATE</Text>
                                    <Text style={styles.detailValue}>{formatDate(selectedItem.date)}</Text>
                                    {selectedItem.notes && (
                                        <>
                                            <View style={{ height: 12 }} />
                                            <Text style={styles.detailLabel}>NOTES</Text>
                                            <Text style={styles.detailValue}>{selectedItem.notes}</Text>
                                        </>
                                    )}
                                </View>

                                <Text style={styles.sectionTitle}>
                                    Items ({selectedItem.details?.length || 0})
                                </Text>

                                {selectedItem.details?.map((item: any, index: number) => (
                                    <View key={index} style={styles.itemRow}>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <Text style={styles.itemSubtext}>{item.subtext}</Text>
                                        </View>
                                        <View style={styles.qtyBox}>
                                            <Text style={styles.qtyText}>{item.qty}</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>
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
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center'
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 2
    },
    cardDate: {
        fontSize: 12,
        color: '#94A3B8'
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700'
    },
    notesText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 10,
        fontStyle: 'italic'
    },
    listContent: {
        padding: 20,
        paddingBottom: 40
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
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A'
    },
    closeButton: {
        padding: 4
    },
    modalBody: {
        width: '100%'
    },
    detailCard: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24
    },
    detailLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        marginBottom: 4
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A'
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94A3B8',
        marginBottom: 12,
        textTransform: 'uppercase'
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    itemInfo: {
        flex: 1
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 2
    },
    itemSubtext: {
        fontSize: 12,
        color: '#94A3B8'
    },
    qtyBox: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8
    },
    qtyText: {
        color: '#2563EB',
        fontWeight: '700',
        fontSize: 14
    }
});
