import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function RepHomeDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [userName, setUserName] = useState('Chanaka'); // Default
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        pendingCount: 0,
        pendingRequestCount: 0
    });
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Name
            const { data: userData } = await supabase.from('users').select('name').eq('id', user.id).single();
            if (userData?.name) setUserName(userData.name);

            // Fetch Pending Request Counts
            const { data: requests, error } = await supabase
                .from('requests')
                .select('id')
                .eq('status', 'pending');

            if (!error && requests) {
                setStats(prev => ({ ...prev, pendingRequestCount: requests.length }));
            }

        } catch (error) { console.error(error) } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Gradient Header */}
            <LinearGradient
                colors={['#8B5CF6', '#EC4899']} // Purple to Pink
                style={[styles.header, { paddingTop: insets.top + 20 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.5 }}
            >
                {/* Decorative Circles */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />

                <View style={styles.headerContent}>
                    {/* NLDB Logo/Badge Area */}
                    <View style={styles.brandingRow}>
                        <Text style={styles.brandTitle}>NLDB<Text style={styles.brandSubtitle}>sales</Text></Text>
                    </View>

                    <View style={styles.greetingRow}>
                        <Ionicons name="home" size={16} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.greetingText}>GOOD MORNING</Text>
                    </View>
                    <Text style={styles.userNameText}>{userName}</Text>
                </View>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
            >
                <View style={styles.bodyContent}>

                    {/* Pending Requests Section Header */}
                    <Text style={styles.sectionTitle}>Pending Requests</Text>

                    <View style={styles.statusRow}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>All items have stock</Text>
                    </View>

                    {/* View Real-Time Button */}
                    <TouchableOpacity
                        onPress={() => router.push('/rep/real-time-requests')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#A855F7', '#EC4899']}
                            style={styles.actionBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="eye" size={20} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.actionBtnText}>View Real-Time</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Central Empty State / Content */}
                    <View style={styles.centerContent}>
                        {stats.pendingRequestCount === 0 ? (
                            <>
                                <View style={styles.emptyCircle}>
                                    <Ionicons name="checkmark" size={48} color="#7C3AED" />
                                </View>
                                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                                <Text style={styles.emptyText}>
                                    No pending requests right now.{'\n'}
                                    You're doing an amazing job! 🎉
                                </Text>
                            </>
                        ) : (
                            <>
                                <View style={[styles.emptyCircle, { backgroundColor: '#FEF2F2' }]}>
                                    <View style={[styles.badgeCount]}>
                                        <Text style={styles.badgeCountText}>{stats.pendingRequestCount}</Text>
                                    </View>
                                </View>
                                <Text style={styles.emptyTitle}>New Requests!</Text>
                                <Text style={styles.emptyText}>
                                    You have {stats.pendingRequestCount} pending shop requests.{'\n'}
                                    Check them out now.
                                </Text>
                            </>
                        )}
                    </View>

                </View>
                {/* Spacer for Tab Bar */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF'
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: 20
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        top: -40,
        right: -60,
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        bottom: -20,
        left: -20,
    },
    headerContent: {
        zIndex: 1
    },
    brandingRow: {
        marginBottom: 20, // push greeting down a bit
        // alignSelf: 'flex-start' // Ensure it's left aligned or adjust as needed
    },
    brandTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FDBA74', // Light Orange (from image tone, adapted for dark bg)
        letterSpacing: -0.5
    },
    brandSubtitle: {
        color: '#FFFFFF', // White for 'sales' on gradient, instead of dark slate
        fontWeight: '800'
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10
    },
    greetingText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1
    },
    userNameText: {
        color: '#FFFFFF',
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    scrollContent: {
        flexGrow: 1
    },
    bodyContent: {
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981'
    },
    statusText: {
        color: '#10B981',
        fontWeight: '600',
        fontSize: 14
    },
    actionBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 40,
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    actionBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15
    },
    centerContent: {
        alignItems: 'center',
        marginTop: 20
    },
    emptyCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3E8FF', // Light purple
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24
    },
    badgeCount: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    badgeCountText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '800'
    },
    emptyTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 16
    },
    emptyText: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500'
    }
});
