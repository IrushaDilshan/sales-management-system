import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StorekeeperDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStock: 0,
        todayIssued: 0,
        todayReturned: 0,
    });

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Items
            const { data: items, error: itemsError } = await supabase
                .from('items')
                .select('*');

            if (itemsError) throw itemsError;

            // 2. Fetch Stock Levels (Source of Truth)
            const { data: stockData, error: stockError } = await supabase
                .from('stock')
                .select('*');

            if (stockError && stockError.code !== 'PGRST116') throw stockError;

            // 3. Fetch Transactions (Only for Today's Stats)
            const today = new Date().toISOString().split('T')[0];
            const { data: transitions, error: transError } = await supabase
                .from('stock_transactions')
                .select('*')
                .gte('created_at', today + 'T00:00:00');

            if (transError) throw transError;

            const todayTrans = transitions || [];

            // Calculate stock logic
            let lowStockCount = 0;
            (items || []).forEach((item: any) => {
                const stockEntry = (stockData || []).find((s: any) => s.item_id === item.id);
                const currentQty = stockEntry ? stockEntry.qty : 0;

                if (currentQty < (item.minimum_level || 5)) {
                    lowStockCount++;
                }
            });

            const todayIssued = todayTrans.filter((t: any) => t.type === 'OUT').reduce((sum: number, t: any) => sum + (t.qty || 0), 0);
            const todayReturned = todayTrans.filter((t: any) => t.type === 'RETURN').reduce((sum: number, t: any) => sum + (t.qty || 0), 0);

            setStats({
                totalItems: (items || []).length,
                lowStock: lowStockCount,
                todayIssued,
                todayReturned
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Overview</Text>
                    <Text style={styles.headerSubtitle}>Real-time inventory stats</Text>
                </View>
                <TouchableOpacity
                    onPress={async () => {
                        await supabase.auth.signOut();
                        router.replace('/login' as any);
                    }}
                    style={{ padding: 8 }}
                >
                    <Text style={{ color: '#007AFF', fontSize: 14 }}>Logout</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.light.tint} />
                </View>
            ) : (
                <View style={styles.statsGrid}>
                    <View style={[styles.card, styles.cardBlue]}>
                        <Text style={styles.cardLabel}>Total Items</Text>
                        <Text style={styles.cardValue}>{stats.totalItems}</Text>
                    </View>
                    <View style={[styles.card, styles.cardRed]}>
                        <Text style={styles.cardLabel}>Low Stock</Text>
                        <Text style={styles.cardValue}>{stats.lowStock}</Text>
                    </View>
                    <View style={[styles.card, styles.cardOrange]}>
                        <Text style={styles.cardLabel}>Issued Today</Text>
                        <Text style={styles.cardValue}>{stats.todayIssued}</Text>
                    </View>
                    <View style={[styles.card, styles.cardGreen]}>
                        <Text style={styles.cardLabel}>Returned Today</Text>
                        <Text style={styles.cardValue}>{stats.todayReturned}</Text>
                    </View>
                </View>
            )}

            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push('/storekeeper/inventory')}
                >
                    <Text style={styles.actionButtonText}>Manage Inventory</Text>
                    <Text style={styles.actionButtonSubtext}>View stock, issue & return items</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 10,
    },
    card: {
        width: '45%',
        margin: '2.5%',
        padding: 20,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    cardBlue: { backgroundColor: '#e3f2fd' }, // Light Blue
    cardRed: { backgroundColor: '#ffebee' },   // Light Red
    cardOrange: { backgroundColor: '#fff3e0' }, // Light Orange
    cardGreen: { backgroundColor: '#e8f5e9' },  // Light Green

    cardLabel: {
        fontSize: 14,
        color: '#555',
        marginBottom: 5,
        fontWeight: '500',
    },
    cardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    actionContainer: {
        padding: 20,
    },
    actionButton: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.tint,
        marginBottom: 5,
    },
    actionButtonSubtext: {
        fontSize: 14,
        color: '#888',
    },
});
