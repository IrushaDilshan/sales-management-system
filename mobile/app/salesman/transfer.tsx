import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StockTransferScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<any[]>([]);
    const [shops, setShops] = useState<any[]>([]);
    const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentShopId, setCurrentShopId] = useState<string | null>(null);
    const [currentShopName, setCurrentShopName] = useState<string>('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    async function fetchInitialData() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'No user logged in');
                router.back();
                return;
            }

            const { data: userData } = await supabase
                .from('users')
                .select('shop_id, shops(id, name)')
                .eq('id', user.id)
                .single();

            let myShopId = userData?.shop_id;

            if (!myShopId) {
                const { data: firstShop } = await supabase.from('shops').select('id, name').limit(1).single();
                if (firstShop) {
                    myShopId = firstShop.id;
                    setCurrentShopName(firstShop.name);
                }
            } else {
                setCurrentShopName((userData?.shops as any).name);
            }
            setCurrentShopId(myShopId);

            const { data: shopsData } = await supabase
                .from('shops')
                .select('id, name')
                .neq('id', myShopId)
                .order('name');

            setShops(shopsData || []);

            let stockData, stockError;

            try {
                const res = await supabase
                    .from('stock')
                    .select('item_id, qty')
                    .eq('outlet_id', myShopId)
                    .gt('qty', 0);
                stockData = res.data;
                stockError = res.error;
            } catch (e) { }

            if (stockError || !stockData) {
                const res = await supabase
                    .from('stock')
                    .select('item_id, qty')
                    .gt('qty', 0);
                stockData = res.data;
                stockError = res.error;
            }

            if (stockError) throw stockError;

            if (stockData && stockData.length > 0) {
                const itemIds = stockData.map((s: any) => s.item_id);

                const { data: itemsData, error: itemsError } = await supabase
                    .from('items')
                    .select('id, name, unit_of_measure')
                    .in('id', itemIds);

                if (itemsError) throw itemsError;

                const availableItems = stockData.map((s: any) => {
                    const itemDetail = itemsData?.find((i: any) => i.id === s.item_id);
                    return {
                        id: s.item_id,
                        name: itemDetail?.name || 'Unknown Item',
                        unit: itemDetail?.unit_of_measure || 'units',
                        max_qty: s.qty
                    };
                }).filter((i: any) => i.name !== 'Unknown Item')
                    .sort((a: any, b: any) => a.name.localeCompare(b.name));

                setItems(availableItems);
            } else {
                setItems([]);
            }

        } catch (error: any) {
            console.error('Fetch error:', error);
            Alert.alert('Error', `Failed to load data: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    const incrementQuantity = (id: string, max: number) => {
        setQuantities(prev => ({
            ...prev,
            [id]: Math.min(max, (prev[id] || 0) + 1)
        }));
    };

    const decrementQuantity = (id: string) => {
        setQuantities(prev => ({
            ...prev,
            [id]: Math.max(0, (prev[id] || 0) - 1)
        }));
    };

    const getSelectedItemsCount = () => {
        return Object.values(quantities).filter(qty => qty > 0).length;
    };

    const handleSubmit = async () => {
        if (!selectedShopId) {
            return Alert.alert('Error', 'Please select a destination shop');
        }

        const validItems = items.filter(item => (quantities[item.id] || 0) > 0);

        if (validItems.length === 0) {
            return Alert.alert('Error', 'Please select at least one item to transfer');
        }

        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            let successCount = 0;

            for (const item of validItems) {
                const { data, error } = await supabase.rpc('transfer_stock', {
                    p_product_id: item.id,
                    p_from_outlet_id: currentShopId,
                    p_to_outlet_id: selectedShopId,
                    p_quantity: quantities[item.id],
                    p_notes: notes || 'Manual Transfer',
                    p_user_id: user?.id
                });

                if (!error && data?.success) {
                    successCount++;
                }
            }

            if (successCount === validItems.length) {
                Alert.alert('Success', 'Transfer completed successfully', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                Alert.alert('Partial Success', `Transferred ${successCount} of ${validItems.length} items. Check logs.`);
                router.back();
            }

        } catch (error: any) {
            console.error('Submit error:', error);
            Alert.alert('Error', error.message || 'Failed to submit transfer');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Transfer Stock</Text>
                    <Text style={styles.headerSubtitle}>From: {currentShopName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Select Destination</Text>
                            <View style={styles.shopGrid}>
                                {shops.map(shop => {
                                    const isSelected = selectedShopId === shop.id;
                                    return (
                                        <TouchableOpacity
                                            key={shop.id}
                                            style={[styles.shopCard, isSelected && styles.shopCardSelected]}
                                            onPress={() => setSelectedShopId(shop.id)}
                                        >
                                            <View style={[styles.shopIcon, isSelected && { backgroundColor: '#2563EB', borderColor: '#2563EB' }]}>
                                                <Ionicons
                                                    name="storefront"
                                                    size={20}
                                                    color={isSelected ? "#FFF" : "#64748B"}
                                                />
                                            </View>
                                            <Text style={[styles.shopName, isSelected && { color: '#2563EB', fontWeight: '700' }]}>
                                                {shop.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Select Items</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const qty = quantities[item.id] || 0;
                        const isActive = qty > 0;

                        return (
                            <View style={[styles.card, isActive && styles.cardActive]}>
                                <View style={styles.cardInfo}>
                                    <View>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={styles.stockLabel}>
                                            Available: <Text style={{ color: '#0F172A', fontWeight: '600' }}>{item.max_qty}</Text> {item.unit}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.qtyContainer}>
                                    <TouchableOpacity
                                        style={[styles.qtyBtn, qty === 0 && styles.disabledBtn]}
                                        onPress={() => decrementQuantity(item.id)}
                                        disabled={qty === 0}
                                    >
                                        <Ionicons name="remove" size={18} color={qty === 0 ? "#CBD5E1" : "#2563EB"} />
                                    </TouchableOpacity>

                                    <Text style={styles.qtyText}>{qty}</Text>

                                    <TouchableOpacity
                                        style={[styles.qtyBtn, qty >= item.max_qty && styles.disabledBtn]}
                                        onPress={() => incrementQuantity(item.id, item.max_qty)}
                                        disabled={qty >= item.max_qty}
                                    >
                                        <Ionicons name="add" size={18} color={qty >= item.max_qty ? "#CBD5E1" : "#2563EB"} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            {!loading && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.submitBtn, (submitting || !selectedShopId || getSelectedItemsCount() == 0) && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting || !selectedShopId || getSelectedItemsCount() == 0}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitText}>Transfer {getSelectedItemsCount()} Items</Text>
                                <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Clean White
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
        textAlign: 'center'
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 2
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: 20,
        paddingTop: 10,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 10
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12
    },
    shopGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12
    },
    shopCard: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10
    },
    shopCardSelected: {
        backgroundColor: '#EFF6FF',
        borderColor: '#2563EB'
    },
    shopIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    shopName: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '600',
        flex: 1
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardActive: {
        borderColor: '#2563EB',
        backgroundColor: '#EFF6FF',
    },
    cardInfo: {
        flex: 1,
        marginRight: 12
    },
    itemName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4
    },
    stockLabel: {
        fontSize: 12,
        color: '#64748B'
    },
    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        height: 40,
        paddingHorizontal: 4,
    },
    qtyBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 2,
        elevation: 1
    },
    disabledBtn: {
        backgroundColor: '#F1F5F9',
        shadowOpacity: 0,
        elevation: 0
    },
    qtyText: {
        width: 36,
        textAlign: 'center',
        fontWeight: '700',
        fontSize: 15,
        color: '#0F172A',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        padding: 20,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    submitBtn: {
        backgroundColor: '#2563EB',
        borderRadius: 16,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitBtnDisabled: {
        backgroundColor: '#94A3B8',
        shadowOpacity: 0,
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
