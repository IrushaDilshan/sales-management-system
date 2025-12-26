import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type RequestItem = {
    id: number;
    itemName: string;
    requestedQty: number;
    deliveredQty: number;
    availableStock: number;
};

export default function SingleRequestView() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const requestId = Array.isArray(id) ? id[0] : id;

    const [items, setItems] = useState<RequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [shopName, setShopName] = useState('');
    const [requestDate, setRequestDate] = useState('');

    useEffect(() => {
        fetchRequestDetails();
    }, [requestId]);

    const fetchRequestDetails = async () => {
        setLoading(true);
        try {
            // Check for active session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                console.error('Session error:', sessionError);
                Alert.alert(
                    'Session Expired',
                    'Please log in again to continue.',
                    [{ text: 'OK', onPress: () => router.replace('/login') }]
                );
                return;
            }

            // Fetch request details
            const { data: requestData, error: requestError } = await supabase
                .from('requests')
                .select('id, date, shop_id')
                .eq('id', requestId)
                .maybeSingle();

            if (requestError) {
                console.error('Request fetch error:', requestError);
                throw requestError;
            }

            if (!requestData) {
                Alert.alert('Error', 'Request not found');
                router.back();
                return;
            }

            setRequestDate(requestData.date);

            // Fetch shop details
            const { data: shopData } = await supabase
                .from('shops')
                .select('name')
                .eq('id', requestData.shop_id)
                .maybeSingle();

            setShopName(shopData?.name || 'Unknown Shop');

            // Fetch request items
            const { data: itemsData, error: itemsError } = await supabase
                .from('request_items')
                .select('id, qty, delivered_qty, item_id')
                .eq('request_id', requestId);

            if (itemsError) throw itemsError;

            if (!itemsData || itemsData.length === 0) {
                setItems([]);
                setLoading(false);
                return;
            }

            // Get item details
            const itemIds = itemsData.map(item => item.item_id);
            const { data: productsData, error: productsError } = await supabase
                .from('items')
                .select('id, name')
                .in('id', itemIds);

            if (productsError) throw productsError;

            // Get stock levels
            const { data: stockData } = await supabase
                .from('stock')
                .select('item_id, qty')
                .in('item_id', itemIds);

            // Create stock map
            const stockMap = new Map();
            stockData?.forEach(stock => stockMap.set(stock.item_id, stock.qty));

            // Create product map
            const productMap = new Map();
            productsData?.forEach(product => productMap.set(product.id, product.name));

            // Build items array
            const requestItems: RequestItem[] = itemsData.map(item => ({
                id: item.id,
                itemName: productMap.get(item.item_id) || 'Unknown Item',
                requestedQty: item.qty,
                deliveredQty: item.delivered_qty || 0,
                availableStock: stockMap.get(item.item_id) || 0
            }));

            setItems(requestItems);

        } catch (err: any) {
            console.error('Error fetching request details:', err);
            Alert.alert('Error', err.message || 'Failed to load request details');
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: RequestItem }) => {
        const pendingQty = item.requestedQty - item.deliveredQty;
        const canFulfill = item.availableStock >= pendingQty;

        return (
            <View style={styles.itemCard}>
                <LinearGradient
                    colors={canFulfill ? ['#FFFFFF', '#F0FDF4'] : ['#FFFFFF', '#FEF2F2']}
                    style={styles.itemGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Item Icon */}
                    <View style={styles.itemIconWrapper}>
                        <LinearGradient
                            colors={['#7C3AED', '#EC4899']}
                            style={styles.itemIcon}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="cube" size={18} color="#FFF" />
                        </LinearGradient>
                    </View>

                    {/* Item Details */}
                    <View style={styles.itemDetails}>
                        <Text style={styles.itemName} numberOfLines={1}>
                            {item.itemName}
                        </Text>
                        <View style={styles.itemMeta}>
                            <View style={styles.qtyBadge}>
                                <Ionicons name="cart-outline" size={12} color="#7C3AED" />
                                <Text style={styles.qtyText}>Qty: {item.requestedQty}</Text>
                            </View>
                            <View style={[styles.stockBadge, canFulfill ? styles.stockOk : styles.stockLow]}>
                                <Ionicons
                                    name={canFulfill ? "checkmark-circle" : "alert-circle"}
                                    size={12}
                                    color={canFulfill ? "#10B981" : "#EF4444"}
                                />
                                <Text style={[styles.stockText, canFulfill ? styles.stockTextOk : styles.stockTextLow]}>
                                    Stock: {item.availableStock}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Status Icon */}
                    <View style={styles.itemRight}>
                        {canFulfill ? (
                            <View style={styles.okBadge}>
                                <Ionicons name="checkmark" size={16} color="#10B981" />
                            </View>
                        ) : (
                            <View style={styles.lowBadge}>
                                <Ionicons name="warning" size={16} color="#EF4444" />
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </View>
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <View style={styles.container}>
            {/* Premium Gradient Header */}
            <LinearGradient
                colors={['#7C3AED', '#A78BFA', '#EC4899', '#F472B6']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />

                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerSubtitle}>REQUEST DETAILS</Text>
                        <Text style={styles.headerTitle} numberOfLines={1}>{shopName}</Text>
                    </View>
                    <View style={styles.backButton} />
                </View>

                {/* Date Badge */}
                {requestDate && (
                    <View style={styles.dateBadge}>
                        <Ionicons name="calendar-outline" size={14} color="#FFF" />
                        <Text style={styles.dateText}>{formatDate(requestDate)}</Text>
                    </View>
                )}
            </LinearGradient>

            {/* Content */}
            <View style={styles.content}>
                {loading ? (
                    <View style={styles.loadingState}>
                        <LinearGradient
                            colors={['#7C3AED20', '#EC489920']}
                            style={styles.loadingCircle}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <ActivityIndicator size="large" color="#7C3AED" />
                        </LinearGradient>
                        <Text style={styles.loadingText}>Loading items...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={item => item.id.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <View style={styles.listHeader}>
                                <Text style={styles.listTitle}>Requested Items</Text>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{items.length} items</Text>
                                </View>
                            </View>
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <LinearGradient
                                    colors={['#7C3AED15', '#EC489915']}
                                    style={styles.emptyCircle}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="cube-outline" size={72} color="#7C3AED" />
                                </LinearGradient>
                                <Text style={styles.emptyTitle}>No Items</Text>
                                <Text style={styles.emptyMessage}>
                                    This request has no items
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    header: {
        paddingTop: 50,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 16,
        overflow: 'hidden'
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        top: -50,
        right: -50
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        bottom: -30,
        left: -40
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        zIndex: 1
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 12
    },
    headerSubtitle: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 1.2,
        textTransform: 'uppercase'
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.8,
        textAlign: 'center'
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        zIndex: 1
    },
    dateText: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '700'
    },
    content: {
        flex: 1,
        paddingTop: 20
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 12
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    listTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5
    },
    countBadge: {
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12
    },
    countText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#7C3AED'
    },
    itemCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    itemGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderRadius: 16
    },
    itemIconWrapper: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3
    },
    itemIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    itemDetails: {
        flex: 1,
        gap: 7
    },
    itemName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    qtyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10
    },
    qtyText: {
        fontSize: 12,
        color: '#7C3AED',
        fontWeight: '700'
    },
    stockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10
    },
    stockOk: {
        backgroundColor: '#DCFCE7'
    },
    stockLow: {
        backgroundColor: '#FEE2E2'
    },
    stockText: {
        fontSize: 12,
        fontWeight: '700'
    },
    stockTextOk: {
        color: '#10B981'
    },
    stockTextLow: {
        color: '#EF4444'
    },
    itemRight: {
        justifyContent: 'center'
    },
    okBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center'
    },
    lowBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60
    },
    loadingCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    loadingText: {
        fontSize: 15,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 12
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40
    },
    emptyCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28
    },
    emptyTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 12,
        letterSpacing: -1
    },
    emptyMessage: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '500'
    }
});
