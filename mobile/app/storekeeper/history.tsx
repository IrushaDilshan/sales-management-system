import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HistoryScreen() {
    const router = useRouter();
    const { itemId, itemName } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (itemId) fetchHistory();
    }, [itemId]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('stock_transactions')
                .select('*')
                .eq('item_id', itemId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeInfo = (type: string) => {
        switch (type) {
            case 'IN':
                return {
                    icon: 'add-circle',
                    color: ['#4CAF50', '#45A049'],
                    label: 'Stock Added',
                    textColor: '#4CAF50'
                };
            case 'OUT':
                return {
                    icon: 'arrow-up-circle',
                    color: ['#2196F3', '#1976D2'],
                    label: 'Stock Issued',
                    textColor: '#2196F3'
                };
            case 'RETURN':
                return {
                    icon: 'arrow-down-circle',
                    color: ['#FF9800', '#F57C00'],
                    label: 'Stock Returned',
                    textColor: '#FF9800'
                };
            default:
                return {
                    icon: 'cube',
                    color: ['#9E9E9E', '#757575'],
                    label: type,
                    textColor: '#9E9E9E'
                };
        }
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const timeStr = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        return { date: dateStr, time: timeStr };
    };

    const renderItem = ({ item }: { item: any }) => {
        const typeInfo = getTypeInfo(item.type);
        const { date, time } = formatDateTime(item.created_at);

        return (
            <View style={styles.card}>
                {/* Left Border */}
                <LinearGradient
                    colors={typeInfo.color}
                    style={styles.cardBorder}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />

                <View style={styles.cardContent}>
                    {/* Header Row */}
                    <View style={styles.cardHeader}>
                        <View style={styles.iconWrapper}>
                            <LinearGradient
                                colors={typeInfo.color}
                                style={styles.iconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name={typeInfo.icon} size={24} color="#FFF" />
                            </LinearGradient>
                        </View>

                        <View style={styles.headerInfo}>
                            <Text style={styles.typeLabel}>{typeInfo.label}</Text>
                            <View style={styles.dateRow}>
                                <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                                <Text style={styles.dateText}>{date}</Text>
                                <Ionicons name="time-outline" size={14} color="#9CA3AF" style={{ marginLeft: 12 }} />
                                <Text style={styles.timeText}>{time}</Text>
                            </View>
                        </View>

                        <View style={styles.quantityBadge}>
                            <Text style={styles.quantityLabel}>QTY</Text>
                            <Text style={[styles.quantityValue, { color: typeInfo.textColor }]}>
                                {item.type === 'IN' ? '+' : '-'}{item.qty}
                            </Text>
                        </View>
                    </View>

                    {/* Details */}
                    {(item.reference || item.remarks) && (
                        <View style={styles.detailsSection}>
                            {item.reference && (
                                <View style={styles.detailRow}>
                                    <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                                    <Text style={styles.detailLabel}>Reference:</Text>
                                    <Text style={styles.detailValue}>{item.reference}</Text>
                                </View>
                            )}
                            {item.remarks && (
                                <View style={styles.detailRow}>
                                    <Ionicons name="chatbox-outline" size={16} color="#6B7280" />
                                    <Text style={styles.detailLabel}>Remarks:</Text>
                                    <Text style={styles.detailValue}>{item.remarks}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Gradient Header */}
            <LinearGradient
                colors={['#4CAF50', '#45A049', '#388E3C']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerSubtitle}>Transaction History</Text>
                        <Text style={styles.headerTitle}>{itemName}</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Content */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading history...</Text>
                </View>
            ) : history.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="file-tray-outline" size={64} color="#E5E7EB" />
                    <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                    <Text style={styles.emptySubtext}>
                        Transaction history will appear here once you add, issue, or return stock
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 24,
        paddingHorizontal: 20,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerTextContainer: {
        flex: 1
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        marginBottom: 4,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase'
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.5
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600'
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 16,
        marginBottom: 8
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20
    },
    list: {
        padding: 20,
        gap: 12,
        paddingBottom: 40
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3
    },
    cardBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4
    },
    cardContent: {
        padding: 16,
        paddingLeft: 20
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12
    },
    iconWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3
    },
    iconGradient: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerInfo: {
        flex: 1,
        gap: 4
    },
    typeLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A2E',
        letterSpacing: -0.3
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    dateText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500'
    },
    timeText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500'
    },
    quantityBadge: {
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    quantityLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    quantityValue: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 2
    },
    detailsSection: {
        gap: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6'
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8
    },
    detailLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600'
    },
    detailValue: {
        flex: 1,
        fontSize: 13,
        color: '#1A1A2E',
        fontWeight: '500'
    }
});
