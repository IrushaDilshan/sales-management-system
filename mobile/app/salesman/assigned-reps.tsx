import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AssignedRepsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [reps, setReps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [shopName, setShopName] = useState<string>('');

    useEffect(() => {
        fetchReps();
    }, []);

    const fetchReps = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/');
                return;
            }

            // Get current user's shop_id
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('shop_id, shops(name)')
                .eq('id', user.id)
                .single();

            if (userError || !userData?.shop_id) {
                throw new Error('Could not find shop information');
            }

            const shopData: any = userData.shops;
            setShopName(shopData?.name || (Array.isArray(shopData) ? shopData[0]?.name : 'My Shop'));

            // 1. Fetch shop details to find owner and route_id
            const { data: shopDetails } = await supabase
                .from('shops')
                .select('owner_id, route_id, name') // Get route_id!
                .eq('id', userData.shop_id)
                .single();

            setShopName(shopDetails?.name || 'My Shop');

            const potentialRepIds = new Set<string>();

            // Add Owner
            if (shopDetails?.owner_id) potentialRepIds.add(shopDetails.owner_id);

            // 2. Fetch Route details if route_id exists
            if (shopDetails?.route_id) {
                const { data: routeData } = await supabase
                    .from('routes')
                    .select('rep_id')
                    .eq('id', shopDetails.route_id)
                    .single();

                if (routeData?.rep_id) {
                    potentialRepIds.add(routeData.rep_id);
                }
            }

            // Fallback: Check user creation (as before)
            const { data: currentUserFull } = await supabase
                .from('users')
                .select('created_by, parent_id')
                .eq('id', user.id)
                .single();

            if (currentUserFull?.created_by) potentialRepIds.add(currentUserFull.created_by);
            if (currentUserFull?.parent_id) potentialRepIds.add(currentUserFull.parent_id);

            // 3. Fetch these potential reps users
            let foundReps: any[] = [];
            if (potentialRepIds.size > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('*')
                    .in('id', Array.from(potentialRepIds));
                foundReps = users || [];
            }

            // 4. Also fetch anyone with role 'rep', 'agent' explicitly linked in this shop as a fallback
            const { data: roleReps } = await supabase
                .from('users')
                .select('*')
                .eq('shop_id', userData.shop_id)
                .or('role.ilike.%rep%,role.ilike.%agent%,role.ilike.%manager%,role.ilike.%owner%');

            const allCandidates = [...foundReps, ...(roleReps || [])];

            // Deduplicate and Exclude current user
            const finalReps = Array.from(new Map(allCandidates.map(u => [u.id, u])).values())
                .filter(u => u.id !== user.id);

            // Sort: Rep -> Owner -> Others
            finalReps.sort((a: any, b: any) => {
                const getScore = (role: string) => {
                    const r = role?.toLowerCase() || '';
                    if (r.includes('rep') || r.includes('agent')) return 1;
                    if (r.includes('owner')) return 2;
                    return 3;
                };
                return getScore(a.role) - getScore(b.role);
            });

            setReps(finalReps);

        } catch (error) {
            console.error('Error fetching reps:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderRepItem = ({ item }: { item: any }) => {
        // Guess the label based on role or context
        let roleLabel = item.role?.toUpperCase() || 'REPRESENTATIVE';
        if (roleLabel === 'USER') roleLabel = 'SALES REP';

        // If it's a rep role, we highlight them
        const isRep = roleLabel.includes('REP') || roleLabel.includes('AGENT');

        return (
            <View style={[styles.repCard, isRep && styles.repHighlight]}>
                <View style={styles.cardHeaderRow}>
                    <View style={[styles.roleBadge, isRep && styles.roleBadgeRep]}>
                        <Text style={[styles.roleText, isRep && styles.roleTextRep]}>
                            {roleLabel}
                        </Text>
                    </View>
                    <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                    </View>
                </View>

                <View style={[styles.avatarMain, isRep && styles.avatarMainRep]}>
                    <Text style={[styles.avatarMainText, isRep && styles.avatarMainTextRep]}>
                        {item.name?.charAt(0)?.toUpperCase() || 'R'}
                    </Text>
                </View>

                <Text style={styles.repName}>{item.name || 'Unknown Rep'}</Text>
                <Text style={styles.shopLabel}>{shopName}</Text>

                <View style={styles.divider} />

                <View style={styles.cardActions}>
                    {item.phone ? (
                        <TouchableOpacity style={styles.actionBtn}>
                            <Ionicons name="call" size={18} color="#2563EB" />
                            <Text style={styles.actionText}>{item.phone}</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.noContactText}>No contact info</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Assigned Representative</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : reps.length === 0 ? (
                <View style={[styles.emptyContainer, { padding: 40 }]}>
                    <Ionicons name="person-outline" size={64} color="#CBD5E1" />
                    <Text style={styles.emptyText}>No assigned representative found.</Text>
                    <Text style={{ marginTop: 8, fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>
                        (Checked Route & Shop Records)
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={reps}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRepItem}
                    contentContainerStyle={styles.gridContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridContent: {
        padding: 20,
        gap: 20
    },
    repCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center'
    },
    repHighlight: {
        borderColor: '#93C5FD',
        backgroundColor: '#F0F9FF',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16
    },
    roleBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DBEAFE'
    },
    roleBadgeRep: {
        backgroundColor: '#1E40AF',
        borderColor: '#1E40AF',
    },
    roleText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2563EB',
        letterSpacing: 0.5
    },
    roleTextRep: {
        color: '#FFFFFF',
    },
    activeBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DCFCE7'
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22C55E'
    },
    avatarMain: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 16
    },
    avatarMainRep: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    avatarMainText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#64748B'
    },
    avatarMainTextRep: {
        color: '#1E40AF',
    },
    repName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
        textAlign: 'center'
    },
    shopLabel: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
        marginBottom: 20
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 16
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%'
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155'
    },
    noContactText: {
        fontSize: 13,
        color: '#94A3B8',
        fontStyle: 'italic'
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
    }
});
