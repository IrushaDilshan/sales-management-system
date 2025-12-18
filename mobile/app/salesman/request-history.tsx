import { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function RequestHistoryScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchRequestHistory();
    }, []);

    const fetchRequestHistory = async () => {
        try {
            setLoading(true);

            // Get current user's ID
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            let userId = null;
            if (userEmail) {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', userEmail)
                    .limit(1);

                if (userRecord && userRecord.length > 0) {
                    userId = userRecord[0].id;
                }
            }

            // Fetch all requests for this user
            let query = supabase
                .from('requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data: requestsData, error } = await query;

            if (error) {
                console.error('Error fetching requests:', error);
                setRequests([]);
            } else {
                // Fetch shop names for each request
                const requestsWithShops = await Promise.all(
                    (requestsData || []).map(async (req) => {
                        let shopName = 'Unknown Shop';
                        if (req.shop_id) {
                            const { data: shop } = await supabase
                                .from('shops')
                                .select('name')
                                .eq('id', req.shop_id)
                                .limit(1);

                            if (shop && shop.length > 0) {
                                shopName = shop[0].name;
                            }
                        }

                        return {
                            ...req,
                            shopName
                        };
                    })
                );

                setRequests(requestsWithShops);
            }
        } catch (error) {
            console.error('Exception in fetchRequestHistory:', error);
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
            onPress={() => router.push(`/rep/request/${item.id}` as any)}
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
                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#2196F3" />
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
    }
});
