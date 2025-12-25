import { useState, useEffect } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, AppState } from 'react-native';
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

        // Auto-refresh when app comes to foreground
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active' && shopId) {
                fetchDetails();
            }
        });

        return () => {
            subscription?.remove();
        };
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
                // Calculate start of today (00:00:00) - Daily Stock Reset
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayISO = today.toISOString();

                // Only get TODAY's stock transactions (auto-resets at midnight)
                const { data: repTransactions } = await supabase
                    .from('stock_transactions')
                    .select('item_id, qty, type, created_at')
                    .eq('rep_id', currentUserId)
                    .in('item_id', itemIds)
                    .gte('created_at', todayISO); // Filter: created_at >= today 00:00

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
            <View style={styles.sectionHeaderWrapper}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={toggleSection}
                    style={styles.sectionHeaderContainer}
                >
                    <LinearGradient
                        colors={!isCollapsed ? ['#7C3AED08', '#EC489908'] : ['#F9FAFB', '#F3F4F6']}
                        style={styles.sectionGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.dateGroup}>
                            <View style={[styles.iconBox, !isCollapsed && styles.iconBoxActive]}>
                                <Ionicons
                                    name={isCollapsed ? "chevron-forward" : "chevron-down"}
                                    size={16}
                                    color={isCollapsed ? "#6B7280" : "#7C3AED"}
                                />
                            </View>
                            <View style={styles.dateContent}>
                                {relativeLabel && (
                                    <View style={styles.relativeLabelContainer}>
                                        <View style={styles.relativeDot} />
                                        <Text style={styles.relativeDateText}>{relativeLabel}</Text>
                                    </View>
                                )}
                                <Text style={[styles.mainDateText, !relativeLabel && styles.mainDateOnly]}>
                                    {displayDate}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.badgesRow}>
                            {isNew && (
                                <View style={styles.newBadge}>
                                    <Ionicons name="sparkles" size={10} color="#FFF" style={{ marginRight: 3 }} />
                                    <Text style={styles.newBadgeText}>NEW</Text>
                                </View>
                            )}
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{data.length}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Premium Gradient Header */}
            <LinearGradient
                colors={['#7C3AED', '#A78BFA', '#EC4899', '#F472B6']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative circles */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />

                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.shopLabel}>SHOP</Text>
                        <Text style={styles.title} numberOfLines={1}>{shopName}</Text>
                    </View>
                    <View style={styles.backBtn} />
                </View>
            </LinearGradient>

            {/* Premium Segmented Control */}
            <View style={styles.segmentedControl}>
                <TouchableOpacity
                    style={[styles.segmentBtn, activeTab === 'request' && styles.segmentBtnActive]}
                    onPress={() => setActiveTab('request')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="list"
                        size={16}
                        color={activeTab === 'request' ? '#7C3AED' : '#6B7280'}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.segmentText, activeTab === 'request' && styles.segmentTextActive]}>Request</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segmentBtn, activeTab === 'history' && styles.segmentBtnActive]}
                    onPress={() => setActiveTab('history')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="checkmark-done"
                        size={16}
                        color={activeTab === 'history' ? '#7C3AED' : '#6B7280'}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.segmentText, activeTab === 'history' && styles.segmentTextActive]}>History</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <LinearGradient
                        colors={['#7C3AED20', '#EC489920']}
                        style={styles.loadingCircle}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <ActivityIndicator size="large" color="#7C3AED" />
                    </LinearGradient>
                    <Text style={styles.loadingText}>Loading requests...</Text>
                </View>
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
        paddingBottom: 20,
        paddingHorizontal: 20,
        overflow: 'hidden',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12
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
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 2
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
        marginHorizontal: 20,
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center'
    },
    segmentBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280'
    },
    segmentTextActive: {
        color: '#7C3AED',
        fontWeight: '800'
    },

    list: {
        padding: 16,
        paddingBottom: 50
    },

    // Compact Modern Item Row
    itemRow: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)'
    },
    itemMain: {
        flex: 1,
        marginRight: 12,
        justifyContent: 'center'
    },
    itemName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 6,
        letterSpacing: -0.2
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8
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
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '600',
        marginRight: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.3
    },
    badgeValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#111827'
    },
    verticalDivider: {
        display: 'none' // Remove divider for cleaner look
    },

    // Compact Action Area
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    compactInput: {
        width: 56,
        height: 40,
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '700',
        color: '#111827'
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#7C3AED',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3
    },

    // Premium Section Headers
    sectionHeaderWrapper: {
        marginBottom: 12,
        marginTop: 20
    },
    sectionHeaderContainer: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    sectionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.04)'
    },
    dateGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    iconBoxActive: {
        backgroundColor: '#EDE9FE',
        shadowColor: '#7C3AED',
        shadowOpacity: 0.15
    },
    dateContent: {
        justifyContent: 'center',
        flex: 1
    },
    relativeLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 3
    },
    relativeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#7C3AED'
    },
    relativeDateText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#7C3AED',
        textTransform: 'uppercase',
        letterSpacing: 0.8
    },
    mainDateText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        letterSpacing: -0.2
    },
    mainDateOnly: {
        fontSize: 15,
        color: '#4B5563'
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    newBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2
    },
    newBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.8
    },
    countBadge: {
        backgroundColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        minWidth: 32,
        alignItems: 'center'
    },
    countText: {
        fontSize: 13,
        fontWeight: '800',
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
        fontSize: 15,
        fontWeight: '500'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
        gap: 24
    },
    loadingCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600',
        letterSpacing: 0.2
    }
});
