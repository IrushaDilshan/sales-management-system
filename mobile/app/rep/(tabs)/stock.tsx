import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl, TouchableOpacity, AppState } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

type StockItem = {
    id: number;
    name: string;
    qty: number;
};

export default function StockScreen() {
    const router = useRouter();
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchStock();

        // Auto-refresh when app comes to foreground
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                fetchStock();
            }
        });

        return () => {
            subscription?.remove();
        };
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
                // Calculate start of today (00:00:00) - Daily Stock Reset
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayISO = today.toISOString();

                // Only get TODAY's stock transactions (auto-resets at midnight)
                const { data: repTransactions, error: stockError } = await supabase
                    .from('stock_transactions')
                    .select('item_id, qty, type, created_at')
                    .eq('rep_id', currentUserId)
                    .gte('created_at', todayISO); // Filter: created_at >= today 00:00

                if (stockError && stockError.code !== 'PGRST116') throw stockError;

                // 3. Calculate rep's stock per item (only TODAY's transactions)
                repTransactions?.forEach((trans: any) => {
                    const currentStock = repStockMap.get(trans.item_id) || 0;
                    // Handle types:
                    // OUT = Issued from Store to Rep (+)
                    // RETURN_IN = Returned from Salesman to Rep (+)
                    // TRANSFER_OUT = Transferred from Rep to Shop (-)
                    // RETURN_TO_HQ = Returned from Rep to Storekeeper (-)
                    // SALE = (Legacy?) Stock leaving rep via sale (-)
                    if (trans.type === 'OUT' || trans.type === 'RETURN_IN') {
                        repStockMap.set(trans.item_id, currentStock + trans.qty);
                    } else if (['SALE', 'RETURN', 'TRANSFER_OUT', 'RETURN_TO_HQ'].includes(trans.type)) {
                        repStockMap.set(trans.item_id, currentStock - trans.qty);
                    }
                });
            } else {
                console.warn('No user ID found, stock will show as 0');
            }

            // 4. Merge - only show items with stock
            const merged: StockItem[] = (itemsData || [])
                .map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    qty: repStockMap.get(item.id) || 0
                }))
                .filter(item => item.qty > 0); // Only show items with stock

            setItems(merged);

        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchStock();
    };

    const renderItem = ({ item, index }: { item: StockItem; index: number }) => {
        const stockLevel = item.qty >= 50 ? 'high' : item.qty >= 20 ? 'medium' : 'low';

        // Premium gradient colors based on stock level
        const gradientColors =
            stockLevel === 'high'
                ? ['#10B981', '#059669', '#047857'] as const
                : stockLevel === 'medium'
                    ? ['#F59E0B', '#D97706', '#B45309'] as const
                    : ['#EF4444', '#DC2626', '#B91C1C'] as const;

        return (
            <TouchableOpacity
                activeOpacity={0.95}
                style={[styles.stockCard, { opacity: loading ? 0.5 : 1 }]}
            >
                <LinearGradient
                    colors={[`${gradientColors[0]}08`, `${gradientColors[1]}0A`, `${gradientColors[2]}12`]}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Accent Border */}
                    <View style={[styles.accentBorder, { backgroundColor: gradientColors[0] }]} />

                    {/* Content */}
                    <View style={styles.cardContent}>
                        {/* Left: Icon & Info */}
                        <View style={styles.itemSection}>
                            <LinearGradient
                                colors={gradientColors}
                                style={styles.itemIcon}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="cube" size={20} color="#FFFFFF" />
                            </LinearGradient>

                            <View style={styles.itemDetails}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <View style={styles.stockLevelContainer}>
                                    <View style={[styles.stockDot, { backgroundColor: gradientColors[0] }]} />
                                    <Text style={[styles.stockLevel, { color: gradientColors[1] }]}>
                                        {stockLevel.toUpperCase()} STOCK
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Right: Quantity Badge */}
                        <View style={styles.quantityBadge}>
                            <LinearGradient
                                colors={gradientColors}
                                style={styles.quantityGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.quantityNum}>{item.qty}</Text>
                                <Text style={styles.quantityLabel}>units</Text>
                            </LinearGradient>
                        </View>
                    </View>

                    {/* Shimmer Effect Overlay */}
                    <View style={styles.shimmerOverlay} />
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    // Calculate stats
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.qty, 0);
    const highStock = items.filter(i => i.qty >= 50).length;
    const lowStock = items.filter(i => i.qty < 20).length;

    return (
        <View style={styles.container}>
            {/* Premium Hero Header - Flat Salesman Blue */}
            <LinearGradient
                colors={['#2196F3', '#2196F3']}
                style={styles.heroHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative Circles */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />

                <View style={styles.headerContent}>
                    <View style={styles.titleSection}>
                        <View style={styles.subtitleRow}>
                            <Ionicons name="cube" size={16} color="rgba(255, 255, 255, 0.9)" />
                            <Text style={styles.headerSubtitle}>My Inventory</Text>
                        </View>
                        <Text style={styles.headerTitle}>Stock</Text>
                        {totalItems > 0 && (
                            <Text style={styles.itemCount}>
                                {totalItems} {totalItems === 1 ? 'Item' : 'Items'} • {totalQuantity} Total Units
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.historyButton}
                        onPress={() => router.push('/rep/inventory-history')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.historyButtonInner}>
                            <Ionicons name="time-outline" size={18} color="#FFF" />
                            <Text style={styles.historyButtonText}>History</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Actions Row */}
                <View style={[styles.actionRow, { justifyContent: 'center', gap: 40 }]}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { flex: 0, padding: 0, backgroundColor: 'transparent', borderWidth: 0, flexDirection: 'column' }]}
                        onPress={() => router.push('/rep/transfer-shops' as any)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIcon, {
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            backgroundColor: '#FFFFFF',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 8,
                            elevation: 6
                        }]}>
                            <Ionicons name="storefront" size={26} color="#0284C7" />
                        </View>
                        <Text style={[styles.actionText, { marginTop: 8 }]}>To Shop</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { flex: 0, padding: 0, backgroundColor: 'transparent', borderWidth: 0, flexDirection: 'column' }]}
                        onPress={() => router.push('/rep/return-hq' as any)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIcon, {
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            backgroundColor: '#FFFFFF',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 8,
                            elevation: 6
                        }]}>
                            <Ionicons name="return-up-back" size={26} color="#2196F3" />
                        </View>
                        <Text style={[styles.actionText, { marginTop: 8 }]}>Return HQ</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Content Section */}
            <View style={styles.contentSection}>
                {/* Section Header */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleContainer}>
                        <Text style={styles.sectionTitle}>Your Inventory</Text>
                        <View style={styles.statusRow}>
                            {lowStock > 0 ? (
                                <>
                                    <View style={styles.warningDot} />
                                    <Text style={styles.warningText}>
                                        {lowStock} item{lowStock > 1 ? 's' : ''} running low
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <View style={styles.successDot} />
                                    <Text style={styles.successText}>All items well stocked</Text>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {/* List */}
                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <LinearGradient
                            colors={['#2196F320', '#2196F310']}
                            style={styles.loadingCircle}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <ActivityIndicator size="large" color="#2196F3" />
                        </LinearGradient>
                        <Text style={styles.loadingText}>Loading your stock...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={item => item.id.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#2196F3"
                                colors={['#2196F3', '#2196F3']}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <LinearGradient
                                    colors={['#2196F315', '#2196F305']}
                                    style={styles.emptyIconCircle}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="cube-outline" size={72} color="#2196F3" />
                                </LinearGradient>
                                <Text style={styles.emptyTitle}>No Stock Available</Text>
                                <Text style={styles.emptyText}>
                                    Your inventory is currently empty. Contact the storekeeper to get stock assigned to you.
                                </Text>
                                <TouchableOpacity style={styles.emptyButton} activeOpacity={0.8}>
                                    <LinearGradient
                                        colors={['#2196F3', '#1976D2']}
                                        style={styles.emptyButtonGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
                                        <Text style={styles.emptyButtonText}>Contact Storekeeper</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
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
    heroHeader: {
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        shadowColor: '#2196F3',
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
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        zIndex: 1,
        marginBottom: 20
    },
    titleSection: {
        flex: 1,
        gap: 6
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.95)',
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase'
    },
    headerTitle: {
        fontSize: 40,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1.5,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8
    },
    itemCount: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '600',
        marginTop: 4,
        letterSpacing: 0.3
    },
    historyButton: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    historyButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)'
    },
    historyButtonText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.3
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    actionBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        gap: 10
    },
    actionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14
    },
    contentSection: {
        flex: 1,
        paddingTop: 28,
        paddingHorizontal: 20
    },
    sectionHeader: {
        marginBottom: 20
    },
    sectionTitleContainer: {
        gap: 8
    },
    sectionTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.8
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    warningDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B'
    },
    warningText: {
        fontSize: 14,
        color: '#D97706',
        fontWeight: '600'
    },
    successDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981'
    },
    successText: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '600'
    },
    listContent: {
        paddingBottom: 120,
        gap: 8
    },
    stockCard: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2
    },
    cardGradient: {
        position: 'relative',
        overflow: 'hidden'
    },
    accentBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 12,
        gap: 12
    },
    shimmerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent'
    },
    itemSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minWidth: 0
    },
    itemIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    itemDetails: {
        flex: 1,
        gap: 4,
        minWidth: 0
    },
    itemName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.2
    },
    stockLevelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    stockDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5
    },
    stockLevel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    quantityBadge: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 2
    },
    quantityGradient: {
        minWidth: 58,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1
    },
    quantityNum: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    quantityLabel: {
        fontSize: 9,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
        gap: 24
    },
    loadingCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600',
        letterSpacing: 0.2
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 100,
        paddingHorizontal: 40,
        gap: 20
    },
    emptyIconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    emptyTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.8
    },
    emptyText: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
        maxWidth: 300
    },
    emptyButton: {
        marginTop: 12,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6
    },
    emptyButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 24
    },
    emptyButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.3
    }
});
