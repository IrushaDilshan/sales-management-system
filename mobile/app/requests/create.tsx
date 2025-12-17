import { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function CreateRequestScreen() {
    const router = useRouter();
    const { shop_id, shop_name } = useLocalSearchParams();
    const [items, setItems] = useState<any[]>([]);
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({}); // { itemId: quantity }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    async function fetchItems() {
        setLoading(true);
        const { data } = await supabase.from('items').select('*').order('name');
        if (data) setItems(data);
        setLoading(false);
    }

    const updateQuantity = (id: string, qty: string) => {
        const val = parseInt(qty);
        setQuantities(prev => ({
            ...prev,
            [id]: isNaN(val) ? 0 : val
        }));
    };

    const handleSubmit = async () => {
        // 1. Prepare data
        const validItems = items.filter(item => (quantities[item.id] || 0) > 0);

        if (validItems.length === 0) {
            return Alert.alert('Error', 'Please add at least one item');
        }

        setSubmitting(true);



        try {
            // Get current user for salesman_id
            let salesmanId = null;
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (user) {
                salesmanId = user.id;
            } else {
                console.log('No auth session, using TEST salesman ID');
                // TODO: Replace this with a valid User ID from your 'users' table for testing
                salesmanId = '00000000-0000-0000-0000-000000000000';
            }

            if (!salesmanId) {
                throw new Error('No user authenticated and no fallback ID provided');
            }

            // 2. Insert Request (Step A)
            // Schema: shop_id, salesman_id, date, status
            const { data: requestData, error: reqError } = await supabase
                .from('requests')
                .insert([{
                    shop_id: shop_id,
                    salesman_id: salesmanId,
                    status: 'pending',
                    date: new Date().toISOString()
                }])
                .select()
                .single();

            if (reqError) throw reqError;

            // 3. Insert Request Items (Step C)
            // Schema: request_id, item_id, qty, delivered_qty
            const requestItems = validItems.map(item => ({
                request_id: requestData.id,
                item_id: item.id,
                qty: quantities[item.id],
                delivered_qty: 0
            }));

            const { error: itemsError } = await supabase
                .from('request_items')
                .insert(requestItems);

            if (itemsError) throw itemsError;

            Alert.alert('Success', 'Request created!', [{ text: 'OK', onPress: () => router.navigate('/shops') }]);

        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.message || 'Failed to create request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Order for {shop_name}</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                <>
                    <FlatList
                        data={items}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) => {
                            const qty = quantities[item.id] || 0;
                            return (
                                <View style={[styles.row, qty > 0 && styles.rowActive]}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        value={qty === 0 ? '' : qty.toString()}
                                        onChangeText={(txt) => updateQuantity(item.id, txt)}
                                    />
                                </View>
                            )
                        }}
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && styles.disabledBtn]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.btnText}>Submit Request</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: 'white' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    list: { paddingBottom: 100 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center', padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
    rowActive: { borderColor: '#4CAF50', backgroundColor: '#e8f5e9' },
    itemName: { fontSize: 16, fontWeight: '500', flex: 1 },
    input: { borderWidth: 1, borderColor: '#ccc', width: 70, padding: 8, textAlign: 'center', borderRadius: 6, backgroundColor: 'white', fontSize: 16 },
    footer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
    submitBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
    disabledBtn: { backgroundColor: '#A0A0A0' },
    btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
