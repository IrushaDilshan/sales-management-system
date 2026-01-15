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

export default function RequestHistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchRequestHistory();
    }, []);

    const fetchRequestHistory = async () => {
        try {
            setLoading(true);
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                setRequests([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const { data: requestsData, error } = await supabase
                .from('requests')
                .select('*')
                .eq('salesman_id', user.id)
                .order('date', { ascending: false });

            if (error) {
                setRequests([]);
            } else {
                if (!requestsData || requestsData.length === 0) {
                    setRequests([]);
                } else {
                    const shopIds = [...new Set(requestsData.map(r => r.shop_id).filter(Boolean))];
                    const shopsMap: Record<string, string> = {};

                    if (shopIds.length > 0) {
                        try {
                            const { data: shops } = await supabase
                                .from('shops')
                                .select('id, name')
                                .in('id', shopIds);

                            if (shops) {
                                shops.forEach(shop => {
                                    shopsMap[shop.id] = shop.name;
                                });
                            }
                        } catch (err) { }
                    }

                    const requestsWithShops = requestsData.map(req => ({
                        ...req,
                        shopName: shopsMap[req.shop_id] || 'Unknown Shop'
                    }));

                    // Double check sort client-side to ensure newest dates are first
                    requestsWithShops.sort((a, b) => {
                        const dateA = new Date(a.date || a.created_at).getTime();
                        const dateB = new Date(b.date || b.created_at).getTime();
                        return dateB - dateA;
                    });

                    setRequests(requestsWithShops);
                }
            }
        } catch (error: any) {
            setRequests([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequestHistory();
    };

    const fetchRequestDetails = async (request: any) => {
        setLoadingDetails(true);
        setModalVisible(true);

        try {
            const { data: requestItems } = await supabase
                .from('request_items')
                .select('*')
                .eq('request_id', request.id);

            const itemIds = [...new Set((requestItems || []).map(i => i.item_id).filter(Boolean))];
            const itemsMap: Record<string, string> = {};

            if (itemIds.length > 0) {
                const { data: items } = await supabase
                    .from('items')
                    .select('id, name')
                    .in('id', itemIds);

                if (items) {
                    items.forEach(item => {
                        itemsMap[item.id] = item.name;
                    });
                }
            }

            const itemsWithDetails = (requestItems || []).map(reqItem => ({
                ...reqItem,
                itemName: itemsMap[reqItem.item_id] || 'Unknown Item'
            }));

            setSelectedRequest({
                ...request,
                items: itemsWithDetails
            });
        } catch (error) {
            setSelectedRequest({ ...request, items: [] });
        } finally {
            setLoadingDetails(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return { bg: '#FFFBEB', text: '#F59E0B' }; // Orange
            case 'approved': return { bg: '#EFF6FF', text: '#2563EB' }; // Blue
            case 'delivered': return { bg: '#DCFCE7', text: '#16A34A' }; // Green
            case 'rejected': return { bg: '#FEF2F2', text: '#DC2626' }; // Red
            default: return { bg: '#F1F5F9', text: '#64748B' }; // Grey
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const renderRequestItem = ({ item }: { item: any }) => {
        const style = getStatusColor(item.status);
        return (
            <TouchableOpacity
                style={styles.requestCard}
                onPress={() => fetchRequestDetails(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.shopInfo}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="storefront" size={18} color="#2563EB" />
                        </View>
                        <Text style={styles.shopName}>{item.shopName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
                        <Text style={[styles.statusText, { color: style.text }]}>{item.status || 'Unknown'}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.dateContainer}>
                        <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                        <Text style={styles.dateText}>{formatDate(item.date || item.created_at)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Requests</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={requests}
                renderItem={renderRequestItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
                        </View>
                        <Text style={styles.emptyText}>No requests yet</Text>
                        <Text style={styles.emptySubtext}>
                            Create a sales request to see it here
                        </Text>
                    </View>
                }
            />

            {/* Request Details Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View />
                            <Text style={styles.modalTitle}>Request Details</Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close-circle" size={30} color="#CBD5E1" />
                            </TouchableOpacity>
                        </View>

                        {loadingDetails ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color="#2563EB" />
                            </View>
                        ) : selectedRequest ? (
                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                {/* Shop Info */}
                                <View style={styles.detailCard}>
                                    <Text style={styles.detailLabel}>SHOP</Text>
                                    <Text style={styles.detailValue}>{selectedRequest.shopName}</Text>
                                </View>

                                {/* Items List */}
                                <Text style={styles.sectionTitle}>Items ({selectedRequest.items.length})</Text>

                                {selectedRequest.items.map((item: any, index: number) => (
                                    <View key={index} style={styles.itemRow}>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemName}>{item.itemName}</Text>
                                            <Text style={styles.itemSubtext}>Requested</Text>
                                        </View>
                                        <View style={styles.qtyBox}>
                                            <Text style={styles.qtyText}>{item.qty}</Text>
                                        </View>
                                    </View>
                                ))}

                                <View style={{ height: 40 }} />
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
        textAlign: 'center'
    },
    listContent: {
        padding: 20,
        paddingBottom: 100
    },
    requestCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    shopInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    shopName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B'
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'capitalize'
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
        paddingTop: 12
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    dateText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500'
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 8
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94A3B8'
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: '85%',
        padding: 24,
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
    modalLoading: {
        padding: 40,
        alignItems: 'center'
    },
    modalBody: {
        width: '100%'
    },
    detailCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24
    },
    detailLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        marginBottom: 4
    },
    detailValue: {
        fontSize: 16,
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
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        minWidth: 40,
        alignItems: 'center'
    },
    qtyText: {
        color: '#2563EB',
        fontWeight: '700',
        fontSize: 14
    }
});
