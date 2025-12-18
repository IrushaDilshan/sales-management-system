import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/theme';

export default function HistoryScreen() {
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

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.row}>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                <View style={[styles.badge, styles[item.type as keyof typeof styles] || styles.badgeDefault]}>
                    <Text style={styles.badgeText}>{item.type}</Text>
                </View>
            </View>
            <View style={styles.details}>
                <Text style={styles.detailText}>Qty: <Text style={styles.bold}>{item.qty}</Text></Text>
                {item.reference && <Text style={styles.detailText}>Ref: {item.reference}</Text>}
            </View>
            {item.remarks && (
                <Text style={styles.remarks}>{item.remarks}</Text>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Transactions for {itemName}</Text>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.light.tint} />
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.emptyText}>No transaction history found.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 15,
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    date: {
        color: '#666',
        fontSize: 14,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    IN: { backgroundColor: '#66bb6a' },
    OUT: { backgroundColor: '#42a5f5' },
    RETURN: { backgroundColor: '#ffa726' },
    badgeDefault: { backgroundColor: '#999' },
    details: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    detailText: {
        marginRight: 15,
        fontSize: 14,
        color: '#333',
    },
    bold: {
        fontWeight: 'bold',
    },
    remarks: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 5,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 30,
        color: '#999',
        fontSize: 16,
    }
});
