import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function StorekeeperDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userName, setUserName] = useState('Storekeeper');
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStock: 0,
        todayIssued: 0,
        todayReturned: 0,
    });

    useEffect(() => {
        fetchUserData();
        fetchData();
    }, []);

    const fetchUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', user.id)
                    .single();
                if (userData) {
                    setUserName(userData.name || 'Storekeeper');
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

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

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
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
                    <View>
                        <Text style={styles.greeting}>Welcome Back</Text>
                        <Text style={styles.title}>{userName}</Text>
                    </View>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                            style={styles.avatar}
                        >
                            <Ionicons name="person" size={32} color="#FFF" />
                        </LinearGradient>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats Cards */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Inventory Overview</Text>

                    {loading && !refreshing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#4CAF50" />
                        </View>
                    ) : (
                        <View style={styles.statsGrid}>
                            {/* Total Items */}
                            <View style={styles.statCard}>
                                <LinearGradient
                                    colors={['#E3F2FD', '#BBDEFB']}
                                    style={styles.statGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.statIconWrapper}>
                                        <Ionicons name="cube" size={28} color="#2196F3" />
                                    </View>
                                    <Text style={styles.statValue}>{stats.totalItems}</Text>
                                    <Text style={styles.statLabel}>Total Items</Text>
                                </LinearGradient>
                            </View>

                            {/* Low Stock */}
                            <View style={styles.statCard}>
                                <LinearGradient
                                    colors={['#FFEBEE', '#FFCDD2']}
                                    style={styles.statGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.statIconWrapper}>
                                        <Ionicons name="alert-circle" size={28} color="#F44336" />
                                    </View>
                                    <Text style={styles.statValue}>{stats.lowStock}</Text>
                                    <Text style={styles.statLabel}>Low Stock</Text>
                                </LinearGradient>
                            </View>

                            {/* Issued Today */}
                            <View style={styles.statCard}>
                                <LinearGradient
                                    colors={['#FFF3E0', '#FFE0B2']}
                                    style={styles.statGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.statIconWrapper}>
                                        <Ionicons name="arrow-up-circle" size={28} color="#FF9800" />
                                    </View>
                                    <Text style={styles.statValue}>{stats.todayIssued}</Text>
                                    <Text style={styles.statLabel}>Issued Today</Text>
                                </LinearGradient>
                            </View>

                            {/* Returned Today */}
                            <View style={styles.statCard}>
                                <LinearGradient
                                    colors={['#E8F5E9', '#C8E6C9']}
                                    style={styles.statGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.statIconWrapper}>
                                        <Ionicons name="arrow-down-circle" size={28} color="#4CAF50" />
                                    </View>
                                    <Text style={styles.statValue}>{stats.todayReturned}</Text>
                                    <Text style={styles.statLabel}>Returned Today</Text>
                                </LinearGradient>
                            </View>
                        </View>
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsSection}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/storekeeper/inventory')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#4CAF50', '#45A049']}
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.actionIconWrapper}>
                                <Ionicons name="cube" size={28} color="white" />
                            </View>
                            <Text style={styles.actionTitle}>Manage Inventory</Text>
                            <Text style={styles.actionSubtitle}>View stock, issue & return items</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Bottom Padding for Nav Bar */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA'
    },
    header: {
        paddingTop: 50,
        paddingBottom: 30,
        paddingHorizontal: 20,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        marginBottom: 4,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase'
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5
    },
    avatarContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    scrollView: {
        flex: 1
    },
    content: {
        padding: 20,
        gap: 24
    },
    statsSection: {
        gap: 16
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A2E',
        letterSpacing: -0.3
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12
    },
    statCard: {
        width: '48%',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5
    },
    statGradient: {
        padding: 20,
        alignItems: 'center',
        gap: 8
    },
    statIconWrapper: {
        marginBottom: 4
    },
    statValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1A1A2E'
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'center'
    },
    actionsSection: {
        gap: 16
    },
    actionCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8
    },
    actionGradient: {
        padding: 24,
        alignItems: 'center',
        gap: 8
    },
    actionIconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    actionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.3
    },
    actionSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        textAlign: 'center'
    }
});
