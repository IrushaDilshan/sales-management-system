import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

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
            // Get current user
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            if (!userEmail) {
                setHistoryData([]);
                setLoading(false);
                return;
            }

            // Get user ID from users table
            const { data: userRecord } = await supabase
                .from('users')
                .select('id')
                .eq('email', userEmail)
                .single();

            if (!userRecord) {
                setHistoryData([]);
                setLoading(false);
                return;
            }

            // Fetch all stock transactions for this rep
            const { data: transactions, error } = await supabase
                .from('stock_transactions')
                .select(`
                    id,
                    item_id,
                    qty,
                    type,
                    created_at,
                    items (
                        name
                    )
                `)
                .eq('rep_id', userRecord.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group by date
            const groupedByDate = new Map<string, any[]>();

            transactions?.forEach((trans: any) => {
                const date = new Date(trans.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                const time = new Date(trans.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                if (!groupedByDate.has(date)) {
                    groupedByDate.set(date, []);
                }

                groupedByDate.get(date)?.push({
                    id: trans.id,
                    name: trans.items?.name || 'Unknown Item',
                    qty: trans.qty,
                    type: trans.type,
                    time: time
                });
            });

            // Convert to array format
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

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    const toggleDate = (date: string) => {
        setExpandedDates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(date)) {
                newSet.delete(date);
            } else {
                newSet.add(date);
            }
            return newSet;
        });
    };

    const renderDateGroup = ({ item }: { item: HistoryItem }) => {
        const isToday = item.date === new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const isExpanded = expandedDates.has(item.date);

        return (
            <View style={styles.dateGroup}>
                {/* Modern Date Header Card */}
                <TouchableOpacity
                    style={styles.dateHeaderWrapper}
                    onPress={() => toggleDate(item.date)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={isToday
                            ? ['#667EEA', '#764BA2']
                            : isExpanded
                                ? ['#F8FAFC', '#F1F5F9']
                                : ['#FFFFFF', '#FFFFFF']
                        }
                        style={[
                            styles.dateHeaderGradient,
                            isExpanded && !isToday && styles.dateHeaderExpandedAlt
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {/* Left Section - Icon & Date */}
                        <View style={styles.dateLeftSection}>
                            <View style={styles.dateIconContainer}>
                                <LinearGradient
                                    colors={isToday
                                        ? ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']
                                        : ['#7C3AED', '#EC4899']}
                                    style={styles.modernDateIcon}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons
                                        name="calendar"
                                        size={18}
                                        color={isToday ? '#FFF' : '#FFF'}
                                    />
                                </LinearGradient>
                            </View>
                            <View style={styles.dateTextContainer}>
                                <Text style={[
                                    styles.modernDateText,
                                    { color: isToday ? '#FFF' : '#1E293B' }
                                ]}>
                                    {item.date.split(',')[0]}
                                </Text>
                                {isToday && (
                                    <View style={styles.todayPill}>
                                        <Text style={styles.todayPillText}>TODAY</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Right Section - Badge & Chevron */}
                        <View style={styles.dateRightSection}>
                            <View style={[
                                styles.modernItemBadge,
                                {
                                    backgroundColor: isToday
                                        ? 'rgba(255,255,255,0.25)'
                                        : 'rgba(124, 58, 237, 0.1)'
                                }
                            ]}>
                                <Text style={[
                                    styles.modernItemCount,
                                    { color: isToday ? '#FFF' : '#7C3AED' }
                                ]}>
                                    {item.items.length}
                                </Text>
                            </View>
                            <Ionicons
                                name={isExpanded ? 'chevron-up-circle' : 'chevron-down-circle'}
                                size={20}
                                color={isToday ? 'rgba(255,255,255,0.9)' : '#94A3B8'}
                            />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Transaction Items - Only shown when expanded */}
                {isExpanded && (
                    <View style={styles.transactionsList}>
                        {item.items.map((transaction, index) => (
                            <View
                                key={transaction.id}
                                style={[
                                    styles.modernTransactionCard,
                                    index === item.items.length - 1 && styles.lastTransactionCard
                                ]}
                            >
                                {/* Transaction Icon with Gradient */}
                                <View style={styles.transactionIconWrapper}>
                                    <LinearGradient
                                        colors={transaction.type === 'OUT'
                                            ? ['#10B981', '#059669']
                                            : ['#EF4444', '#DC2626']
                                        }
                                        style={styles.modernTransactionIcon}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons
                                            name={transaction.type === 'OUT' ? 'arrow-down' : 'arrow-up'}
                                            size={16}
                                            color="#FFF"
                                        />
                                    </LinearGradient>
                                </View>

                                {/* Transaction Details */}
                                <View style={styles.modernTransactionDetails}>
                                    <Text style={styles.modernTransactionName}>
                                        {transaction.name}
                                    </Text>
                                    <View style={styles.modernTransactionMeta}>
                                        <Ionicons name="time-outline" size={12} color="#94A3B8" />
                                        <Text style={styles.modernTransactionTime}>
                                            {transaction.time}
                                        </Text>
                                        <View style={[
                                            styles.statusPill,
                                            { backgroundColor: transaction.type === 'OUT' ? '#ECFDF5' : '#FEF2F2' }
                                        ]}>
                                            <Text style={[
                                                styles.statusPillText,
                                                { color: transaction.type === 'OUT' ? '#059669' : '#DC2626' }
                                            ]}>
                                                {transaction.type === 'OUT' ? 'ISSUED' : 'RETURNED'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Quantity */}
                                <View style={styles.modernQuantitySection}>
                                    <Text style={[
                                        styles.modernQuantityText,
                                        { color: transaction.type === 'OUT' ? '#10B981' : '#EF4444' }
                                    ]}>
                                        {transaction.type === 'OUT' ? '+' : '-'}{transaction.qty}
                                    </Text>
                                    <Text style={styles.modernQuantityLabel}>units</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
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
                {/* Decorative circles */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />

                {/* Header Top Section */}
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerSubtitle}>STOCK ASSIGNMENTS</Text>
                        <Text style={styles.headerTitle}>Inventory History</Text>
                    </View>
                    <View style={styles.backButton} />
                </View>
            </LinearGradient>

            {/* Content Section */}
            <View style={styles.content}>
                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <View style={styles.loadingWrapper}>
                            <LinearGradient
                                colors={['#7C3AED20', '#EC489920']}
                                style={styles.loadingCircle}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <ActivityIndicator size="large" color="#7C3AED" />
                            </LinearGradient>
                            <Text style={styles.loadingText}>Loading your history...</Text>
                        </View>
                    </View>
                ) : (
                    <FlatList
                        data={historyData}
                        keyExtractor={(item) => item.date}
                        renderItem={renderDateGroup}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#7C3AED"
                                colors={['#7C3AED', '#EC4899']}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <LinearGradient
                                    colors={['#7C3AED15', '#EC489915']}
                                    style={styles.emptyIconCircle}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="calendar-outline" size={72} color="#7C3AED" />
                                </LinearGradient>
                                <Text style={styles.emptyTitle}>No History Yet</Text>
                                <Text style={styles.emptyText}>
                                    Your stock assignment history will appear here once you start receiving inventory
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyButton}
                                    onPress={() => router.back()}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['#7C3AED', '#EC4899']}
                                        style={styles.emptyButtonGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="arrow-back" size={18} color="#FFF" />
                                        <Text style={styles.emptyButtonText}>Back to Stock</Text>
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
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    headerRight: {
        width: 44,
        alignItems: 'flex-end'
    },
    historyBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    statsCard: {
        marginTop: 4
    },
    statsGradient: {
        flexDirection: 'row',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4
    },
    statItem: {
        flex: 1,
        alignItems: 'center'
    },
    statValue: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -1,
        marginBottom: 4
    },
    statLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center'
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 12
    },
    content: {
        flex: 1,
        paddingTop: 20
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        gap: 12
    },
    dateGroup: {
        marginBottom: 2
    },
    // Modern Date Header Styles
    dateHeaderWrapper: {
        marginBottom: 12
    },
    dateHeaderGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(148, 163, 184, 0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2
    },
    dateHeaderExpandedAlt: {
        borderColor: 'rgba(124, 58, 237, 0.2)',
        shadowColor: '#7C3AED',
        shadowOpacity: 0.15
    },
    dateLeftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1
    },
    dateIconContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4
    },
    modernDateIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    dateTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1
    },
    modernDateText: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.4
    },
    todayPill: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)'
    },
    todayPillText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.8
    },
    dateRightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    modernItemBadge: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    modernItemCount: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.6
    },
    // Compact Transaction Styles
    transactionsList: {
        gap: 8,
        paddingLeft: 4,
        paddingRight: 4
    },
    modernTransactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2
    },
    lastTransactionCard: {
        marginBottom: 0
    },
    transactionIconWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3
    },
    modernTransactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modernTransactionDetails: {
        flex: 1,
        gap: 5
    },
    modernTransactionName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        letterSpacing: -0.3
    },
    modernTransactionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    modernTransactionTime: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        letterSpacing: -0.2
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginLeft: 4
    },
    statusPillText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.6
    },
    modernQuantitySection: {
        alignItems: 'flex-end'
    },
    modernQuantityText: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.8,
        lineHeight: 22
    },
    modernQuantityLabel: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 1
    },
    // Keep old styles for backward compatibility (will be removed if not needed)
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 4,
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    dateIconWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4
    },
    dateIconGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    dateInfo: {
        flex: 1
    },
    dateHeaderExpanded: {
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
        borderColor: 'rgba(124, 58, 237, 0.25)',
        shadowColor: '#7C3AED',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4
    },
    chevronWrapper: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center'
    },
    dateText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.4
    },
    todayBadge: {
        color: '#7C3AED',
        fontSize: 15,
        fontWeight: '800'
    },
    itemCountBadge: {
        flexDirection: 'column',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        minWidth: 56
    },
    itemCountNumber: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.8,
        lineHeight: 22
    },
    itemCountLabel: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginTop: 2
    },
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginLeft: 4,
        marginRight: 4
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1
    },
    transactionIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    transactionDetails: {
        flex: 1
    },
    transactionName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        letterSpacing: -0.3,
        marginBottom: 5
    },
    transactionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    transactionTime: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600'
    },
    transactionDot: {
        fontSize: 13,
        color: '#CBD5E1'
    },
    transactionType: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4
    },
    transactionRight: {
        alignItems: 'flex-end'
    },
    transactionQty: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.8
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100
    },
    loadingWrapper: {
        alignItems: 'center'
    },
    loadingCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    loadingText: {
        marginTop: 8,
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600',
        letterSpacing: -0.2
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 100,
        paddingHorizontal: 32
    },
    emptyIconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28
    },
    emptyTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1E293B',
        marginBottom: 14,
        letterSpacing: -1
    },
    emptyText: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
        marginBottom: 32
    },
    emptyButton: {
        overflow: 'hidden',
        borderRadius: 16,
        shadowColor: '#667EEA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6
    },
    emptyButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 28,
        paddingVertical: 16
    },
    emptyButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.2
    }
});
