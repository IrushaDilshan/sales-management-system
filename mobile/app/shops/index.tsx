import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ShopListScreen() {
    const router = useRouter();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchShops();
    }, []);

    async function fetchShops() {
        setLoading(true);
        const { data, error } = await supabase
            .from('shops')
            .select('*')
            .order('name');

        if (error) {
            console.error("Error fetching shops", error);
        }
        if (data) setShops(data);
        setLoading(false);
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Select a Shop</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                <FlatList
                    data={shops}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => router.push({ pathname: '/requests/create', params: { shop_id: item.id, shop_name: item.name } })}
                        >
                            <Text style={styles.shopName}>{item.name}</Text>
                            <Text style={styles.subtitle}>Tap to create order</Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    listContent: { paddingBottom: 20 },
    card: { padding: 20, backgroundColor: 'white', marginBottom: 15, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    shopName: { fontSize: 18, fontWeight: '600', color: '#111' },
    subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
});
