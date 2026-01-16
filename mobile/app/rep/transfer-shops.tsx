import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ShopProp = {
    id: string; // Shops table uses UUID? Or Int? Check schema.
    // 02 migration uses BIGSERIAL for shops(id). So it is number (bigint).
    // But let's check standard.
    name: string;
    address: string;
};

export default function TransferShopsScreen() {
    const [shops, setShops] = useState<ShopProp[]>([]);
    const [filteredShops, setFilteredShops] = useState<ShopProp[]>([]);
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

            if (!userData?.user) {
                setLoading(false);
                return;
            }

            // Get Rep ID
            const { data: userRecord } = await supabase
                .from('users')
                .select('id')
                .eq('email', userEmail)
                .single();
            const currentUserId = userRecord?.id;

            if (!currentUserId) return;

            // Get Rep's Routes
            const { data: myRoutes } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', currentUserId);

            const myRouteIds = myRoutes?.map(r => r.id) || [];

            // Get Shops assigned to Rep directly OR via Route
            let shopsQuery = supabase
                .from('shops')
                .select('id, name, address');

            if (myRouteIds.length > 0) {
                shopsQuery = shopsQuery.or(`rep_id.eq.${currentUserId},route_id.in.(${myRouteIds.join(',')})`);
            } else {
                shopsQuery = shopsQuery.eq('rep_id', currentUserId);
            }

            const { data: myShops, error: shopsError } = await shopsQuery;
            if (shopsError) throw shopsError;

            const formattedShops = (myShops || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                address: s.address || 'No address'
            }));

            setShops(formattedShops);
            setFilteredShops(formattedShops);

        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearch(text);
        if (text) {
            setFilteredShops(shops.filter(s => s.name.toLowerCase().includes(text.toLowerCase())));
        } else {
            setFilteredShops(shops);
        }
    };

    const renderItem = ({ item }: { item: ShopProp }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/rep/transfer-items', params: { shopId: item.id, shopName: item.name } })}
        >
            <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="storefront" size={24} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{item.name}</Text>
                    <Text style={styles.address}>{item.address}</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.title}>Select Shop</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search Shop..."
                    placeholderTextColor="#94A3B8"
                    value={search}
                    onChangeText={handleSearch}
                />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : (
                <FlatList
                    data={filteredShops}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={styles.emptyText}>No shops found assigned to you.</Text>
                        </View>
                    }
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
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#0F172A',
        fontWeight: '500'
    },
    list: {
        padding: 20,
        paddingTop: 0
    },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3E8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    shopName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4
    },
    address: {
        fontSize: 12,
        color: '#64748B'
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 15
    }
});
