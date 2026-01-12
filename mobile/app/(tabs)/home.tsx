import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SalesmanDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [userName, setUserName] = useState('Salesman');
    const [refreshing, setRefreshing] = useState(false);

    // Stats state (kept for logic, though UI focus is changed)
    const [stats, setStats] = useState({
        requests: 0,
        income: 0
    });

    useEffect(() => {
        fetchUserData();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchUserData(), fetchStats()]);
        setRefreshing(false);
    }, []);

    const fetchUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: userData } = await supabase.from('users').select('name').eq('id', user.id).single();
            setUserName(userData?.name || 'Salesman');
        } catch (error) { console.error(error) }
    };

    const fetchStats = async () => {
        // ... fetching logic (simplified for UI focus)
    };

    const CircleAction = ({ title, icon, color, onPress, badge }: any) => (
        <TouchableOpacity style={styles.circleActionBtn} onPress={onPress}>
            <View style={styles.circleIconContainer}>
                <Ionicons name={icon} size={28} color="#1E293B" style={{ opacity: 0.8 }} />
                {badge && (
                    <View style={styles.badgeContainer}>
                        <View style={styles.badge} />
                    </View>
                )}
            </View>
            <Text style={styles.circleActionText} numberOfLines={2}>{title}</Text>
        </TouchableOpacity>
    );

    const CircleItem = ({ name, icon, color = "#475569", bg = "#FFF", onPress }: any) => (
        <TouchableOpacity style={styles.circleItemBtn} onPress={onPress}>
            <View style={[styles.circleItemAvatar, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.circleItemText} numberOfLines={1}>{name}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.brandTitle}>NLDB<Text style={{ color: '#1e293b' }}>sales</Text></Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.greetingStart}>Good Morning!</Text>
                    <Text style={styles.greetingName}>{userName}</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Top Quick Actions Row */}
                <View style={styles.quickActionsRow}>
                    <CircleAction
                        title="New Sale"
                        icon="receipt-outline"
                        onPress={() => router.push('/salesman/submit-sale')}
                        badge
                    />
                    <CircleAction
                        title="My Stock"
                        icon="cube-outline"
                        onPress={() => router.push('/salesman/inventory')}
                    />
                    <CircleAction
                        title="Transfer"
                        icon="paper-plane-outline"
                        onPress={() => router.push('/salesman/transfer')}
                    />
                    <CircleAction
                        title="Returns"
                        icon="refresh-circle-outline"
                        onPress={() => router.push('/salesman/returns')}
                    />
                </View>

                {/* Section 1: Management (Like 'Favorite Transfers') */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>MANAGEMENT</Text>
                        <TouchableOpacity onPress={() => router.push('/shops')}>
                            <Text style={styles.sectionLink}>VIEW ALL</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        <CircleItem
                            name="Restock"
                            icon="cart-outline"
                            color="#2563EB"
                            onPress={() => router.push('/shops')}
                        />
                        <CircleItem
                            name="Income"
                            icon="cash-outline"
                            color="#16A34A"
                            onPress={() => router.push('/shop-owner/submit-income')}
                        />
                        <CircleItem
                            name="Profile"
                            icon="person-outline"
                            color="#9333EA"
                            onPress={() => router.push('/settings')}
                        />
                        <CircleItem
                            name="Support"
                            icon="headset-outline"
                            color="#EA580C"
                            onPress={() => { }}
                        />
                    </ScrollView>
                </View>

                {/* Section 2: History & Reports (Like 'Pay Bills') */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>HISTORY & REPORTS</Text>
                        <TouchableOpacity>
                            <Text style={styles.sectionLink}>ADD NEW</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        <CircleItem
                            name="Orders Info"
                            icon="time-outline"
                            onPress={() => router.push('/salesman/request-history')}
                            color="#0F172A"
                        />
                        <CircleItem
                            name="Income Log"
                            icon="bar-chart-outline"
                            onPress={() => router.push('/salesman/income-history')}
                            color="#0F172A"
                        />
                        <CircleItem
                            name="Sales Rep"
                            icon="document-text-outline"
                            onPress={() => router.push('/salesman/assigned-reps')}
                            color="#64748B"
                        />
                        <CircleItem
                            name="Analytics"
                            icon="pie-chart-outline"
                            onPress={() => { }}
                            color="#64748B"
                        />
                    </ScrollView>
                </View>

                {/* Section 3: Analysis (Bottom) */}
                <View style={[styles.sectionContainer, { borderBottomWidth: 0, paddingBottom: 20 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>EXPENSES</Text>
                        <TouchableOpacity>
                            <Text style={styles.sectionLink}>ANALYSIS</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#94a3b8' }}>No recent expenses recorded</Text>
                    </View>
                </View>

                <View style={{ height: 80 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Clean White
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
        backgroundColor: '#FFFFFF'
    },
    brandTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#F59E0B', // Gold/Dark Yellow color from example
        letterSpacing: -0.5
    },
    greetingStart: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 2
    },
    greetingName: {
        fontSize: 16,
        color: '#0F172A', // Dark Slate
        fontWeight: '700'
    },
    scrollContent: {
        paddingTop: 10
    },
    quickActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 32
    },
    circleActionBtn: {
        alignItems: 'center',
        width: 72,
    },
    circleIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8,
        // Soft Shadow
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    circleActionText: {
        fontSize: 12,
        color: '#334155',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 16
    },
    badgeContainer: {
        position: 'absolute',
        top: 18,
        right: 18,
    },
    badge: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B'
    },
    sectionContainer: {
        backgroundColor: '#F1F5F9', // Light Blue/Grey Background
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginHorizontal: 16,
        paddingVertical: 24,
        paddingHorizontal: 20,
        marginBottom: 20
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#334155',
        letterSpacing: 0.5
    },
    sectionLink: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2563EB', // Link Blue
        letterSpacing: 0.5
    },
    horizontalScroll: {
        marginHorizontal: -8, // Expand scroll area slightly
    },
    circleItemBtn: {
        alignItems: 'center',
        marginHorizontal: 12,
        width: 64
    },
    circleItemAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    circleItemText: {
        fontSize: 11,
        color: '#475569',
        textAlign: 'center',
        fontWeight: '600'
    }
});
