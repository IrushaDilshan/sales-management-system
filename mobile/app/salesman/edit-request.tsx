import { useEffect, useState } from 'react';
import { View, Text, SectionList, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function EditRequestScreen() {
    const router = useRouter();
    const { requestId } = useLocalSearchParams();

    const [sections, setSections] = useState<any[]>([]);
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [allItems, setAllItems] = useState<any[]>([]);
    const [shopName, setShopName] = useState('Stock Request');
    const [shopId, setShopId] = useState<number | null>(null);

    useEffect(() => {
        if (!requestId) {
            Alert.alert('Error', 'No request ID provided');
            router.back();
            return;
        }
        fetchData();
    }, [requestId]);

    async function fetchData() {
        setLoading(true);
        try {
            // 1. Fetch Request Details (to get shop_id and verify ownership)
            const { data: requestData, error: reqError } = await supabase
                .from('requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (reqError) throw reqError;
            if (!requestData) throw new Error('Request not found');

            setShopId(requestData.shop_id);

            // Fetch shop name separately to avoid FK issues
            if (requestData.shop_id) {
                const { data: shopData } = await supabase
                    .from('shops')
                    .select('name')
                    .eq('id', requestData.shop_id)
                    .single();

                if (shopData?.name) {
                    setShopName(shopData.name);
                }
            }

            if (requestData.status !== 'pending') {
                Alert.alert('Notice', 'This request is no longer pending and cannot be edited.');
                router.back();
                return;
            }

            // 2. Fetch Request Items (Existing Quantities)
            const { data: requestItems, error: itemsError } = await supabase
                .from('request_items')
                .select('item_id, qty')
                .eq('request_id', requestId);

            if (itemsError) throw itemsError;

            // map to quantities state
            const initialQty: { [key: string]: number } = {};
            requestItems?.forEach((item: any) => {
                initialQty[item.item_id] = item.qty;
            });
            setQuantities(initialQty);

            // 3. Fetch All Available Items
            const { data: itemsData, error: allItemsError } = await supabase
                .from('items')
                .select(`
                    *,
                    product_categories (
                        name
                    )
                `)
                .order('category_id')
                .order('name');

            if (allItemsError) throw allItemsError;

            if (itemsData) {
                setAllItems(itemsData);
                organizeData(itemsData, '', initialQty);
            }

        } catch (error: any) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to load request details');
            router.back();
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        organizeData(allItems, searchText, quantities);
    }, [allItems, searchText]); // Re-organize when list or search changes. NOTE: quantities excluded to avoid jumpiness, handled by organizeData call in fetchData

    const organizeData = (data: any[], filter: string, currentQty: { [key: string]: number }) => {
        const isSearchActive = filter.length > 0;

        let filtered = data.filter(i =>
            i.name.toLowerCase().includes(filter.toLowerCase())
        );

        const groups: { [key: string]: any[] } = {};
        const selectedItems: any[] = [];
        const unselectedItems: any[] = [];

        if (!isSearchActive) {
            filtered.forEach(item => {
                if ((currentQty[item.id] || 0) > 0) {
                    selectedItems.push(item);
                } else {
                    unselectedItems.push(item);
                }
            });
        } else {
            unselectedItems.push(...filtered);
        }

        // Group unselected
        unselectedItems.forEach(item => {
            const catName = item.product_categories?.name || 'Uncategorized';
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push(item);
        });

        const sectionData = Object.keys(groups).map(key => ({
            title: key,
            data: groups[key]
        }));

        if (!isSearchActive && selectedItems.length > 0) {
            setSections([
                { title: '✅ Selected Items', data: selectedItems },
                ...sectionData
            ]);
        } else {
            setSections(sectionData);
        }
    };

    const handleSearch = (text: string) => {
        setSearchText(text);
    };

    const updateQuantity = (id: string, qty: string) => {
        const val = parseInt(qty);
        const newQty = isNaN(val) ? 0 : val;

        setQuantities(prev => {
            const next = { ...prev, [id]: newQty };
            return next;
        });
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

    const handleUpdate = async () => {
        const validItems = allItems.filter(item => (quantities[item.id] || 0) > 0);

        if (validItems.length === 0) {
            return Alert.alert('Error', 'Please add at least one item');
        }

        setSubmitting(true);
        try {
            // 1. Delete existing items
            const { error: deleteError } = await supabase
                .from('request_items')
                .delete()
                .eq('request_id', requestId);

            if (deleteError) throw deleteError;

            // 2. Insert new items
            const newItems = validItems.map(item => ({
                request_id: requestId,
                item_id: item.id,
                qty: quantities[item.id],
                delivered_qty: 0
            }));

            const { error: insertError } = await supabase
                .from('request_items')
                .insert(newItems);

            if (insertError) throw insertError;

            Alert.alert(
                'Success',
                'Request updated successfully',
                [{ text: 'OK', onPress: () => router.back() }]
            );

        } catch (error: any) {
            console.error('Update error:', error);
            Alert.alert('Error', error.message || 'Failed to update request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerSubtitle}>Editing Request</Text>
                    <Text style={styles.headerTitle}>{shopName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search items..."
                        placeholderTextColor="#94a3b8"
                        value={searchText}
                        onChangeText={handleSearch}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>Loading details...</Text>
                </View>
            ) : (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    {getSelectedItemsCount() > 0 && (
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryItem}>
                                <Ionicons name="cube-outline" size={20} color="#2196F3" />
                                <Text style={styles.summaryLabel}>Selected Items</Text>
                                <Text style={styles.summaryValue}>{getSelectedItemsCount()}</Text>
                            </View>
                        </View>
                    )}

                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        stickySectionHeadersEnabled={false}
                        extraData={quantities}
                        renderSectionHeader={({ section: { title } }) => (
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>{title}</Text>
                            </View>
                        )}
                        renderItem={({ item }) => {
                            const qty = quantities[item.id] || 0;
                            return (
                                <View style={[styles.itemCard, qty > 0 && styles.itemCardActive]}>
                                    <View style={styles.itemImageContainer}>
                                        {item.image_url ? (
                                            <Image
                                                source={item.image_url}
                                                style={styles.itemImage}
                                                contentFit="cover"
                                                transition={500}
                                                cachePolicy="memory-disk"
                                            />
                                        ) : (
                                            <View style={[styles.itemIcon, qty > 0 && styles.itemIconActive]}>
                                                <Ionicons
                                                    name={qty > 0 ? "cube" : "cube-outline"}
                                                    size={24}
                                                    color={qty > 0 ? "#2196F3" : "#94a3b8"}
                                                />
                                            </View>
                                        )}
                                        {qty > 0 && (
                                            <View style={styles.activeCheck}>
                                                <Ionicons name="checkmark" size={12} color="white" />
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.itemContent}>
                                        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                                        <Text style={styles.itemMetas}>
                                            {item.unit_type || 'Unit'} • {item.is_perishable ? 'Fresh' : 'Dry'}
                                        </Text>
                                    </View>

                                    <View style={styles.itemRight}>
                                        <View style={styles.qtyControls}>
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
                                </View>
                            )
                        }}
                    />

                    <View style={{ height: 100 }} />

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitBtn, (submitting || getSelectedItemsCount() === 0) && styles.submitBtnDisabled]}
                            onPress={handleUpdate}
                            disabled={submitting || getSelectedItemsCount() === 0}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="save-outline" size={24} color="white" />
                                    <View>
                                        <Text style={styles.submitBtnText}>
                                            Update Request
                                        </Text>
                                        {getSelectedItemsCount() > 0 && (
                                            <Text style={styles.submitBtnSubText}>
                                                {getSelectedItemsCount()} items selected
                                            </Text>
                                        )}
                                    </View>
                                    <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
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
        marginTop: 10,
        marginBottom: 10,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#e2e8f0'
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
    list: {
        padding: 20,
        paddingBottom: 100
    },
    sectionHeader: {
        marginTop: 10,
        marginBottom: 10,
        paddingVertical: 5
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    itemCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1
    },
    itemCardActive: {
        borderColor: '#2196F3',
        backgroundColor: '#f8fcff',
        shadowColor: '#2196F3',
        shadowOpacity: 0.1,
        elevation: 2
    },
    itemImageContainer: {
        position: 'relative',
        marginRight: 12
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#f1f5f9'
    },
    itemIcon: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    itemIconActive: {
        backgroundColor: '#e3f2fd'
    },
    activeCheck: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#2196F3',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'white'
    },
    itemContent: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 4,
        lineHeight: 20
    },
    itemMetas: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500'
    },
    itemRight: {
        alignItems: 'flex-end',
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#f8fafc',
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    qtyBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    qtyBtnDisabled: {
        backgroundColor: '#f1f5f9',
        shadowOpacity: 0
    },
    qtyInput: {
        width: 40,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e'
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 32,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10
    },
    submitBtn: {
        backgroundColor: '#2196F3',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        fontSize: 18,
        fontWeight: '700'
    },
    submitBtnSubText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontWeight: '500'
    }
});
