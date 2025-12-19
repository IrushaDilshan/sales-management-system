import { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function RequestHistoryScreen() {
    const router = useRouter();
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

            // Get current user's ID directly from auth (same as when creating requests)
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.error('Auth error:', authError);
                setRequests([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const userId = user.id;
            console.log('Fetching requests for user ID:', userId);

            // Fetch all requests for this user - use created_at for ordering
            const { data: requestsData, error } = await supabase
                .from('requests')
                .select('*')
                .eq('salesman_id', userId)
                .order('created_at', { ascending: false });

            console.log('Fetched requests:', requestsData);
            console.log('Fetch error:', error);

            if (error) {
                console.error('Error fetching requests:', error);
                console.error('Error details:', JSON.stringify(error));
                setRequests([]);
            } else {
                // Handle case when no requests found
                if (!requestsData || requestsData.length === 0) {
                    console.log('No requests found for this user');
                    setRequests([]);
                } else {
                    // Fetch shop names for each request
                    const requestsWithShops = await Promise.all(
                        requestsData.map(async (req) => {
                            let shopName = 'Unknown Shop';
                            if (req.shop_id) {
                                try {
                                    const { data: shop, error: shopError } = await supabase
                                        .from('shops')
                                        .select('name')
                                        .eq('id', req.shop_id)
                                        .single();

                                    if (shopError) {
                                        console.log(`Shop fetch error for request ${req.id}:`, shopError);
                                    } else if (shop && shop.name) {
                                        shopName = shop.name;
                                    }
                                } catch (shopErr) {
                                    console.log(`Exception fetching shop for request ${req.id}:`, shopErr);
                                }
                            }

                            return {
                                ...req,
                                shopName
                            };
                        })
                    );

                    console.log('Requests with shops:', requestsWithShops);
                    setRequests(requestsWithShops);
                }
            }
        } catch (error: any) {
            console.error('Exception in fetchRequestHistory:', error);
            console.error('Error message:', error?.message);
            console.error('Error name:', error?.name);
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
            // Fetch request items
            const { data: requestItems, error: itemsError } = await supabase
                .from('request_items')
                .select('*')
                .eq('request_id', request.id);

            if (itemsError) {
                console.error('Error fetching request items:', itemsError);
                setSelectedRequest({ ...request, items: [] });
                setLoadingDetails(false);
                return;
            }

            // Fetch item details for each request item
            const itemsWithDetails = await Promise.all(
                (requestItems || []).map(async (reqItem) => {
                    const { data: item, error: itemError } = await supabase
                        .from('items')
                        .select('name')
                        .eq('id', reqItem.item_id)
                        .single();

                    return {
                        ...reqItem,
                        itemName: item?.name || 'Unknown Item'
                    };
                })
            );

            setSelectedRequest({
                ...request,
                items: itemsWithDetails
            });
        } catch (error) {
            console.error('Error in fetchRequestDetails:', error);
            setSelectedRequest({ ...request, items: [] });
        } finally {
            setLoadingDetails(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return '#FF9800';
            case 'approved': return '#2196F3';
            case 'delivered': return '#4CAF50';
            case 'rejected': return '#f44336';
            default: return '#6b7280';
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'No date';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';

            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            return 'Invalid date';
        }
    };

    const renderRequestItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.requestCard}
            onPress={() => fetchRequestDetails(item)}
        >
            <View style={styles.requestHeader}>
                <View style={styles.shopInfo}>
                    <Ionicons name="storefront" size={20} color="#2196F3" />
                    <Text style={styles.shopName}>{item.shopName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status || 'Unknown'}</Text>
                </View>
            </View>

            <View style={styles.requestFooter}>
                <View style={styles.dateInfo}>
                    <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                    <Text style={styles.dateText}>{formatDate(item.date || item.created_at)}</Text>
                </View>
                <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>My Requests</Text>
            </View>

            <FlatList
                data={requests}
                renderItem={renderRequestItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={64} color="#ccc" />
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
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Details</Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={28} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {loadingDetails ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color="#2196F3" />
                                <Text style={styles.loadingText}>Loading details...</Text>
                            </View>
                        ) : selectedRequest ? (
                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                {/* Shop Info */}
                                <View style={styles.modalSection}>
                                    <View style={styles.modalSectionHeader}>
                                        <Ionicons name="storefront" size={24} color="#2196F3" />
                                        <Text style={styles.modalSectionTitle}>Shop Information</Text>
                                    </View>
                                    <View style={styles.infoCard}>
                                        <Text style={styles.infoLabel}>Shop Name</Text>
                                        <Text style={styles.infoValue}>{selectedRequest.shopName}</Text>
                                    </View>
                                </View>

                                {/* Status & Date */}
                                <View style={styles.modalSection}>
                                    <View style={styles.modalSectionHeader}>
                                        <Ionicons name="information-circle" size={24} color="#2196F3" />
                                        <Text style={styles.modalSectionTitle}>Status & Date</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoCard}>
                                            <Text style={styles.infoLabel}>Status</Text>
                                            <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedRequest.status) }]}>
                                                <Text style={styles.statusTextLarge}>{selectedRequest.status || 'Unknown'}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.infoCard}>
                                            <Text style={styles.infoLabel}>Date</Text>
                                            <Text style={styles.infoValue}>{formatDate(selectedRequest.date || selectedRequest.created_at)}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Items List */}
                                <View style={styles.modalSection}>
                                    <View style={styles.modalSectionHeader}>
                                        <Ionicons name="cube" size={24} color="#2196F3" />
                                        <Text style={styles.modalSectionTitle}>Ordered Items</Text>
                                    </View>
                                    {selectedRequest.items && selectedRequest.items.length > 0 ? (
                                        selectedRequest.items.map((item: any, index: number) => (
                                            <View key={index} style={styles.itemRow}>
                                                <View style={styles.itemLeft}>
                                                    <View style={styles.itemNumber}>
                                                        <Text style={styles.itemNumberText}>{index + 1}</Text>
                                                    </View>
                                                    <Text style={styles.itemNameModal}>{item.itemName}</Text>
                                                </View>
                                                <View style={styles.itemRight}>
                                                    <View style={styles.quantityBadge}>
                                                        <Text style={styles.quantityLabel}>Requested</Text>
                                                        <Text style={styles.quantityValue}>{item.qty}</Text>
                                                    </View>
                                                    {selectedRequest.status !== 'pending' && (
                                                        <View style={[styles.quantityBadge, { backgroundColor: '#e8f5e9' }]}>
                                                            <Text style={[styles.quantityLabel, { color: '#2e7d32' }]}>Delivered</Text>
                                                            <Text style={[styles.quantityValue, { color: '#2e7d32' }]}>{item.delivered_qty || 0}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.emptyItems}>
                                            <Ionicons name="cube-outline" size={48} color="#ccc" />
                                            <Text style={styles.emptyItemsText}>No items in this request</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Summary */}
                                {selectedRequest.items && selectedRequest.items.length > 0 && (
                                    <View style={styles.summarySection}>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Total Items:</Text>
                                            <Text style={styles.summaryValue}>{selectedRequest.items.length}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Total Quantity:</Text>
                                            <Text style={styles.summaryValue}>
                                                {selectedRequest.items.reduce((sum: number, item: any) => sum + item.qty, 0)}
                                            </Text>
                                        </View>
                                    </View>
                                )}
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
        backgroundColor: '#f5f5f5'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2196F3',
        padding: 20,
        paddingTop: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    backBtn: {
        marginRight: 16,
        padding: 8
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16
    },
    listContent: {
        padding: 20,
        paddingBottom: 40
    },
    requestCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    shopInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1
    },
    shopName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111',
        flex: 1
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'white',
        textTransform: 'capitalize'
    },
    requestFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    dateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    dateText: {
        fontSize: 14,
        color: '#666'
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 40
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#666',
        marginTop: 20,
        textAlign: 'center'
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center'
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 20
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111'
    },
    closeButton: {
        padding: 8
    },
    modalLoading: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalBody: {
        padding: 20
    },
    modalSection: {
        marginBottom: 24
    },
    modalSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12
    },
    modalSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111'
    },
    infoCard: {
        backgroundColor: '#f8f9fa',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8
    },
    infoRow: {
        flexDirection: 'row',
        gap: 12
    },
    infoLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase'
    },
    infoValue: {
        fontSize: 16,
        color: '#111',
        fontWeight: '600'
    },
    statusBadgeLarge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        alignSelf: 'flex-start'
    },
    statusTextLarge: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
        textTransform: 'capitalize'
    },
    itemRow: {
        backgroundColor: '#f8f9fa',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12
    },
    itemNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center'
    },
    itemNumberText: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white'
    },
    itemNameModal: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111',
        flex: 1
    },
    itemRight: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center'
    },
    quantityBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: 'center'
    },
    quantityLabel: {
        fontSize: 10,
        color: '#2196F3',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2
    },
    quantityValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2196F3'
    },
    emptyItems: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyItemsText: {
        fontSize: 16,
        color: '#999',
        marginTop: 12,
        fontWeight: '600'
    },
    summarySection: {
        backgroundColor: '#2196F3',
        padding: 16,
        borderRadius: 12,
        marginTop: 10
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6
    },
    summaryLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)'
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white'
    }
});
