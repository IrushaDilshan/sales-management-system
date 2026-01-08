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
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
    const [prices, setPrices] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [shopId, setShopId] = useState<string | null>(null);
    const [shopName, setShopName] = useState<string>('');

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

            if (userError || !userData?.shop_id) {
                const { data: firstShop } = await supabase.from('shops').select('id, name').limit(1).single();
                if (firstShop) {
                    setShopId(firstShop.id);
                    setShopName(firstShop.name);
                } else {
                    Alert.alert('Error', 'No shop available');
                    router.back();
                    return;
                }
            } else {
                setShopId(userData.shop_id);
                setShopName((userData.shops as any).name);
            }

            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('*')
                .order('name');

            if (itemsError) throw itemsError;

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

    const updateQuantity = (id: string, qty: string) => {
        const val = parseInt(qty);
        setQuantities(prev => ({ ...prev, [id]: isNaN(val) ? 0 : val }));
    };

    const updatePrice = (id: string, price: string) => {
        setPrices(prev => ({ ...prev, [id]: price }));
    };

    const incrementQuantity = (id: string) => {
        setQuantities(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
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

                    <FlatList
                        data={items}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const qty = quantities[item.id] || 0;
                            const isActive = qty > 0;

                            return (
                                <View style={[styles.card, isActive && styles.cardActive]}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        {isActive && (
                                            <View style={styles.badge}>
                                                <Text style={styles.badgeText}>{qty}x</Text>
                                            </View>
                                        )}
                                    </View>

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
                                                style={styles.qtyBtn}
                                                onPress={() => incrementQuantity(item.id)}
                                            >
                                                <Ionicons name="add" size={20} color="#2563EB" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            );
                        }}
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.submitText}>Complete Sale</Text>
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
});
