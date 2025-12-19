import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

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

    useEffect(() => {
        fetchShops();
    }, []);

    const fetchShops = async () => {
        setLoading(true);
        try {
            // Get current user ID
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            let currentUserId = null;
            if (userEmail) {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('id, name')
                    .eq('email', userEmail)
                    .single();
                currentUserId = userRecord?.id;
            }

            if (!currentUserId) {
                Alert.alert('Error', 'Could not identify current user');
                setShops([]);
                setFilteredShops([]);
                setLoading(false);
                return;
            }

            // 1. Find all routes where this rep is assigned
            const { data: myRoutes, error: routesError } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', currentUserId);

            if (routesError && routesError.code !== 'PGRST116') throw routesError;

            const myRouteIds = myRoutes?.map(r => r.id) || [];

            // 2. Find all shops assigned to this rep (either directly or through routes)
            let shopsQuery = supabase
                .from('shops')
                .select('id, name');

            // Build the query to find shops where:
            // - rep_id matches current user (direct assignment)
            // - OR route_id is in the rep's assigned routes
            if (myRouteIds.length > 0) {
                // Rep has routes OR direct shop assignments
                shopsQuery = shopsQuery.or(`rep_id.eq.${currentUserId},route_id.in.(${myRouteIds.join(',')})`);
            } else {
                // Rep only has direct shop assignments, no routes
                shopsQuery = shopsQuery.eq('rep_id', currentUserId);
            }

            const { data: shopsData, error: shopsError } = await shopsQuery;

            if (shopsError) throw shopsError;

            if (!shopsData || shopsData.length === 0) {
                setShops([]);
                setFilteredShops([]);
                return;
            }

            const shopIds = shopsData.map(s => s.id);

            // 2. Fetch pending requests for these shops
            const { data: requestsData, error: reqError } = await supabase
                .from('requests')
                .select('id, shop_id, date')
                .eq('status', 'pending')
                .in('shop_id', shopIds);

            if (reqError) throw reqError;

            if (!requestsData || requestsData.length === 0) {
                setShops([]);
                setFilteredShops([]);
                return;
            }

            // 3. Aggregate
            const shopsMap = new Map();
            shopsData?.forEach((s: any) => shopsMap.set(s.id, s.name));

            const aggregated = shopIds.map(id => {
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
            onPress={() => router.push(`/rep/request/${item.shopId}`)}
        >
            <View style={styles.cardHeader}>
                <View style={{
                    backgroundColor: '#fff3e0',
                    padding: 12,
                    borderRadius: 14,
                    marginRight: 14
                }}>
                    <Ionicons name="storefront" size={28} color="#FF9800" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{item.shopName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                        <View style={{
                            backgroundColor: '#dbeafe',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 8
                        }}>
                            <Text style={{
                                color: '#2196F3',
                                fontSize: 13,
                                fontWeight: '700',
                                letterSpacing: 0.2
                            }}>
                                {item.requestCount} {item.requestCount === 1 ? 'Request' : 'Requests'}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#d1d5db" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Shop Requests</Text>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search Shop..."
                    value={search}
                    onChangeText={handleSearch}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredShops}
                    keyExtractor={item => item.shopId.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.emptyText}>No shops with pending requests.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 50,
        paddingHorizontal: 20
    },
    backBtn: {
        marginRight: 16,
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1a1a2e',
        letterSpacing: -0.5
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        marginBottom: 20,
        marginHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        marginLeft: 12,
        color: '#1a1a2e',
        fontWeight: '500'
    },
    list: {
        paddingBottom: 30,
        paddingHorizontal: 20
    },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 18,
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    shopName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e',
        letterSpacing: -0.3,
        marginBottom: 4
    },
    subtitle: {
        color: '#6b7280',
        marginTop: 4,
        fontSize: 14,
        fontWeight: '500'
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 60,
        color: '#9ca3af',
        fontSize: 16,
        fontWeight: '500'
    }
});
