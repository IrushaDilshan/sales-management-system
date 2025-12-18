import { useState, useEffect } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type SubItem = {
    id: number;
    pendingQty: number;
    deliveredQty: number;
};

type RequestItem = {
    id: string; // Composite Key
    itemId: number;
    itemName: string;
    qty: number;
    deliveredQty: number;
    pendingQty: number;
    availableStock: number;
    status: 'pending' | 'completed';
    requestDate: string;
    subItems: SubItem[];
};

type SectionData = {
    title: string;
    data: RequestItem[];
};

export default function ShopRequestDetails() {
    const { id } = useLocalSearchParams();
    const shopId = Array.isArray(id) ? id[0] : id;

    const [sections, setSections] = useState<SectionData[]>([]);
    const [shopName, setShopName] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [inputs, setInputs] = useState<{ [key: string]: string }>({});
    const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({});
    const router = useRouter();

    useEffect(() => {
        if (shopId) {
            fetchDetails();
        } else {
            setLoading(false);
        }
    }, [shopId, activeTab]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            // 1. Fetch Shop Name
            const { data: shopData } = await supabase.from('shops').select('name').eq('id', shopId).single();
            setShopName(shopData?.name || 'Unknown Shop');

            // 2. Fetch Requests based on Active Tab
            let query = supabase
                .from('requests')
                .select('id, date')
                .eq('shop_id', shopId)
                .order('date', { ascending: false });

            // If Pending Tab: Show only pending requests
            // If History Tab: Show everything (or just completed? Usually history implies past actions, so maybe everything is safer for context, but let's do all for history)
            if (activeTab === 'pending') {
                query = query.eq('status', 'pending');
            } else {
                // For history, maybe we want 'completed' or just everything. 
                // Let's show EVERYTHING for complete context, or just COMPLETED.
                // User asked "see deleverder/issue stock", implying what is done.
                // Let's filter for items that have > 0 delivered_qty regardless of request status.
                // But we query "requests" first. 
                // A safe bet for "History" is "completed" requests + "pending" requests that have delivered items? 
                // Simply removing the filter shows all requests. Let's limit to 50 for performance if history.
                query = query.limit(50);
            }

            const { data: requestsData, error: reqError } = await query;

            if (reqError) throw reqError;

            if (!requestsData || requestsData.length === 0) {
                setSections([]);
                return;
            }

            const requestIds = requestsData.map((r: any) => r.id);
            const requestDateMap = new Map();
            requestsData.forEach((r: any) => requestDateMap.set(r.id, r.date));

            // 3. Fetch Items
            const { data: requestItemsData, error: itemsError } = await supabase
                .from('request_items')
                .select('*')
                .in('request_id', requestIds);

            if (itemsError) throw itemsError;

            // 4. Get current user (rep) ID from users table
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            // Get the user's ID from the users table (not auth ID)
            let currentUserId = null;
            if (userEmail) {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', userEmail)
                    .single();
                currentUserId = userRecord?.id;
            }

            // 5. Products & Rep Stock
            const itemIds = Array.from(new Set(requestItemsData.map((r: any) => r.item_id)));
            const { data: productsData } = await supabase.from('items').select('id, name').in('id', itemIds);

            const itemsMap = new Map();
            const repStockMap = new Map();

            productsData?.forEach((p: any) => itemsMap.set(p.id, p.name));

            // Only fetch rep stock if we have a valid user ID
            if (currentUserId) {
                // Instead of warehouse stock, get rep's assigned stock from stock_transactions
                // Rep stock = SUM(OUT transactions for this rep) - (stock already delivered in requests)
                const { data: repTransactions } = await supabase
                    .from('stock_transactions')
                    .select('item_id, qty, type')
                    .eq('rep_id', currentUserId)
                    .in('item_id', itemIds);

                // Calculate rep's available stock per item
                repTransactions?.forEach((trans: any) => {
                    const currentStock = repStockMap.get(trans.item_id) || 0;
                    if (trans.type === 'OUT') {
                        // Stock issued to rep
                        repStockMap.set(trans.item_id, currentStock + trans.qty);
                    }
                    // Note: If rep returns stock, it would be type='RETURN' and we'd subtract
                });
            } else {
                console.warn('No user ID found, stock will show as 0');
            }

            // 5. Group by Date then Item
            const dateGroups: { [date: string]: { [itemId: number]: RequestItem } } = {};

            requestItemsData.forEach((row: any) => {
                const pending = row.qty - (row.delivered_qty || 0);

                // FILTER LOGIC
                if (activeTab === 'pending') {
                    // Show only if there is pending work
                    if (pending <= 0) return;
                } else {
                    // History: Show if delivered_qty > 0 OR if it is completed
                    // Actually, for history, user likely wants to see what was delivered.
                    // Let's show items that have ANY delivery or are completed.
                    // If row.delivered_qty == 0 and status is pending, it's not history, it's pending.
                    if ((row.delivered_qty || 0) === 0) return;
                }

                const dateStr = requestDateMap.get(row.request_id);
                if (!dateStr) return;

                const dateKey = new Date(dateStr).toLocaleDateString();
                const itemId = row.item_id;

                if (!dateGroups[dateKey]) dateGroups[dateKey] = {};

                if (!dateGroups[dateKey][itemId]) {
                    dateGroups[dateKey][itemId] = {
                        id: `${dateKey}-${itemId}`,
                        itemId: itemId,
                        itemName: itemsMap.get(itemId) || 'Unknown Item',
                        qty: 0,
                        deliveredQty: 0,
                        pendingQty: 0,
                        availableStock: repStockMap.get(itemId) || 0,
                        status: 'pending',
                        requestDate: dateStr,
                        subItems: []
                    };
                }

                const group = dateGroups[dateKey][itemId];
                group.qty += row.qty;
                group.deliveredQty += (row.delivered_qty || 0);
                group.pendingQty += pending;
                group.subItems.push({
                    id: row.id,
                    pendingQty: pending,
                    deliveredQty: row.delivered_qty || 0
                });
            });

            // Convert to Section List format
            const sectionData: SectionData[] = Object.keys(dateGroups).map(date => ({
                title: date,
                data: Object.values(dateGroups[date])
            }));

            // Sort sections by date (newest first)
            sectionData.sort((a, b) => {
                const dateA = new Date(a.data[0]?.requestDate || 0);
                const dateB = new Date(b.data[0]?.requestDate || 0);
                return dateB.getTime() - dateA.getTime();
            });

            setSections(sectionData);

        } catch (err: any) {
            console.error('Fetch Details Error:', err);
            const errorMessage = err.message || 'Unknown error occurred';

            // Check if it's a network error
            if (errorMessage.includes('Network') || errorMessage.includes('connection')) {
                Alert.alert(
                    'Connection Error',
                    'Unable to connect to the server. Please check your internet connection and try again.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Retry', onPress: () => fetchDetails() }
                    ]
                );
            } else {
                Alert.alert('Error', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeliver = async (item: RequestItem) => {
        const inputQty = inputs[item.id];
        if (!inputQty) {
            Alert.alert('Error', 'Please enter a quantity');
            return;
        }

        let qtyToDeliver = parseInt(inputQty);
        if (isNaN(qtyToDeliver) || qtyToDeliver <= 0) {
            Alert.alert('Error', 'Invalid quantity');
            return;
        }

        if (qtyToDeliver > item.pendingQty) {
            Alert.alert('Error', `Cannot deliver more than pending (${item.pendingQty})`);
            return;
        }

        if (qtyToDeliver > item.availableStock) {
            Alert.alert('Error', `Not enough stock (Available: ${item.availableStock})`);
            return;
        }

        try {
            // Distribute delivery across sub-items
            for (const subItem of item.subItems) {
                if (qtyToDeliver <= 0) break;

                const deliverForThis = Math.min(qtyToDeliver, subItem.pendingQty);
                const newDelivered = subItem.deliveredQty + deliverForThis;

                const { error } = await supabase
                    .from('request_items')
                    .update({ delivered_qty: newDelivered })
                    .eq('id', subItem.id);

                if (error) throw error;

                qtyToDeliver -= deliverForThis;
            }

            Alert.alert('Success', 'Delivery Updated');
            setInputs(prev => {
                const newState = { ...prev };
                delete newState[item.id];
                return newState;
            });
            fetchDetails();

        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const renderItem = ({ item, section }: { item: RequestItem; section: SectionData }) => {
        // Don't render if section is collapsed
        if (collapsedSections[section.title]) {
            return null;
        }

        // Determine status color based on pending quantity
        const statusColor = item.pendingQty > 50 ? '#ef4444' : item.pendingQty > 20 ? '#f59e0b' : '#10b981';

        return (
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: activeTab === 'pending' ? statusColor : '#10b981' }]}>
                <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.itemName}</Text>
                    {activeTab === 'pending' && (
                        <Text style={styles.stockText}>Stock: {item.availableStock}</Text>
                    )}
                </View>

                <View style={styles.statRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>Ordered</Text>
                        <Text style={styles.statValue}>{item.qty}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>Delivered</Text>
                        <Text style={[styles.statValue, { color: '#10b981' }]}>{item.deliveredQty}</Text>
                    </View>
                    {activeTab === 'pending' && (
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Pending</Text>
                            <Text style={[styles.statValue, { color: '#ff6b35' }]}>{item.pendingQty}</Text>
                        </View>
                    )}
                </View>

                {activeTab === 'pending' && (
                    <View style={styles.actionRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter quantity"
                            placeholderTextColor="#9ca3af"
                            keyboardType="numeric"
                            value={inputs[item.id] || ''}
                            onChangeText={(text) => setInputs(prev => ({ ...prev, [item.id]: text }))}
                        />
                        <TouchableOpacity style={styles.deliverBtn} onPress={() => handleDeliver(item)}>
                            <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 6 }} />
                            <Text style={styles.deliverBtnText}>Issue</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderSectionHeader = ({ section: { title, data } }: { section: SectionData }) => {
        const isCollapsed = collapsedSections[title];
        const isExpanded = !isCollapsed;

        // Check if this section has requests from the last 24 hours (consider as "new")
        let isNew = false;
        if (data[0]?.requestDate) {
            const sectionDate = new Date(data[0].requestDate);
            const now = new Date();

            // Only mark as new if the date is valid and within last 24 hours
            if (!isNaN(sectionDate.getTime())) {
                const hoursDiff = (now.getTime() - sectionDate.getTime()) / (1000 * 60 * 60);
                isNew = hoursDiff >= 0 && hoursDiff <= 24;

                // Debug logging
                console.log(`Section ${title}: Date=${sectionDate.toISOString()}, HoursDiff=${hoursDiff.toFixed(2)}, IsNew=${isNew}`);
            }
        }

        const toggleSection = () => {
            setCollapsedSections(prev => ({
                ...prev,
                [title]: !prev[title]
            }));
        };

        return (
            <TouchableOpacity
                style={styles.sectionHeaderContainer}
                onPress={toggleSection}
                activeOpacity={0.7}
            >
                <View style={styles.sectionHeaderContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Ionicons
                            name={isExpanded ? "chevron-down" : "chevron-forward"}
                            size={20}
                            color="#6b7280"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.sectionTitle}>{title}</Text>
                        {isNew && (
                            <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>NEW</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.itemCountBadge}>
                        <Text style={styles.itemCountText}>{data.length} {data.length === 1 ? 'item' : 'items'}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>{shopName}</Text>
                <TouchableOpacity onPress={fetchDetails} style={styles.backBtn}>
                    <Ionicons name="refresh" size={24} color="#2196F3" />
                </TouchableOpacity>
            </View>

            {/* TABS */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
            ) : (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        renderSectionHeader={renderSectionHeader}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
                        stickySectionHeadersEnabled={false}
                    />
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3
    },
    backBtn: {
        marginRight: 16,
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#f8f9fa'
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1a1a2e',
        letterSpacing: -0.5,
        flex: 1
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
        marginBottom: 4
    },
    activeTab: {
        borderBottomColor: '#2196F3'
    },
    tabText: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '600',
        letterSpacing: 0.2
    },
    activeTabText: {
        color: '#2196F3',
        fontWeight: '800'
    },
    list: {
        padding: 20,
        paddingBottom: 40
    },
    sectionHeaderContainer: {
        marginBottom: 12,
        marginTop: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    sectionHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    sectionHeader: {
        marginBottom: 12,
        marginTop: 16
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
        letterSpacing: -0.2
    },
    newBadge: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 10
    },
    newBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    itemCountBadge: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8
    },
    itemCountText: {
        color: '#6b7280',
        fontSize: 13,
        fontWeight: '600'
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        overflow: 'hidden'
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        alignItems: 'flex-start'
    },
    itemName: {
        fontSize: 19,
        fontWeight: '700',
        color: '#1a1a2e',
        letterSpacing: -0.3,
        flex: 1,
        lineHeight: 24
    },
    stockText: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '800',
        backgroundColor: '#d1fae5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        overflow: 'hidden',
        letterSpacing: 0.3
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 18,
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },
    stat: {
        alignItems: 'center',
        flex: 1
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 6,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1a1a2e',
        letterSpacing: -0.5
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4
    },
    input: {
        flex: 1,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 17,
        backgroundColor: '#fff',
        fontWeight: '600',
        color: '#1a1a2e',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1
    },
    deliverBtn: {
        backgroundColor: '#2196F3',
        borderRadius: 14,
        paddingHorizontal: 28,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        minWidth: 100
    },
    deliverBtnText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 16,
        letterSpacing: 0.5
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 60,
        color: '#9ca3af',
        fontSize: 16,
        fontWeight: '600'
    }
});
