import { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function CreateRequestScreen() {
    const router = useRouter();
    const { shop_id, shop_name } = useLocalSearchParams();
    const [items, setItems] = useState<any[]>([]);
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({}); // { itemId: quantity }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchText, setSearchText] = useState('');

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

    const incrementQuantity = (id: string) => {
        setQuantities(prev => ({
            ...prev,
            [id]: (prev[id] || 0) + 1
        }));
    };

    const decrementQuantity = (id: string) => {
        setQuantities(prev => ({
            ...prev,
            [id]: Math.max(0, (prev[id] || 0) - 1)
        }));
    };

    const getTotalItems = () => {
        return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
    };

    const getSelectedItemsCount = () => {
        return Object.values(quantities).filter(qty => qty > 0).length;
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
                salesmanId = '00000000-0000-0000-0000-000000000000';
            }

            if (!salesmanId) {
                throw new Error('No user authenticated and no fallback ID provided');
            }

            // 2. Insert Request
            const { data: requestData, error: reqError } = await supabase
                .from('requests')
                .insert([{
                    shop_id: shop_id,
                    salesman_id: salesmanId,
                    status: 'pending',
                    date: new Date().toISOString(),
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (reqError) throw reqError;

            // 3. Insert Request Items
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

            Alert.alert(
                'Success!',
                `Order created successfully!\n\n${validItems.length} items • ${getTotalItems()} total quantity`,
                [{ text: 'OK', onPress: () => router.back() }]
            );

        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.message || 'Failed to create request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerSubtitle}>Create Order For</Text>
                    <Text style={styles.headerTitle}>{shop_name}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search items..."
                        placeholderTextColor="#94a3b8"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Ionicons name="close-circle" size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>Loading items...</Text>
                </View>
            ) : (
                <>
                    {/* Items Summary Card */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryItem}>
                            <Ionicons name="cube-outline" size={20} color="#2196F3" />
                            <Text style={styles.summaryLabel}>Selected Items</Text>
                            <Text style={styles.summaryValue}>{getSelectedItemsCount()}</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Ionicons name="calculator-outline" size={20} color="#2196F3" />
                            <Text style={styles.summaryLabel}>Total Quantity</Text>
                            <Text style={styles.summaryValue}>{getTotalItems()}</Text>
                        </View>
                    </View>

                    {/* Items List */}
                    <FlatList
                        data={items.filter(i => i.name.toLowerCase().includes(searchText.toLowerCase()))}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const qty = quantities[item.id] || 0;
                            return (
                                <View style={[styles.itemCard, qty > 0 && styles.itemCardActive]}>
                                    <View style={styles.itemLeft}>
                                        <View style={[styles.itemIcon, qty > 0 && styles.itemIconActive]}>
                                            <Ionicons
                                                name={qty > 0 ? "cube" : "cube-outline"}
                                                size={24}
                                                color={qty > 0 ? "#2196F3" : "#94a3b8"}
                                            />
                                        </View>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                    </View>
                                    <View style={styles.itemRight}>
                                        <TouchableOpacity
                                            style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
                                            onPress={() => decrementQuantity(item.id)}
                                            disabled={qty === 0}
                                        >
                                            <Ionicons name="remove" size={18} color={qty === 0 ? "#cbd5e1" : "#2196F3"} />
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.qtyInput}
                                            placeholder="0"
                                            keyboardType="numeric"
                                            value={qty === 0 ? '' : qty.toString()}
                                            onChangeText={(txt) => updateQuantity(item.id, txt)}
                                        />
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => incrementQuantity(item.id)}
                                        >
                                            <Ionicons name="add" size={18} color="#2196F3" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )
                        }}
                    />

                    {/* Submit Button */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitBtn, (submitting || getSelectedItemsCount() === 0) && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting || getSelectedItemsCount() === 0}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={24} color="white" />
                                    <Text style={styles.submitBtnText}>
                                        Submit Order ({getSelectedItemsCount()} items)
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
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
        backgroundColor: '#2196F3',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchSection: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 20,
        paddingBottom: 20,
        marginBottom: 10,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        gap: 8
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1e293b',
        height: '100%'
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerContent: {
        flex: 1,
        alignItems: 'center'
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
        marginBottom: 4
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '600'
    },
    summaryCard: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 16,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    summaryItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    summaryLabel: {
        flex: 1,
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600'
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#2196F3'
    },
    summaryDivider: {
        width: 1,
        backgroundColor: '#e2e8f0',
        marginHorizontal: 16
    },
    list: {
        padding: 20,
        paddingBottom: 100
    },
    itemCard: {
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1
    },
    itemCardActive: {
        borderColor: '#2196F3',
        backgroundColor: '#f0f9ff',
        shadowColor: '#2196F3',
        shadowOpacity: 0.1,
        elevation: 3
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12
    },
    itemIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    itemIconActive: {
        backgroundColor: '#e3f2fd'
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a2e',
        flex: 1
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    qtyBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center'
    },
    qtyBtnDisabled: {
        backgroundColor: '#f1f5f9'
    },
    qtyInput: {
        width: 56,
        height: 40,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
        backgroundColor: '#fff'
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 32,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10
    },
    submitBtn: {
        backgroundColor: '#2196F3',
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    submitBtnDisabled: {
        backgroundColor: '#cbd5e1',
        shadowOpacity: 0
    },
    submitBtnText: {
        color: 'white',
        fontSize: 17,
        fontWeight: '700'
    }
});
