import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ShopRequest = {
    shopId: number;
    shopName: string;
    requestCount: number;
    latestDate: string;
};

export default function ShopsListScreen() {
    const [shops, setShops] = useState<ShopRequest[]>([]);
    const [filteredShops, setFilteredShops] = useState<ShopRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        fetchShops();
    }, []);

    const fetchShops = async () => {
        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            let currentUserId = null;
            if (userEmail) {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', userEmail)
                    .single();
                currentUserId = userRecord?.id;
            }

            if (!currentUserId) {
                setShops([]);
                setFilteredShops([]);
                return;
            }

            const { data: myRoutes } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', currentUserId);

            const myRouteIds = myRoutes?.map(r => r.id) || [];

            let shopsQuery = supabase
                .from('shops')
                .select('id, name');

            if (myRouteIds.length > 0) {
                shopsQuery = shopsQuery.or(`rep_id.eq.${currentUserId},route_id.in.(${myRouteIds.join(',')})`);
            } else {
                shopsQuery = shopsQuery.eq('rep_id', currentUserId);
            }

            const { data: myShops, error: shopsError } = await shopsQuery;
            if (shopsError) throw shopsError;

            if (!myShops || myShops.length === 0) {
                setShops([]);
                setFilteredShops([]);
                return;
            }

            const myShopIds = myShops.map(s => s.id);

            const { data: requestsData, error: reqError } = await supabase
                .from('requests')
                .select('shop_id, date')
                .eq('status', 'pending')
                .in('shop_id', myShopIds);

            if (reqError) throw reqError;

            if (!requestsData || requestsData.length === 0) {
                setShops([]);
                setFilteredShops([]);
                return;
            }

            const shopsMap = new Map();
            myShops.forEach((s: any) => shopsMap.set(s.id, s.name));
            const shopIdsWithRequests = Array.from(new Set(requestsData.map((r: any) => r.shop_id)));

            const aggregated = shopIdsWithRequests.map(id => {
                const shopRequests = requestsData.filter((r: any) => r.shop_id === id);
                return {
                    shopId: id,
                    shopName: shopsMap.get(id) || 'Unknown Shop',
                    requestCount: shopRequests.length,
                    latestDate: shopRequests[0]?.date
                };
            });

            setShops(aggregated);
            setFilteredShops(aggregated);

        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearch(text);
        if (text) {
            setFilteredShops(shops.filter(s => s.shopName.toLowerCase().includes(text.toLowerCase())));
        } else {
            setFilteredShops(shops);
        }
    };

    const renderItem = ({ item }: { item: ShopRequest }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => router.push(`/rep/request/${item.shopId}`)}
        >
            <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="storefront" size={24} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.shopName} numberOfLines={1}>{item.shopName}</Text>
                    <View style={styles.badgeContainer}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {item.requestCount} {item.requestCount === 1 ? 'Request' : 'Requests'}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
            <View style={styles.chevronBox}>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </View>
        </TouchableOpacity>
    );

    // Stats for Header
    const totalShops = shops.length;
    const totalRequests = shops.reduce((acc, curr) => acc + curr.requestCount, 0);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Premium Hero Header - Flat Salesman Blue */}
            <LinearGradient
                colors={['#2196F3', '#2196F3']}
                style={[styles.heroHeader, { paddingTop: insets.top + 20 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative Circles */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />

                {/* Header Content */}
                <View style={styles.headerContent}>
                    <View style={styles.titleSection}>
                        <View style={styles.labelRow}>
                            <Ionicons name="storefront" size={14} color="rgba(255, 255, 255, 0.9)" />
                            <Text style={styles.headerLabel}>MY ASSIGNED</Text>
                        </View>
                        <Text style={styles.headerTitle}>Shops</Text>
                        <Text style={styles.headerSubtitle}>
                            {totalShops} Shop{totalShops !== 1 ? 's' : ''} • {totalRequests} Request{totalRequests !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.contentContainer}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#94A3B8" style={{ marginRight: 10 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search shops..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={handleSearch}
                    />
                </View>

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#2196F3" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredShops}
                        keyExtractor={item => item.shopId.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.centered}>
                                <Ionicons name="storefront-outline" size={64} color="#E2E8F0" style={{ marginBottom: 16 }} />
                                <Text style={styles.emptyText}>No shops found matching your criteria</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    heroHeader: {
        paddingBottom: 40,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
        zIndex: 10
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        top: -50,
        right: -50
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        bottom: -20,
        left: -30
    },
    headerContent: {
        marginTop: 10,
        zIndex: 1
    },
    titleSection: {
        gap: 4
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
    },
    headerLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase'
    },
    headerTitle: {
        fontSize: 40,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1.5,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '600',
        letterSpacing: 0.3,
        marginTop: 4
    },
    contentContainer: {
        flex: 1,
        marginTop: -25, // Overlap the header slightly
        paddingHorizontal: 20,
        zIndex: 20
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 20,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '500'
    },
    list: {
        paddingBottom: 40,
        gap: 12
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 20,
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F8FAFC'
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 16
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E0F2FE',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#BAE6FD'
    },
    shopName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 6
    },
    badgeContainer: {
        flexDirection: 'row'
    },
    badge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DBEAFE'
    },
    badgeText: {
        color: '#2563EB',
        fontSize: 12,
        fontWeight: '700'
    },
    chevronBox: {
        paddingLeft: 12
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center'
    }
});
