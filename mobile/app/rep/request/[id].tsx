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

            // 4. Products & Stock
            const itemIds = Array.from(new Set(requestItemsData.map((r: any) => r.item_id)));
            const { data: productsData } = await supabase.from('items').select('id, name').in('id', itemIds);
            const { data: stockData } = await supabase.from('stock').select('item_id, qty').in('item_id', itemIds);

            const itemsMap = new Map();
            const stockMap = new Map();
            productsData?.forEach((p: any) => itemsMap.set(p.id, p.name));
            stockData?.forEach((s: any) => stockMap.set(s.item_id, s.qty));

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
                        availableStock: stockMap.get(itemId) || 0,
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

            setSections(sectionData);

        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err.message);
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

    const renderItem = ({ item }: { item: RequestItem }) => (
        <View style={styles.card}>
            <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                {activeTab === 'pending' && (
                    <Text style={styles.stockText}>In Stock: {item.availableStock}</Text>
                )}
            </View>

            <View style={styles.statRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Ordered</Text>
                    <Text style={styles.statValue}>{item.qty}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Delivered</Text>
                    <Text style={[styles.statValue, { color: 'green' }]}>{item.deliveredQty}</Text>
                </View>
                {activeTab === 'pending' && (
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>Pending</Text>
                        <Text style={[styles.statValue, { color: '#e65100' }]}>{item.pendingQty}</Text>
                    </View>
                )}
            </View>

            {activeTab === 'pending' && (
                <View style={styles.actionRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Qty"
                        keyboardType="numeric"
                        value={inputs[item.id] || ''}
                        onChangeText={(text) => setInputs(prev => ({ ...prev, [item.id]: text }))}
                    />
                    <TouchableOpacity style={styles.deliverBtn} onPress={() => handleDeliver(item)}>
                        <Text style={styles.deliverBtnText}>Issue</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderSectionHeader = ({ section: { title } }: { section: SectionData }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>{shopName}</Text>
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
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
    backBtn: { marginRight: 16 },
    title: { fontSize: 20, fontWeight: 'bold' },
    tabs: { flexDirection: 'row', backgroundColor: 'white', padding: 8 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#2196F3' },
    tabText: { fontSize: 16, color: '#666', fontWeight: '500' },
    activeTabText: { color: '#2196F3', fontWeight: 'bold' },
    list: { padding: 16, paddingBottom: 40 },
    sectionHeader: { marginBottom: 10, marginTop: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#666', backgroundColor: '#e0e0e0', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, alignSelf: 'flex-start' },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    itemName: { fontSize: 18, fontWeight: '600', color: '#333' },
    stockText: { fontSize: 14, color: 'green', fontWeight: 'bold' },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8 },
    stat: { alignItems: 'center' },
    statLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
    statValue: { fontSize: 16, fontWeight: '700', color: '#333' },
    actionRow: { flexDirection: 'row', gap: 10 },
    input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, backgroundColor: '#fff' },
    deliverBtn: { backgroundColor: '#2196F3', borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
    deliverBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 16 }
});
