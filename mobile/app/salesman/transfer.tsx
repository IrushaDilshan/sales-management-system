import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, StatusBar, TextInput } from 'react-native';
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
    const [searchText, setSearchText] = useState('');

    // New State for Transfer Mode
    const [transferMode, setTransferMode] = useState<'shop' | 'rep'>('shop');
    const [repId, setRepId] = useState<string | null>(null);

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

            // Fetch User's Shop AND Rep ID
            const { data: userData } = await supabase
                .from('users')
                .select('shop_id, shops(id, name, rep_id)')
                .eq('id', user.id)
                .single();

            let myShopId = userData?.shop_id;
            let myRepId = (userData?.shops as any)?.rep_id;

            if (!myShopId) {
                // Fallback (for development/testing if user has no shop)
                const { data: firstShop } = await supabase.from('shops').select('id, name, rep_id').limit(1).single();
                if (firstShop) {
                    myShopId = firstShop.id;
                    setCurrentShopName(firstShop.name);
                    myRepId = firstShop.rep_id;
                }
            } else {
                setCurrentShopName((userData?.shops as any).name);
            }
            setCurrentShopId(myShopId);
            setRepId(myRepId);

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
        if (transferMode === 'shop' && !selectedShopId) {
            return Alert.alert('Error', 'Please select a destination shop');
        }

        if (transferMode === 'rep' && !repId) {
            return Alert.alert('Error', 'No Rep assigned to your shop');
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
                let rpcName = 'transfer_stock';
                let params: any = {
                    p_product_id: item.id,
                    p_quantity: quantities[item.id],
                    p_notes: notes || (transferMode === 'rep' ? 'Return to Rep' : 'Manual Transfer')
                    // user_id is implicit or passed if needed
                };

                // Add RPC-specific params
                if (transferMode === 'shop') {
                    rpcName = 'transfer_stock';
                    params.p_from_outlet_id = currentShopId;
                    params.p_to_outlet_id = selectedShopId;
                    params.p_user_id = user?.id; // transfer_stock expects p_user_id
                } else {
                    rpcName = 'transfer_salesman_to_rep';
                    params.p_salesman_id = user?.id;
                    // transfer_salesman_to_rep signature: (p_salesman_id, p_product_id, p_quantity, p_notes)
                    // Note: Ensure consistent param names with migration file
                }

                const { data, error } = await supabase.rpc(rpcName, params);

                if (!error && (data?.success || data === true)) { // Handle different return types
                    successCount++;
                } else {
                    console.error("RPC Error", rpcName, error, data);
                    if (data && !data.success) throw new Error(data.message);
                    if (error) throw error;
                }
            }

            if (successCount === validItems.length) {
                Alert.alert('Success', transferMode === 'rep' ? 'Returned to Rep successfully' : 'Transfer completed successfully', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                Alert.alert('Partial Success', `Processed ${successCount} of ${validItems.length} items. Check logs.`);
                router.back();
            }

        } catch (error: any) {
            console.error('Submit error:', error);
            Alert.alert('Error', error.message || 'Failed to submit transfer');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Stock Transfer</Text>
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
                    data={filteredItems}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={
                        <View>
                            {/* Transfer Mode Toggle */}
                            <View style={styles.toggleContainer}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, transferMode === 'shop' && styles.toggleBtnActive]}
                                    onPress={() => setTransferMode('shop')}
                                >
                                    <View style={styles.toggleContent}>
                                        <Ionicons name="storefront" size={16} color={transferMode === 'shop' ? '#FFF' : '#64748B'} />
                                        <Text style={[styles.toggleText, transferMode === 'shop' && styles.toggleTextActive]}>To Shop</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, transferMode === 'rep' && styles.toggleBtnActive]}
                                    onPress={() => setTransferMode('rep')}
                                >
                                    <View style={styles.toggleContent}>
                                        <Ionicons name="person" size={16} color={transferMode === 'rep' ? '#FFF' : '#64748B'} />
                                        <Text style={[styles.toggleText, transferMode === 'rep' && styles.toggleTextActive]}>To Rep</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {transferMode === 'shop' ? (
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
                                </View>
                            ) : (
                                <View style={styles.repCard}>
                                    <View style={styles.repIcon}>
                                        <Ionicons name="person" size={24} color="#7C3AED" />
                                    </View>
                                    <View>
                                        <Text style={styles.repTitle}>Returning to Representative</Text>
                                        <Text style={styles.repSubtitle}>Stock will be transferred to your Rep's inventory.</Text>
                                    </View>
                                </View>
                            )}

                            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Select Items</Text>

                            {/* Search Bar */}
                            <View style={styles.searchWrapper}>
                                <View style={styles.searchContainer}>
                                    <Ionicons name="search" size={20} color="#94A3B8" />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search items to transfer..."
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
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Text style={{ color: '#94A3B8' }}>
                                {items.length === 0 ? "You have no stock to transfer." : "No matching items found."}
                            </Text>
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

                                    <TextInput
                                        style={styles.qtyInput}
                                        keyboardType="numeric"
                                        value={qty.toString()}
                                        editable={false}
                                    />

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
                        style={[
                            styles.submitBtn,
                            (submitting || (transferMode === 'shop' && !selectedShopId) || getSelectedItemsCount() == 0) && styles.submitBtnDisabled,
                            transferMode === 'rep' && { backgroundColor: '#7C3AED', shadowColor: '#7C3AED' }
                        ]}
                        onPress={handleSubmit}
                        disabled={submitting || (transferMode === 'shop' && !selectedShopId) || getSelectedItemsCount() == 0}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitText}>
                                    {transferMode === 'shop' ? 'Transfer' : 'Return'} {getSelectedItemsCount()} Items
                                </Text>
                                <Ionicons name={transferMode === 'shop' ? "arrow-forward-circle" : "return-up-back"} size={24} color="#fff" />
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
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center'
    },
    toggleBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    toggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B'
    },
    toggleTextActive: {
        color: '#0F172A',
        fontWeight: '700'
    },
    section: {
        marginBottom: 10
    },
    sectionTitle: {
        fontSize: 12,
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
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10
    },
    shopCardSelected: {
        backgroundColor: '#EFF6FF',
        borderColor: '#2563EB',
        borderWidth: 2
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
    repCard: {
        backgroundColor: '#F5F3FF',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#DDD6FE'
    },
    repIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EBE4FF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    repTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#7C3AED',
        marginBottom: 4
    },
    repSubtitle: {
        fontSize: 13,
        color: '#6D28D9',
        maxWidth: '90%'
    },
    searchWrapper: {
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#0F172A',
        height: '100%'
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
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardActive: {
        borderColor: '#2563EB',
        backgroundColor: '#F0F9FF',
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
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1
    },
    disabledBtn: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0
    },
    qtyText: { // Replaced with input style effectively
        display: 'none'
    },
    qtyInput: {
        width: 40,
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
