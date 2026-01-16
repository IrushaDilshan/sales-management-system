
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
    const [userName, setUserName] = useState('User');
    const [refreshing, setRefreshing] = useState(false);
    const [pendingRequests, setPendingRequests] = useState(0);
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

            // Fetch Pending Request Count
            const { count, error } = await supabase
                .from('requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            if (!error && count !== null) {
                setPendingRequests(count);
            }

        } catch (error) { console.error(error) } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Clean Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.brandText}>
                        <Text style={{ color: '#F59E0B' }}>NLDB</Text>
                        <Text style={{ color: '#0F172A' }}>sales</Text>
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.greetingText}>Good Morning!</Text>
                    <Text style={styles.userName}>{userName}</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
                        {pendingRequests === 0 ? (
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
                                        <Text style={styles.badgeCountText}>{pendingRequests}</Text>
                                    </View>
                                </View>
                                <Text style={styles.emptyTitle}>New Requests!</Text>
                                <Text style={styles.emptyText}>
                                    You have {pendingRequests} pending shop requests.{'\n'}
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
        backgroundColor: '#FCFCFD'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        marginBottom: 10
    },
    brandText: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    greetingText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500'
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A'
    },
    scrollContent: {
        flexGrow: 1
    },
    bodyContent: {
        paddingHorizontal: 24,
        paddingTop: 10
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 8,
        letterSpacing: -0.5
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

