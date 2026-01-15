import { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SubmitSaleScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<any[]>([]);
    const [stockMap, setStockMap] = useState<Record<string, number>>({});
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
    const [prices, setPrices] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [shopId, setShopId] = useState<string | null>(null);
    const [shopName, setShopName] = useState<string>('');
    const [searchText, setSearchText] = useState('');

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

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('shop_id, shops(id, name)')
                .eq('id', user.id)
                .single();

            let myShopId = userData?.shop_id;

            if (userError || !myShopId) {
                const { data: firstShop } = await supabase.from('shops').select('id, name').limit(1).single();
                if (firstShop) {
                    myShopId = firstShop.id;
                    setShopId(firstShop.id);
                    setShopName(firstShop.name);
                } else {
                    Alert.alert('Error', 'No shop available');
                    router.back();
                    return;
                }
            } else {
                setShopId(myShopId);
                setShopName((userData.shops as any).name);
            }

            // Fetch Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('*')
                .order('name');

            if (itemsError) throw itemsError;

            // Fetch Stock for this shop
            let stockMapping: Record<string, number> = {};
            try {
                // Try modern schema first (qty, outlet_id)
                const { data: stockData, error: stockError } = await supabase
                    .from('stock')
                    .select('item_id, qty')
                    .eq('outlet_id', myShopId);

                if (stockError) {
                    // Check if it's a specific "column does not exist" error
                    if (stockError.message?.includes('outlet_id') || stockError.message?.includes('exist')) {
                        console.warn('Database schema mismatch: outlet_id missing on stock table.');
                        Alert.alert('Database Update Needed', 'Please apply the latest database keys (Migration 12) to enable multi-location stock.');
                        // Fallback: Return empty stock (safer than crashing or showing global stock)
                    } else {
                        throw stockError;
                    }
                } else {
                    stockData?.forEach((s: any) => {
                        stockMapping[s.item_id] = s.qty;
                    });
                }
            } catch (err: any) {
                console.error('Stock fetch error:', err);
                // Non-fatal error for stock fetch, allows page to load with 0 stock
            }
            setStockMap(stockMapping);

            setItems(itemsData || []);

            const initialPrices: any = {};
            itemsData?.forEach((item: any) => {
                if (item.price || item.unit_price) {
                    initialPrices[item.id] = (item.price || item.unit_price).toString();
                }
            });
            setPrices(initialPrices);

        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    const updateQuantity = (id: string, qty: string, maxStock: number) => {
        let val = parseInt(qty);
        if (isNaN(val)) val = 0;
        if (val > maxStock) {
            val = maxStock;
            Alert.alert('Limit Reached', 'Cannot exceed available stock');
        }
        setQuantities(prev => ({ ...prev, [id]: val }));
    };

    const updatePrice = (id: string, price: string) => {
        setPrices(prev => ({ ...prev, [id]: price }));
    };

    const incrementQuantity = (id: string, maxStock: number) => {
        setQuantities(prev => {
            const current = prev[id] || 0;
            if (current >= maxStock) {
                Alert.alert('Limit Reached', 'Cannot exceed available stock');
                return prev;
            }
            return { ...prev, [id]: current + 1 };
        });
    };

    const decrementQuantity = (id: string) => {
        setQuantities(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
    };

    const getTotalAmount = () => {
        return items.reduce((sum, item) => {
            const qty = quantities[item.id] || 0;
            const price = parseFloat(prices[item.id] || '0');
            return sum + (qty * price);
        }, 0);
    };

    const getSelectedItemsCount = () => {
        return Object.values(quantities).filter(qty => qty > 0).length;
    };

    const handleSubmit = async () => {
        const validItems = items.filter(item => (quantities[item.id] || 0) > 0);

        if (validItems.length === 0) {
            return Alert.alert('Error', 'Please add at least one item');
        }

        const missingPrices = validItems.filter(item => !prices[item.id] || parseFloat(prices[item.id]) === 0);
        if (missingPrices.length > 0) {
            return Alert.alert('Warning', 'Some items have 0 price. Please check.');
        }

        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const totalAmount = getTotalAmount();

            const { data: saleData, error: saleError } = await supabase
                .from('sales')
                .insert([{
                    outlet_id: shopId,
                    customer_name: 'Walk-in Customer',
                    total_amount: totalAmount,
                    subtotal: totalAmount,
                    payment_method: 'cash',
                    payment_status: 'paid',
                    amount_paid: totalAmount,
                    amount_due: 0,
                    sale_date: new Date().toISOString(),
                    created_by: user.id
                }])
                .select()
                .single();

            if (saleError) throw saleError;

            const saleItems = validItems.map(item => ({
                sale_id: saleData.id,
                product_id: item.id,
                product_name: item.name,
                quantity: quantities[item.id],
                unit_price: parseFloat(prices[item.id] || '0'),
                line_total: (quantities[item.id] * parseFloat(prices[item.id] || '0'))
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(saleItems);

            if (itemsError) throw itemsError;

            Alert.alert(
                'Success!',
                `Sale recorded successfully!\nTotal: Rs. ${totalAmount.toLocaleString()}`,
                [{ text: 'OK', onPress: () => router.back() }]
            );

        } catch (error: any) {
            console.error('Submit error:', error);
            Alert.alert('Error', error.message || 'Failed to submit sale');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchText.toLowerCase()))
    );

    // Sort items: Available items first, then by name
    const sortedItems = [...filteredItems].sort((a, b) => {
        const stockA = stockMap[a.id] || 0;
        const stockB = stockMap[b.id] || 0;
        if (stockA > 0 && stockB === 0) return -1;
        if (stockA === 0 && stockB > 0) return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Clean Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>New Sale</Text>
                    <Text style={styles.headerSubtitle}>{shopName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <>
                    {/* Summary Widget */}
                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryCard}>
                            <View>
                                <Text style={styles.summaryLabel}>Total Amount</Text>
                                <Text style={styles.summaryValue}>Rs. {getTotalAmount().toLocaleString()}</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.summaryLabel}>Items</Text>
                                <Text style={styles.summaryValue}>{getSelectedItemsCount()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchWrapper}>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#94A3B8" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search products..."
                                placeholderTextColor="#94A3B8"
                                value={searchText}
                                onChangeText={setSearchText}
                            />
                            {searchText.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchText('')}>
                                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <FlatList
                        data={sortedItems}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Text style={{ color: '#94A3B8' }}>No products found</Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const qty = quantities[item.id] || 0;
                            const isActive = qty > 0;
                            const currentStock = stockMap[item.id] || 0;
                            const isOutOfStock = currentStock === 0;

                            return (
                                <View style={[
                                    styles.card,
                                    isActive && styles.cardActive,
                                    isOutOfStock && styles.cardDisabled
                                ]}>
                                    <View style={styles.cardHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.itemName, isOutOfStock && { color: '#94A3B8' }]}>
                                                {item.name}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                                                {isOutOfStock ? (
                                                    <View style={styles.stockBadgeOut}>
                                                        <Text style={styles.stockTextOut}>Out of Stock</Text>
                                                    </View>
                                                ) : (
                                                    <View style={styles.stockBadgeIn}>
                                                        <Text style={styles.stockTextIn}>Available: {currentStock}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {isActive && (
                                            <View style={styles.badge}>
                                                <Text style={styles.badgeText}>{qty}x</Text>
                                            </View>
                                        )}
                                    </View>

                                    {!isOutOfStock && (
                                        <View style={styles.controlsRow}>
                                            <View style={styles.priceContainer}>
                                                <Text style={styles.label}>Price (Rs)</Text>
                                                <TextInput
                                                    style={styles.priceInput}
                                                    keyboardType="numeric"
                                                    placeholder="0.00"
                                                    value={prices[item.id] || ''}
                                                    onChangeText={(txt) => updatePrice(item.id, txt)}
                                                />
                                            </View>

                                            <View style={styles.qtyContainer}>
                                                <TouchableOpacity
                                                    style={[styles.qtyBtn, qty === 0 && styles.disabledBtn]}
                                                    onPress={() => decrementQuantity(item.id)}
                                                    disabled={qty === 0}
                                                >
                                                    <Ionicons name="remove" size={20} color={qty === 0 ? "#CBD5E1" : "#2563EB"} />
                                                </TouchableOpacity>

                                                <Text style={styles.qtyText}>{qty}</Text>

                                                <TouchableOpacity
                                                    style={[styles.qtyBtn, qty >= currentStock && styles.disabledBtn]}
                                                    onPress={() => incrementQuantity(item.id, currentStock)}
                                                    disabled={qty >= currentStock}
                                                >
                                                    <Ionicons name="add" size={20} color={qty >= currentStock ? "#CBD5E1" : "#2563EB"} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            );
                        }}
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitBtn, (submitting || getSelectedItemsCount() === 0) && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting || getSelectedItemsCount() === 0}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.submitText}>Complete Sale ({getSelectedItemsCount()})</Text>
                                    <Ionicons name="chevron-forward" size={24} color="#fff" />
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
        backgroundColor: '#FFFFFF',
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
        textAlign: 'center'
    },
    summaryContainer: {
        paddingHorizontal: 20,
        marginBottom: 10
    },
    summaryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E293B', // Dark Slate
        borderRadius: 20,
        padding: 20,
        shadowColor: '#1E293B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8
    },
    summaryLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)'
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
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardActive: {
        borderColor: '#2563EB',
        backgroundColor: '#F0F9FF',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
    },
    badge: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    priceContainer: {
        flex: 1,
    },
    label: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 6,
    },
    priceInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        fontWeight: '600',
        color: '#0F172A',
        fontSize: 15
    },
    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        height: 48,
        paddingHorizontal: 4,
    },
    qtyBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    disabledBtn: {
        backgroundColor: '#F1F5F9',
        shadowOpacity: 0,
        elevation: 0,
    },
    qtyText: {
        width: 40,
        textAlign: 'center',
        fontWeight: '700',
        fontSize: 16,
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
        fontSize: 18,
        fontWeight: '700',
    },
    searchWrapper: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9', // Light Slate for search
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#0F172A',
        height: '100%'
    },
    cardDisabled: {
        opacity: 0.7,
        backgroundColor: '#F8FAFC'
    },
    stockBadgeIn: {
        backgroundColor: '#DCFCE7', // Light Green
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#bbf7d0'
    },
    stockTextIn: {
        fontSize: 11,
        fontWeight: '700',
        color: '#166534' // Dark Green
    },
    stockBadgeOut: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    stockTextOut: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8'
    }
});
