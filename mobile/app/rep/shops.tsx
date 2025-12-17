import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
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
            // Manual Join: Requests -> Shops

            // 1. Fetch all pending requests
            const { data: requestsData, error: reqError } = await supabase
                .from('requests')
                .select('shop_id, date')
                .eq('status', 'pending');

            if (reqError) throw reqError;

            if (!requestsData || requestsData.length === 0) {
                setShops([]);
                setFilteredShops([]);
                return;
            }

            // 2. Fetch unique Shops
            const shopIds = Array.from(new Set(requestsData.map((r: any) => r.shop_id)));
            const { data: shopsData, error: shopsError } = await supabase
                .from('shops')
                .select('id, name')
                .in('id', shopIds);

            if (shopsError) throw shopsError;

            // 3. Aggregate
            const shopsMap = new Map();
            shopsData?.forEach((s: any) => shopsMap.set(s.id, s.name));

            const aggregated = shopIds.map(id => {
                const shopRequests = requestsData.filter((r: any) => r.shop_id === id);
                return {
                    shopId: id,
                    shopName: shopsMap.get(id) || 'Unknown Shop',
                    requestCount: shopRequests.length,
                    latestDate: shopRequests[0]?.date // Simplified
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
                <Ionicons name="storefront" size={24} color="#FF9800" />
                <View style={{ marginLeft: 12 }}>
                    <Text style={styles.shopName}>{item.shopName}</Text>
                    <Text style={styles.subtitle}>{item.requestCount} Active Requests</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
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
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 40 },
    backBtn: { marginRight: 16 },
    title: { fontSize: 24, fontWeight: 'bold' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 16, elevation: 1 },
    searchInput: { flex: 1, fontSize: 16 },
    list: { paddingBottom: 20 },
    card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10, elevation: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    shopName: { fontSize: 18, fontWeight: '600', color: '#333' },
    subtitle: { color: '#666', marginTop: 4 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 16 }
});
