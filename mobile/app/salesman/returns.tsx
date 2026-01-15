import { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StockReturnScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<any[]>([]);
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
    const [reasons, setReasons] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentShopId, setCurrentShopId] = useState<string | null>(null);
    const [currentShopName, setCurrentShopName] = useState<string>('');

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


            // Fetch Items & Stock
            let availableItemIds: number[] = [];
            const stockMapping: Record<string, number> = {};

            try {
                const { data: stockData, error: stockError } = await supabase
                    .from('stock')
                    .select('item_id, qty')
                    .eq('outlet_id', myShopId)
                    .gt('qty', 0);

                if (stockError) {
                    if (stockError.message?.includes('outlet_id')) {
                        console.warn('Database mismatch (outlet_id)');
                        // Fallback to empty
                    } else {
                        throw stockError;
                    }
                }

                if (stockData) {
                    stockData.forEach((s: any) => {
                        availableItemIds.push(s.item_id);
                        stockMapping[s.item_id] = s.qty;
                    });
                }
            } catch (e) {
                console.error('Stock fetch fail', e);
            }

            if (availableItemIds.length === 0) {
                setItems([]);
                return;
            }

            const { data: itemsData } = await supabase
                .from('items')
                .select('id, name, unit_of_measure')
                .in('id', availableItemIds)
                .order('name');

            // Attach max stock info to items if needed
            const itemsWithStock = itemsData?.map((item: any) => ({
                ...item,
                max_qty: stockMapping[item.id] || 0
            }));

            setItems(itemsWithStock || []);

        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    const incrementQuantity = (id: string) => {
        setQuantities(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    };

    const decrementQuantity = (id: string) => {
        setQuantities(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
    };

    const updateReason = (id: string, text: string) => {
        setReasons(prev => ({ ...prev, [id]: text }));
    };

    const getSelectedItemsCount = () => {
        return Object.values(quantities).filter(qty => qty > 0).length;
    };

    const handleSubmit = async () => {
        const validItems = items.filter(item => (quantities[item.id] || 0) > 0);

        if (validItems.length === 0) {
            return Alert.alert('Error', 'Please select at least one item to return');
        }

        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            let successCount = 0;

            for (const item of validItems) {
                const { data, error } = await supabase.rpc('process_customer_return', {
                    p_product_id: item.id,
                    p_outlet_id: currentShopId,
                    p_quantity: quantities[item.id],
                    p_reason: reasons[item.id] || 'Customer Return',
                    p_user_id: user?.id
                });

                if (!error && data?.success) {
                    successCount++;
                }
            }

            if (successCount === validItems.length) {
                Alert.alert('Success', 'Returns processed successfully', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                Alert.alert('Partial Success', `Processed ${successCount} returns. Check logs.`);
                router.back();
            }

        } catch (error: any) {
            console.error('Submit error:', error);
            Alert.alert('Error', error.message || 'Failed to submit return');
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
                    <Text style={styles.headerTitle}>Customer Return</Text>
                    <Text style={styles.headerSubtitle}>To: {currentShopName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F59E0B" />
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle" size={20} color="#F59E0B" />
                            <Text style={styles.infoText}>
                                Select customer returned items. Inventory will be updated automatically.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const qty = quantities[item.id] || 0;
                        const isActive = qty > 0;

                        return (
                            <View style={[styles.card, isActive && styles.cardActive]}>
                                <View style={styles.cardMain}>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={styles.unitLabel}>{item.unit_of_measure}</Text>
                                    </View>

                                    <View style={styles.qtyContainer}>
                                        <TouchableOpacity
                                            style={[styles.qtyBtn, qty === 0 && styles.disabledBtn]}
                                            onPress={() => decrementQuantity(item.id)}
                                            disabled={qty === 0}
                                        >
                                            <Ionicons name="remove" size={18} color={qty === 0 ? "#CBD5E1" : "#F59E0B"} />
                                        </TouchableOpacity>

                                        <Text style={styles.qtyText}>{qty}</Text>

                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => incrementQuantity(item.id)}
                                        >
                                            <Ionicons name="add" size={18} color="#F59E0B" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {isActive && (
                                    <View style={styles.reasonContainer}>
                                        <TextInput
                                            style={styles.reasonInput}
                                            placeholder="Reason (Optional)"
                                            placeholderTextColor="#94A3B8"
                                            value={reasons[item.id] || ''}
                                            onChangeText={(txt) => updateReason(item.id, txt)}
                                        />
                                    </View>
                                )}
                            </View>
                        );
                    }}
                />
            )}

            {!loading && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.submitBtn, (submitting || getSelectedItemsCount() == 0) && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting || getSelectedItemsCount() == 0}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitText}>Confirm Return ({getSelectedItemsCount()})</Text>
                                <Ionicons name="checkmark-circle" size={24} color="#fff" />
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
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#FFFBEB',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#FEF3C7'
    },
    infoText: {
        fontSize: 13,
        color: '#B45309',
        flex: 1,
        lineHeight: 18
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    cardActive: {
        backgroundColor: '#FFFBEB', // Light orange tint
        borderColor: '#F59E0B'
    },
    cardMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
        marginRight: 12
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    unitLabel: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2
    },
    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
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
    },
    disabledBtn: {
        opacity: 0.3
    },
    qtyText: {
        width: 36,
        textAlign: 'center',
        fontWeight: '700',
        fontSize: 16,
        color: '#0F172A',
    },
    reasonContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)'
    },
    reasonInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        color: '#1E293B'
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
        backgroundColor: '#F59E0B', // Orange
        borderRadius: 16,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#F59E0B',
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
