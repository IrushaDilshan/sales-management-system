import { useState, useEffect } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
    const [inputs, setInputs] = useState<{ [key: string]: string }>({});
    const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({});
    const [userId, setUserId] = useState<string | null>(null);

    // Tabs & Data Splitting
    const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
    const [sectionData, setSectionData] = useState<SectionData[]>([]); // Current displayed data
    const [requestData, setRequestData] = useState<SectionData[]>([]);
    const [historyData, setHistoryData] = useState<SectionData[]>([]);

    const router = useRouter();

    useEffect(() => {
        // Switch displayed data when tab changes
        if (activeTab === 'request') {
            setSectionData(requestData);
            // Expand first request section
            if (requestData.length > 0) {
                setCollapsedSections({ [requestData[0].title]: false });
            }
        } else {
            setSectionData(historyData);
            // Expand first history section
            if (historyData.length > 0) {
                setCollapsedSections({ [historyData[0].title]: false });
            }
        }
    }, [activeTab, requestData, historyData]);

    useEffect(() => {
        if (shopId) {
            fetchDetails();
        } else {
            setLoading(false);
        }
    }, [shopId]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            // Get current user from session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session?.user) {
                console.error('Session error:', sessionError);
                Alert.alert('Error', 'Please log in again');
                router.replace('/login');
                return;
            }

            const currentUserId = session.user.id;
            console.log('Fetching details for user:', currentUserId);

            // 1. Fetch Shop and verify it's assigned to this rep
            const { data: shopData, error: shopError } = await supabase
                .from('shops')
                .select('id, name, rep_id, route_id')
                .eq('id', shopId)
                .single();

            if (shopError) throw shopError;

            setShopName(shopData?.name || 'Unknown Shop');

            // Security check: Verify this shop is assigned to the current rep
            // Get rep's routes first
            const { data: myRoutes } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', currentUserId);

            const myRouteIds = myRoutes?.map(r => r.id) || [];

            // Check if shop is assigned to this rep (directly or through route)
            const isDirectlyAssigned = shopData?.rep_id === currentUserId;
            const isAssignedThroughRoute = myRouteIds.includes(shopData?.route_id);

            if (!isDirectlyAssigned && !isAssignedThroughRoute) {
                Alert.alert(
                    'Access Denied',
                    'This shop is not assigned to you. You can only view requests for shops in your assigned routes.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
                setSections([]);
                return;
            }

            // 2. Fetch Requests (Show all recent)
            let query = supabase
                .from('requests')
                .select('id, date')
                .eq('shop_id', shopId)
                .order('date', { ascending: false })
                .limit(50);

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

            // 4. Products & Rep Stock
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
                    } else if (trans.type === 'SALE' || trans.type === 'RETURN') {
                        // Stock leaving rep (Sold or Returned)
                        repStockMap.set(trans.item_id, currentStock - trans.qty);
                    }
                });
                setUserId(currentUserId);
            } else {
                console.warn('No user ID found, stock will show as 0');
            }


            // 5. Group by Date then Item (Separate Pending vs History)
            const pendingGroups: { [date: string]: { [itemId: number]: RequestItem } } = {};
            const historyGroups: { [date: string]: { [itemId: number]: RequestItem } } = {};

            requestItemsData.forEach((row: any) => {
                const pending = row.qty - (row.delivered_qty || 0);
                const delivered = row.delivered_qty || 0;

                const dateStr = requestDateMap.get(row.request_id);
                if (!dateStr) return;

                const dateKey = new Date(dateStr).toLocaleDateString();
                const itemId = row.item_id;

                const createItem = () => ({
                    id: `${dateKey}-${itemId}`,
                    itemId: itemId,
                    itemName: itemsMap.get(itemId) || 'Unknown Item',
                    qty: 0,
                    deliveredQty: 0,
                    pendingQty: 0,
                    availableStock: repStockMap.get(itemId) || 0,
                    status: 'pending' as const,
                    requestDate: dateStr,
                    subItems: []
                });

                // Add to Pending ONLY if NO delivery has been made yet
                if (delivered === 0) {
                    if (!pendingGroups[dateKey]) pendingGroups[dateKey] = {};
                    if (!pendingGroups[dateKey][itemId]) pendingGroups[dateKey][itemId] = createItem();

                    const group = pendingGroups[dateKey][itemId];
                    group.qty += row.qty;
                    group.deliveredQty += delivered;
                    group.pendingQty += pending;
                    group.subItems.push({ id: row.id, pendingQty: pending, deliveredQty: delivered });
                }

                // Add to History if delivered > 0
                if (delivered > 0) {
                    if (!historyGroups[dateKey]) historyGroups[dateKey] = {};
                    if (!historyGroups[dateKey][itemId]) historyGroups[dateKey][itemId] = createItem();

                    const group = historyGroups[dateKey][itemId];
                    group.qty += row.qty;
                    group.deliveredQty += delivered;
                    group.pendingQty += pending;
                    // SubItems aren't critical for history display but good for integrity
                    group.subItems.push({ id: row.id, pendingQty: pending, deliveredQty: delivered });
                }
            });

            // Helper to convert groups to sorted array
            const processGroups = (groups: any) => {
                const arr = Object.keys(groups).map(date => ({
                    title: date,
                    data: Object.values(groups[date]) as RequestItem[]
                }));
                return arr.sort((a, b) => {
                    const dateA = new Date(a.data[0]?.requestDate || 0);
                    const dateB = new Date(b.data[0]?.requestDate || 0);
                    return dateB.getTime() - dateA.getTime();
                });
            };

            const finalRequest = processGroups(pendingGroups);
            const finalHistory = processGroups(historyGroups);

            setRequestData(finalRequest);
            setHistoryData(finalHistory);

            // Initial set based on current tab
            const initialData = activeTab === 'request' ? finalRequest : finalHistory;
            setSectionData(initialData);

            // Expand first section of current tab
            if (initialData.length > 0) {
                const firstTitle = initialData[0].title;
                setCollapsedSections({ [firstTitle]: false })
            }

        } catch (err: any) {
            console.error('Fetch Details Error:', err);

            // Suppress harmless errors
            if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                console.log('Request was aborted (component unmounted or navigated away)');
                return;
            }

            if (err.message?.includes('Network request failed')) {
                console.log('Network connection issue, will retry on next refresh');
                return;
            }

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
        // Default to collapsed (true) if not explicitly set to false (expanded)
        // Exception: logic in fetchDetails sets the first one to false.
        // If state is empty (undefined), we treat as collapsed.
        const isCollapsed = collapsedSections[section.title] !== false;

        if (isCollapsed) {
            return null;
        }


        const isPending = item.pendingQty > 0;
        const isHistoryView = activeTab === 'history';

        return (
            <View style={styles.itemRow}>
                <View style={styles.itemMain}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>
                    <View style={styles.metaRow}>
                        {/* Different badges for History vs Pending */}
                        {!isHistoryView ? (
                            <>
                                <View style={styles.badgeContainer}>
                                    <Text style={styles.badgeLabel}>Ordered</Text>
                                    <Text style={styles.badgeValue}>{item.qty}</Text>
                                </View>
                                <View style={styles.badgeContainer}>
                                    <Text style={[styles.badgeLabel, { color: item.availableStock > 0 ? '#059669' : '#DC2626' }]}>Stock</Text>
                                    <Text style={[styles.badgeValue, { color: item.availableStock > 0 ? '#059669' : '#DC2626' }]}>{item.availableStock}</Text>
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={[styles.badgeContainer, { borderColor: '#10B981', backgroundColor: '#ECFDF5' }]}>
                                    <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                                    <Text style={[styles.badgeLabel, { color: '#047857' }]}>Issued</Text>
                                    <Text style={[styles.badgeValue, { color: '#047857' }]}>{item.deliveredQty}</Text>
                                </View>
                                <View style={styles.badgeContainer}>
                                    <Text style={styles.badgeLabel}>Total Order</Text>
                                    <Text style={styles.badgeValue}>{item.qty}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Only show actions in Pending View */}
                {!isHistoryView && isPending && (
                    <View style={styles.actionContainer}>
                        <TextInput
                            style={styles.compactInput}
                            placeholder="Qty"
                            placeholderTextColor="#ccc"
                            keyboardType="numeric"
                            value={inputs[item.id] || ''}
                            onChangeText={(text) => setInputs(prev => ({ ...prev, [item.id]: text }))}
                        />
                        <TouchableOpacity style={styles.iconButton} onPress={() => handleDeliver(item)}>
                            <Ionicons name="arrow-forward" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderSectionHeader = ({ section: { title, data } }: { section: SectionData }) => {
        // Default to collapsed (true) unless explicitly false
        const isCollapsed = collapsedSections[title] !== false;

        // Date Logic
        let displayDate = title;
        let relativeLabel = null;
        let isNew = false;

        if (data[0]?.requestDate) {
            const date = new Date(data[0].requestDate);
            const now = new Date();

            if (!isNaN(date.getTime())) {
                // Check if New (last 24h)
                const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
                isNew = hoursDiff >= 0 && hoursDiff <= 24;

                // Format friendly date
                displayDate = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                }); // e.g. "Fri, Dec 20"

                // Relative check
                if (now.toDateString() === date.toDateString()) {
                    relativeLabel = "Today";
                } else {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (yesterday.toDateString() === date.toDateString()) {
                        relativeLabel = "Yesterday";
                    }
                }
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
                activeOpacity={0.7}
                onPress={toggleSection}
                style={styles.sectionHeaderContainer}
            >
                <View style={styles.dateGroup}>
                    <View style={[styles.iconBox, !isCollapsed && styles.iconBoxActive]}>
                        <Ionicons
                            name={isCollapsed ? "chevron-forward" : "chevron-down"}
                            size={16}
                            color={isCollapsed ? "#6B7280" : "#6366F1"}
                        />
                    </View>
                    <View style={styles.dateContent}>
                        {relativeLabel && (
                            <Text style={styles.relativeDateText}>{relativeLabel}</Text>
                        )}
                        <Text style={[styles.mainDateText, !relativeLabel && styles.mainDateOnly]}>
                            {displayDate}
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {isNew && (
                        <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                    )}
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{data.length}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Modern Gradient Header */}
            <LinearGradient
                colors={['#6366F1', '#8B5CF6', '#D946EF']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative circles */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />

                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.shopLabel}>Shop</Text>
                        <Text style={styles.title} numberOfLines={1}>{shopName}</Text>
                    </View>
                    <TouchableOpacity onPress={fetchDetails} style={styles.refreshBtn}>
                        <Ionicons name="refresh" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Premium Segmented Control with Icons */}
            <View style={styles.segmentedControl}>
                <TouchableOpacity
                    style={[styles.segmentBtn, activeTab === 'request' && styles.segmentBtnActive]}
                    onPress={() => setActiveTab('request')}
                >
                    <Ionicons
                        name="list-outline"
                        size={18}
                        color={activeTab === 'request' ? '#6366F1' : '#6B7280'}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.segmentText, activeTab === 'request' && styles.segmentTextActive]}>Request</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segmentBtn, activeTab === 'history' && styles.segmentBtnActive]}
                    onPress={() => setActiveTab('history')}
                >
                    <Ionicons
                        name="checkmark-done-outline"
                        size={18}
                        color={activeTab === 'history' ? '#6366F1' : '#6B7280'}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.segmentText, activeTab === 'history' && styles.segmentTextActive]}>History</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
            ) : (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <SectionList
                        sections={sectionData}
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
        backgroundColor: '#F8FAFC'
    },
    header: {
        paddingTop: 50,
        paddingBottom: 24,
        paddingHorizontal: 20,
        overflow: 'hidden',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        top: -50,
        right: -40
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        bottom: -20,
        left: -20
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        zIndex: 1
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center'
    },
    shopLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 2
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    refreshBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 6,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center'
    },
    segmentBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3
    },
    segmentText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280'
    },
    segmentTextActive: {
        color: '#6366F1',
        fontWeight: '800'
    },

    list: {
        padding: 20,
        paddingBottom: 50
    },

    // Modern Item Row
    itemRow: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // Premium Shadow
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)'
    },
    itemMain: {
        flex: 1,
        marginRight: 16,
        justifyContent: 'center'
    },
    itemName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        letterSpacing: -0.3
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6'
    },
    badgeLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
        marginRight: 4,
        textTransform: 'uppercase'
    },
    badgeValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#111827'
    },
    verticalDivider: {
        display: 'none' // Remove divider for cleaner look
    },

    // Action Area behind Input
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    compactInput: {
        width: 60,
        height: 44,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },

    // Modern Section Headers
    sectionHeaderContainer: {
        marginBottom: 16,
        marginTop: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8
    },
    dateGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    iconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconBoxActive: {
        backgroundColor: '#EEF2FF'
    },
    dateContent: {
        justifyContent: 'center'
    },
    relativeDateText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6366F1',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2
    },
    mainDateText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937'
    },
    mainDateOnly: {
        fontSize: 15,
        color: '#4B5563'
    },
    newBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    newBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    countBadge: {
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        minWidth: 28,
        alignItems: 'center'
    },
    countText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4B5563'
    },
    itemCountBadge: {
        display: 'none'
    },
    itemCountText: {
        display: 'none'
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 80,
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: '500'
    }
});
