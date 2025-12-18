import { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function IncomeHistoryScreen() {
    const router = useRouter();
    const [incomeRecords, setIncomeRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchIncomeHistory();
    }, []);

    const fetchIncomeHistory = async () => {
        try {
            setLoading(true);

            // Get current user
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            let shopId = null;

            if (userEmail) {
                // Get user's shop
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('shop_id')
                    .eq('email', userEmail)
                    .limit(1);

                if (userRecord && userRecord.length > 0) {
                    shopId = userRecord[0].shop_id;
                }
            }

            // Fetch income records
            let query = supabase
                .from('daily_income')
                .select(`
                    *,
                    shops (name)
                `)
                .order('date', { ascending: false });

            if (shopId) {
                query = query.eq('shop_id', shopId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching income history:', error);
            } else {
                setIncomeRecords(data || []);
            }
        } catch (error) {
            console.error('Exception in fetchIncomeHistory:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchIncomeHistory();
    };

    const formatCurrency = (amount: number) => {
        return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading income history...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Income History</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {incomeRecords.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="cash-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No income records found</Text>
                        <Text style={styles.emptySubtext}>
                            Submit your first daily income to see it here
                        </Text>
                    </View>
                ) : (
                    <View style={styles.recordsList}>
                        {incomeRecords.map((record) => (
                            <View key={record.id} style={styles.recordCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.dateContainer}>
                                        <Ionicons name="calendar" size={16} color="#6b7280" />
                                        <Text style={styles.dateText}>
                                            {formatDate(record.date)}
                                        </Text>
                                    </View>
                                    {record.shops && (
                                        <View style={styles.shopBadge}>
                                            <Text style={styles.shopText}>{record.shops.name}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.amountsContainer}>
                                    <View style={styles.amountRow}>
                                        <Text style={styles.amountLabel}>Total Sales</Text>
                                        <Text style={[styles.amountValue, styles.totalAmount]}>
                                            {formatCurrency(record.total_sales)}
                                        </Text>
                                    </View>

                                    <View style={styles.breakdown}>
                                        <View style={styles.breakdownItem}>
                                            <Ionicons name="cash" size={16} color="#2196F3" />
                                            <Text style={styles.breakdownLabel}>Cash</Text>
                                            <Text style={[styles.breakdownValue, { color: '#2196F3' }]}>
                                                {formatCurrency(record.cash_sales)}
                                            </Text>
                                        </View>

                                        <View style={styles.breakdownItem}>
                                            <Ionicons name="card" size={16} color="#FF9800" />
                                            <Text style={styles.breakdownLabel}>Credit</Text>
                                            <Text style={[styles.breakdownValue, { color: '#FF9800' }]}>
                                                {formatCurrency(record.credit_sales)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {record.notes && (
                                    <View style={styles.notesContainer}>
                                        <Ionicons name="document-text-outline" size={14} color="#6b7280" />
                                        <Text style={styles.notesText}>{record.notes}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3
    },
    backBtn: {
        marginRight: 16,
        padding: 8
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1a1a2e'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa'
    },
    loadingText: {
        marginTop: 10,
        color: '#6b7280',
        fontSize: 16
    },
    scrollView: {
        flex: 1
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 60
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 16
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
        textAlign: 'center'
    },
    recordsList: {
        padding: 16,
        gap: 12
    },
    recordCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    dateText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280'
    },
    shopBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12
    },
    shopText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2196F3'
    },
    amountsContainer: {
        gap: 12
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    amountLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a2e'
    },
    amountValue: {
        fontSize: 18,
        fontWeight: '800'
    },
    totalAmount: {
        color: '#4CAF50'
    },
    breakdown: {
        flexDirection: 'row',
        gap: 12
    },
    breakdownItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 10,
        gap: 6
    },
    breakdownLabel: {
        fontSize: 12,
        color: '#6b7280',
        flex: 1
    },
    breakdownValue: {
        fontSize: 13,
        fontWeight: '700'
    },
    notesContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 12,
        padding: 10,
        backgroundColor: '#fffbeb',
        borderRadius: 8,
        gap: 6
    },
    notesText: {
        flex: 1,
        fontSize: 13,
        color: '#6b7280',
        fontStyle: 'italic'
    }
});
