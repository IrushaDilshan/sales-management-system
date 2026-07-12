import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

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
        fetchStats();
    }, []);

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

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="receipt" size={20} color="#2196F3" />
                        </View>
                        <Text style={styles.statValue}>{stats.totalRequests}</Text>
                        <Text style={styles.statLabel}>Total Orders</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="time" size={20} color="#FF9800" />
                        </View>
                        <Text style={styles.statValue}>{stats.pendingRequests}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="wallet" size={20} color="#4CAF50" />
                        </View>
                        <Text style={styles.statValue}>Rs.{stats.totalIncome.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>Total Income</Text>
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
                    {/* New Customer Sale */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/salesman/submit-sale')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#FF4081', '#F50057']}
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.actionIconWrapper}>
                                <Ionicons name="pricetag" size={28} color="white" />
                            </View>
                            <Text style={styles.actionTitle}>New Sale</Text>
                            <Text style={styles.actionSubtitle}>Sell items</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Request Stock */}
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
                                <Ionicons name="cube" size={28} color="white" />
                            </View>
                            <Text style={styles.actionTitle}>Restock</Text>
                            <Text style={styles.actionSubtitle}>Request stock</Text>
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

                    {/* Settings */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/settings')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#607D8B', '#546E7A']}
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.actionIconWrapper}>
                                <Ionicons name="settings" size={28} color="white" />
                            </View>
                            <Text style={styles.actionTitle}>Settings</Text>
                            <Text style={styles.actionSubtitle}>Account & profile</Text>
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
        flexDirection: 'row',
        gap: 10,
        marginTop: 4
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1a1a2e',
        marginBottom: 2
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
        textAlign: 'center'
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
        justifyContent: 'space-between'
    },
    actionCard: {
        width: '48.5%',
        marginBottom: 14,
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
