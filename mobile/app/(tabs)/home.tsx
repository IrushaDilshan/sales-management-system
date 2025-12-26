import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

export default function SalesmanDashboard() {
    const router = useRouter();
    const [userName, setUserName] = useState('Salesman');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRequests: 0,
        pendingRequests: 0,
        totalIncome: 0
    });

    useEffect(() => {
        fetchUserData();
    }, []);

    // Refresh stats when tab comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [])
    );

    const fetchUserData = async () => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.error('Auth error:', authError);
                setLoading(false);
                return;
            }

            const { data: userData, error: dbError } = await supabase
                .from('users')
                .select('name')
                .eq('id', user.id);

            // If user exists in database, use their name
            if (userData && userData.length > 0 && userData[0]?.name) {
                setUserName(userData[0].name);
            } else {
                // Fallback: use email username if no database record
                const emailUsername = user.email?.split('@')[0] || 'Salesman';
                const formattedName = emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
                setUserName(formattedName);
                console.log('User not found in database, using email:', user.email);
            }
        } catch (error: any) {
            console.error('Error fetching user data:', error);
            // Set default name on error
            setUserName('Salesman');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user's shop_id
            const { data: userData } = await supabase
                .from('users')
                .select('shop_id')
                .eq('id', user.id)
                .single();

            const shopId = userData?.shop_id;

            // Fetch request counts
            const { data: requests, error: reqError } = await supabase
                .from('requests')
                .select('status')
                .eq('salesman_id', user.id);

            if (reqError) {
                console.error('Error fetching requests:', reqError);
            }

            const totalRequests = requests?.length || 0;
            const pendingRequests = requests?.filter((r: any) => r.status === 'pending').length || 0;

            // Fetch income total - only if user has a shop_id
            let totalIncome = 0;
            if (shopId) {
                const { data: incomes, error: incomeError } = await supabase
                    .from('daily_income')
                    .select('total_sales')
                    .eq('shop_id', shopId);

                if (incomeError) {
                    console.error('Error fetching income:', incomeError);
                } else {
                    totalIncome = incomes?.reduce((sum: any, income: any) => sum + (income.total_sales || 0), 0) || 0;
                }
            }

            setStats({
                totalRequests,
                pendingRequests,
                totalIncome
            });
        } catch (error: any) {
            console.error('Error fetching stats:', error);
            // Keep default stats (all zeros) on error
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/login' as any);
    };

    return (
        <View style={styles.container}>
            {/* Gradient Header */}
            <LinearGradient
                colors={['#2196F3', '#1976D2', '#0D47A1']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.greeting}>Hello There 👋</Text>
                        <Text style={styles.title}>{userName}</Text>
                    </View>
                    <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/settings')}>
                        <Ionicons name="settings-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Premium Stats Cards */}
                <View style={styles.statsContainer}>
                    {/* First Row: Total Orders and Pending */}
                    <View style={styles.statsRow}>
                        {/* Total Orders Card */}
                        <View style={styles.statCard}>
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                style={styles.statCardGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                                    <Ionicons name="receipt-outline" size={24} color="#2196F3" />
                                </View>
                                <Text style={styles.statValue}>{stats.totalRequests}</Text>
                                <Text style={styles.statLabel}>Total Orders</Text>
                            </LinearGradient>
                        </View>

                        {/* Pending Card */}
                        <View style={styles.statCard}>
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                style={styles.statCardGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
                                    <Ionicons name="time-outline" size={24} color="#FF9800" />
                                </View>
                                <Text style={styles.statValue}>{stats.pendingRequests}</Text>
                                <Text style={styles.statLabel}>Pending</Text>
                            </LinearGradient>
                        </View>
                    </View>

                    {/* Second Row: Total Income (Full Width) */}
                    <View style={styles.statCardFull}>
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                            style={styles.statCardGradientFull}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="wallet-outline" size={24} color="#4CAF50" />
                            </View>
                            <View style={styles.incomeTextContainer}>
                                <Text style={styles.statValue}>Rs.{stats.totalIncome.toLocaleString()}</Text>
                                <Text style={styles.statLabel}>Total Income</Text>
                            </View>
                        </LinearGradient>
                    </View>
                </View>
            </LinearGradient>

            {/* Quick Actions */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <View style={styles.actionsGrid}>
                    {/* New Sales Request */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/shops')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#2196F3', '#1E88E5']}
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.actionIconWrapper}>
                                <Ionicons name="cart" size={28} color="white" />
                            </View>
                            <Text style={styles.actionTitle}>New Order</Text>
                            <Text style={styles.actionSubtitle}>Create request</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Submit Daily Income */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/shop-owner/submit-income')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#4CAF50', '#43A047']}
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.actionIconWrapper}>
                                <Ionicons name="cash" size={28} color="white" />
                            </View>
                            <Text style={styles.actionTitle}>Submit Income</Text>
                            <Text style={styles.actionSubtitle}>Daily sales</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* View Income History */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/salesman/income-history')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#9C27B0', '#8E24AA']}
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.actionIconWrapper}>
                                <Ionicons name="bar-chart" size={28} color="white" />
                            </View>
                            <Text style={styles.actionTitle}>Income History</Text>
                            <Text style={styles.actionSubtitle}>View records</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* View Request History */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/salesman/request-history')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#FF9800', '#FB8C00']}
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.actionIconWrapper}>
                                <Ionicons name="receipt" size={28} color="white" />
                            </View>
                            <Text style={styles.actionTitle}>Order History</Text>
                            <Text style={styles.actionSubtitle}>View requests</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
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
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    greeting: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 4,
        fontWeight: '500'
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5
    },
    profileBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    statsContainer: {
        gap: 12,
        marginTop: 4
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12
    },
    statCard: {
        flex: 1,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6
    },
    statCardFull: {
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        marginTop: 12
    },
    statCardGradient: {
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 18
    },
    statCardGradientFull: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 18
    },
    incomeTextContainer: {
        alignItems: 'center'
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1a1a2e',
        marginBottom: 4,
        letterSpacing: -0.5,
        flexShrink: 1,
        textAlign: 'center'
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        lineHeight: 14
    },
    scrollView: {
        flex: 1
    },
    content: {
        padding: 20,
        paddingBottom: 20
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 16,
        letterSpacing: -0.5
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14
    },
    actionCard: {
        width: '48%',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5
    },
    actionGradient: {
        padding: 20,
        minHeight: 140,
        justifyContent: 'space-between'
    },
    actionIconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    actionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: 'white',
        marginBottom: 4,
        letterSpacing: -0.3
    },
    actionSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '500'
    }
});
