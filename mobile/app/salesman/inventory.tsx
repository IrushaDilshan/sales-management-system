import { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function SalesmanInventoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [shopName, setShopName] = useState<string>('');
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        fetchInventory();
    }, []);

    async function fetchInventory() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/login');
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
                    setShopName(firstShop.name);
                }
            } else {
                setShopName((userData?.shops as any).name);
            }

            let stockData, stockError;

            try {
                const res = await supabase
                    .from('stock')
                    .select('item_id, qty')
                    .eq('outlet_id', myShopId);
                stockData = res.data;
                stockError = res.error;
            } catch (e) { }

            if (stockError || !stockData) {
                const res = await supabase.from('stock').select('item_id, qty');
                stockData = res.data;
                stockError = res.error;
            }

            if (stockError) throw stockError;

            if (stockData && stockData.length > 0) {
                const itemIds = stockData.map((s: any) => s.item_id);
                const { data: itemsData, error: itemsError } = await supabase
                    .from('items')
                    .select('id, name, unit_of_measure, retail_price, sku')
                    .in('id', itemIds);

                if (itemsError) throw itemsError;

                const inventoryList = stockData.map((s: any) => {
                    const itemDetail = itemsData?.find((i: any) => i.id === s.item_id);
                    if (!itemDetail) return null;

                    return {
                        id: s.item_id,
                        name: itemDetail.name,
                        unit: itemDetail.unit_of_measure || 'units',
                        price: itemDetail.retail_price,
                        sku: itemDetail.sku || '-',
                        qty: s.qty,
                        status: s.qty > 10 ? 'In Stock' : (s.qty > 0 ? 'Low Stock' : 'Out of Stock')
                    };
                }).filter(Boolean)
                    .sort((a: any, b: any) => a.name.localeCompare(b.name));

                setItems(inventoryList);
            } else {
                setItems([]);
            }

        } catch (error: any) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

            {/* Blue Gradient Header */}
            <LinearGradient
                colors={['#0EA5E9', '#2563EB', '#1e1b4b']} // Cyan to Navy Gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>My Inventory</Text>
                    <Text style={styles.headerSubtitle}>{shopName}</Text>
                </View>
            </LinearGradient>

            {/* Search Bar (Floating) */}
            <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#9E9E9E" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search items..."
                        placeholderTextColor="#9E9E9E"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00796B" />
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cube-outline" size={64} color="#E0E0E0" />
                            <Text style={styles.emptyText}>No items found</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            {/* Accent Bar - Updated Colors */}
                            <View style={[styles.accentBar,
                            item.status === 'Low Stock' ? { backgroundColor: '#F59E0B' } :
                                item.status === 'Out of Stock' ? { backgroundColor: '#EF4444' } :
                                    { backgroundColor: '#009688' } // Teal accent for stock
                            ]} />

                            <View style={styles.cardContent}>
                                {/* Row 1: Name + Badge */}
                                <View style={styles.cardHeader}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <View style={[styles.statusBadge,
                                    item.status === 'In Stock' ? { backgroundColor: '#E0F2F1' } : // Light teal bg
                                        item.status === 'Low Stock' ? { backgroundColor: '#FFFBEB' } :
                                            { backgroundColor: '#FEF2F2' }
                                    ]}>
                                        <Text style={[styles.statusText,
                                        item.status === 'In Stock' ? { color: '#00796B' } : // Teal text
                                            item.status === 'Low Stock' ? { color: '#F59E0B' } :
                                                { color: '#EF4444' }
                                        ]}>{item.status}</Text>
                                    </View>
                                </View>

                                {/* Divider */}
                                <View style={styles.divider} />

                                {/* Row 2: Metrics */}
                                <View style={styles.metricsRow}>
                                    <View style={styles.metricItem}>
                                        <Text style={styles.metricLabel}>STOCK</Text>
                                        <Text style={styles.metricValue}>{item.qty} <Text style={styles.metricUnit}>{item.unit}</Text></Text>
                                    </View>
                                    <View style={styles.metricItem}>
                                        <Text style={styles.metricLabel}>PRICE</Text>
                                        <Text style={styles.metricValue}>Rs.{item.price ? item.price.toFixed(2) : '0.00'}</Text>
                                    </View>
                                    <View style={[styles.metricItem, { alignItems: 'flex-end' }]}>
                                        <Text style={styles.metricLabel}>SKU</Text>
                                        <Text style={styles.metricValue}>{item.sku}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                />
            )}

            {/* Floating Action Button - Gradient Style */}
            <TouchableOpacity
                activeOpacity={0.8}
                style={styles.floatingBtnWrapper}
                onPress={() => router.push('/salesman/submit-sale')}
            >
                <LinearGradient
                    colors={['#0EA5E9', '#2563EB', '#1e1b4b']} // The exact gradient requested
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.floatingBtn}
                >
                    <Text style={styles.btnText}>Done</Text>
                </LinearGradient>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 1
    },
    headerTop: {
        marginBottom: 10
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        alignItems: 'center',
        marginBottom: 10
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500'
    },
    searchWrapper: {
        marginTop: -25,
        paddingHorizontal: 20,
        marginBottom: 10,
        zIndex: 2
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        paddingHorizontal: 16,
        height: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        gap: 10
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#212121'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50
    },
    list: {
        padding: 20,
        paddingTop: 10,
        paddingBottom: 100 // Space for floating button
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60
    },
    emptyText: {
        color: '#BDBDBD',
        marginTop: 16,
        fontSize: 16
    },
    // Card Styles
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    accentBar: {
        width: 6,
        backgroundColor: '#009688'
    },
    cardContent: {
        flex: 1,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#263238',
        flex: 1,
        marginRight: 10
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#E0F2F1'
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#00796B'
    },
    divider: {
        height: 1,
        backgroundColor: '#F5F5F5',
        marginBottom: 12
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    metricItem: {
        flex: 1
    },
    metricLabel: {
        fontSize: 10,
        color: '#90A4AE',
        fontWeight: '700',
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#37474F'
    },
    metricUnit: {
        fontSize: 12,
        fontWeight: '400',
        color: '#607D8B'
    },
    // Floating Button
    floatingBtnWrapper: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    floatingBtn: {
        height: 56,
        borderRadius: 28, // Fully rounded
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.5
    }
});
