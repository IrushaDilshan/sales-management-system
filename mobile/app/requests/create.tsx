import { useEffect, useState } from 'react';
import { View, Text, SectionList, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function CreateRequestScreen() {
    const router = useRouter();
    const { shop_id, shop_name } = useLocalSearchParams();
    const [sections, setSections] = useState<any[]>([]);
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({}); // { itemId: quantity }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [allItems, setAllItems] = useState<any[]>([]);
    const [pendingRequest, setPendingRequest] = useState<any>(null);
    const [pendingRequestItems, setPendingRequestItems] = useState<any[]>([]);
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [loadingPendingDetails, setLoadingPendingDetails] = useState(false);

    useEffect(() => {
        checkPendingRequest();
        fetchItems();
    }, []);

    async function checkPendingRequest() {
        // Handle potential array from params
        const targetShopId = Array.isArray(shop_id) ? shop_id[0] : shop_id;

        console.log('Checking pending requests for Shop ID:', targetShopId);

        if (!targetShopId) {
            console.log('No Shop ID provided to checkPendingRequest');
            return;
        }

        try {
            // Get today's date in YYYY-MM-DD format
            const today = new Date();
            const todayDateString = today.toISOString().split('T')[0]; // e.g., "2026-01-17"

            console.log('Today date:', todayDateString);

            const { data, error } = await supabase
                .from('requests')
                .select('*')
                .eq('shop_id', targetShopId)
                .eq('status', 'pending')
                .limit(10); // Get multiple to check dates

            if (error) {
                console.error('Error checking pending requests:', error);
                return;
            }

            console.log('All pending requests:', data);

            // Filter for today's requests only
            const todayRequests = data?.filter(req => {
                const reqDate = req.created_at.split('T')[0]; // Extract date part
                console.log('Request date:', reqDate, 'vs Today:', todayDateString);
                return reqDate === todayDateString;
            }) || [];

            console.log('Today requests:', todayRequests);

            if (todayRequests.length > 0) {
                const pendingReq = todayRequests[0];
                setPendingRequest(pendingReq);

                Alert.alert(
                    'Pending Order Exists',
                    'You already created a request for this shop today. You can only create one request per day.',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                            onPress: () => router.back()
                        },
                        {
                            text: 'View Request',
                            onPress: () => viewPendingRequest(pendingReq.id)
                        },
                        {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => confirmDeletePendingRequest(pendingReq.id)
                        }
                    ]
                );
            }
        } catch (err) {
            console.error('Exception in checkPendingRequest:', err);
        }
    }

    async function viewPendingRequest(requestId: string) {
        setPendingRequestItems([]); // Clear old data first
        setLoadingPendingDetails(true);
        setShowPendingModal(true);

        try {
            console.log('=== FETCHING PENDING REQUEST DETAILS ===');
            console.log('Request ID:', requestId);

            // Fetch request items
            const { data: requestItems, error: itemsError } = await supabase
                .from('request_items')
                .select('*')
                .eq('request_id', requestId);

            console.log('Request items found:', requestItems?.length || 0);
            console.log('Request items error:', itemsError);

            if (itemsError) throw itemsError;

            // Get item details
            const itemIds = [...new Set((requestItems || []).map(i => i.item_id))];
            console.log('Item IDs to fetch:', itemIds);

            const { data: items, error: itemDetailsError } = await supabase
                .from('items')
                .select('id, name')
                .in('id', itemIds as any);

            console.log('Items fetched:', items?.length || 0);
            console.log('Items error:', itemDetailsError);

            if (itemDetailsError) throw itemDetailsError;

            const itemMap = new Map(items?.map(i => [i.id, i]));

            const enrichedItems = (requestItems || []).map(ri => ({
                ...ri,
                itemName: itemMap.get(ri.item_id)?.name || 'Unknown Item'
            }));

            console.log('Enriched items:', enrichedItems);
            setPendingRequestItems(enrichedItems);
        } catch (error: any) {
            console.error('Error fetching pending request details:', error);
            Alert.alert('Error', 'Failed to load request details');
            setShowPendingModal(false);
        } finally {
            setLoadingPendingDetails(false);
        }
    }

    function confirmDeletePendingRequest(requestId: string) {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this pending request? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deletePendingRequest(requestId)
                }
            ]
        );
    }

    async function deletePendingRequest(requestId: string) {
        try {
            // First delete request_items
            const { error: itemsError } = await supabase
                .from('request_items')
                .delete()
                .eq('request_id', requestId);

            if (itemsError) {
                console.error('Error deleting request items:', itemsError);
                Alert.alert('Error', 'Failed to delete the pending request. Please try again.');
                return;
            }

            // Then delete the request itself
            const { error: requestError } = await supabase
                .from('requests')
                .delete()
                .eq('id', requestId);

            if (requestError) {
                console.error('Error deleting request:', requestError);
                Alert.alert('Error', 'Failed to delete the pending request. Please try again.');
                return;
            }

            setShowPendingModal(false);
            setPendingRequest(null);
            setPendingRequestItems([]);

            Alert.alert(
                'Success',
                'Previous pending order has been deleted. You can now create a new order.',
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            console.error('Exception deleting pending request:', error);
            Alert.alert('Error', error.message || 'Failed to delete the pending request');
        }
    }

    async function fetchItems() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('items')
                .select(`
                    *,
                    product_categories (
                        name
                    )
                `)
                .order('category_id') // Group by category
                .order('name'); // Then alphabetical

            if (error) throw error;

            if (data) {
                console.log('Fetched Items:', data.length);
                // Log first 3 items with images to debug
                const itemsWithImages = data.filter(i => i.image_url);
                console.log('Items with images:', itemsWithImages.length);
                if (itemsWithImages.length > 0) {
                    console.log('Sample Image URL:', itemsWithImages[0].image_url);
                } else {
                    console.log('No items have image_url set.');
                }

                setAllItems(data);
                organizeData(data, '');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to load items');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        organizeData(allItems, searchText);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allItems, searchText]); // Removed quantities to prevent re-sorting while typing

    const organizeData = (data: any[], filter: string) => {
        const isSearchActive = filter.length > 0;

        // Filter by search text
        let filtered = data.filter(i =>
            i.name.toLowerCase().includes(filter.toLowerCase())
        );

        const groups: { [key: string]: any[] } = {};
        const selectedItems: any[] = [];
        const unselectedItems: any[] = [];

        // If search is inactive, split into selected/unselected
        if (!isSearchActive) {
            filtered.forEach(item => {
                if ((quantities[item.id] || 0) > 0) {
                    selectedItems.push(item);
                } else {
                    unselectedItems.push(item);
                }
            });
        } else {
            // If searching, show everything in normal categories (or mixed)
            // But user specifically asked for behavior when search is CLEARED.
            // So during search, we just show matches normally.
            unselectedItems.push(...filtered);
        }

        // Group the "unselected" (or all items if searching) by category
        unselectedItems.forEach(item => {
            const catName = item.product_categories?.name || 'Uncategorized';
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push(item);
        });

        const sectionData = Object.keys(groups).map(key => ({
            title: key,
            data: groups[key]
        }));

        // Add Selected Items section at the top if distinct
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
        // organizeData called via useEffect
    };

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
        const validItems = allItems.filter(item => (quantities[item.id] || 0) > 0);

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
                    <Text style={styles.loadingText}>Loading items...</Text>
                </View>
            ) : (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    {/* Items Summary Card */}
                    {getSelectedItemsCount() > 0 && (
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryItem}>
                                <Ionicons name="cube-outline" size={20} color="#2196F3" />
                                <Text style={styles.summaryLabel}>Selected Items</Text>
                                <Text style={styles.summaryValue}>{getSelectedItemsCount()}</Text>
                            </View>
                        </View>
                    )}

                    {/* Items List */}
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        stickySectionHeadersEnabled={false}
                        extraData={quantities} // Ensure list updates when quantities change
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

                    {/* Padding for footer */}
                    <View style={{ height: 100 }} />

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
                                    <Ionicons name="cart" size={24} color="white" />
                                    <View>
                                        <Text style={styles.submitBtnText}>
                                            Submit Order
                                        </Text>
                                        {getSelectedItemsCount() > 0 && (
                                            <Text style={styles.submitBtnSubText}>
                                                {getSelectedItemsCount()} items selected
                                            </Text>
                                        )}
                                    </View>
                                    <Ionicons name="arrow-forward" size={24} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}

            {/* Pending Request Modal */}
            <Modal
                visible={showPendingModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPendingModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, maxHeight: '80%', overflow: 'hidden' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>Pending Request Details</Text>
                            <TouchableOpacity
                                onPress={() => setShowPendingModal(false)}
                                style={{ padding: 4 }}
                            >
                                <Ionicons name="close-circle" size={30} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        {loadingPendingDetails ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#2196F3" />
                                <Text style={{ marginTop: 12, fontSize: 14, color: '#64748B' }}>Loading details...</Text>
                            </View>
                        ) : (
                            <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                                <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <Ionicons name="calendar-outline" size={20} color="#64748b" />
                                        <Text style={{ fontSize: 14, color: '#64748B', marginRight: 8 }}>Created:</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                                            {pendingRequest?.created_at ? new Date(pendingRequest.created_at).toLocaleDateString() : 'N/A'}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="cube-outline" size={20} color="#64748b" />
                                        <Text style={{ fontSize: 14, color: '#64748B', marginRight: 8 }}>Total Items:</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{pendingRequestItems.length}</Text>
                                    </View>
                                </View>

                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>Items ({pendingRequestItems.length})</Text>

                                {pendingRequestItems.map((item, index) => (
                                    <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, marginBottom: 8 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' }}>{item.itemName}</Text>
                                        </View>
                                        <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                                            <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 15 }}>{item.qty}</Text>
                                        </View>
                                    </View>
                                ))}

                                <View style={{ height: 20 }} />

                                <TouchableOpacity
                                    style={{ backgroundColor: '#EF4444', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20 }}
                                    onPress={() => {
                                        setShowPendingModal(false);
                                        confirmDeletePendingRequest(pendingRequest?.id);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#fff" />
                                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Delete This Request</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
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
    summaryDivider: {
        width: 1,
        backgroundColor: '#e2e8f0',
        marginHorizontal: 16
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '85%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B'
    },
    closeButton: {
        padding: 4
    },
    modalLoading: {
        paddingVertical: 60,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalBody: {
        flex: 1
    },
    pendingInfoCard: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        gap: 12
    },
    pendingInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    pendingInfoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        flex: 1
    },
    pendingInfoValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B'
    },
    modalSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12
    },
    pendingItemCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    pendingItemInfo: {
        flex: 1
    },
    pendingItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4
    },
    pendingItemUnit: {
        fontSize: 12,
        color: '#94A3B8'
    },
    pendingQtyBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8
    },
    pendingQtyText: {
        color: '#2563EB',
        fontWeight: '700',
        fontSize: 15
    },
    deleteModalBtn: {
        backgroundColor: '#EF4444',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20
    },
    deleteModalBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    }
});
