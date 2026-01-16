import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StockItem = {
    id: number;
    name: string;
    qty: number;
};

export default function ReturnHQScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<{ [key: number]: number }>({});
    const [submitting, setSubmitting] = useState(false);
    const [currentRepId, setCurrentRepId] = useState<string | null>(null);

    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            let repId = null;
            if (userEmail) {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', userEmail)
                    .single();
                repId = userRecord?.id;
                setCurrentRepId(repId);
            }

            if (!repId) return;

            // 1. Fetch Item Definitions
            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('id, name')
                .order('name');

            if (itemsError) throw itemsError;

            // 2. Fetch Rep's Stock (Today's Floating Stock)
            const repStockMap = new Map();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const { data: repTransactions, error: stockError } = await supabase
                .from('stock_transactions')
                .select('item_id, qty, type')
                .eq('rep_id', repId)
                .gte('created_at', todayISO);

            if (stockError && stockError.code !== 'PGRST116') throw stockError;

            repTransactions?.forEach((trans: any) => {
                const currentStock = repStockMap.get(trans.item_id) || 0;
                if (trans.type === 'OUT' || trans.type === 'RETURN_IN') {
                    repStockMap.set(trans.item_id, currentStock + trans.qty);
                } else if (['SALE', 'RETURN', 'TRANSFER_OUT', 'RETURN_TO_HQ'].includes(trans.type)) {
                    repStockMap.set(trans.item_id, currentStock - trans.qty);
                }
            });

            // 3. Merge
            const merged: StockItem[] = (itemsData || [])
                .map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    qty: repStockMap.get(item.id) || 0
                }))
                .filter(item => item.qty > 0);

            setItems(merged);

        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleQtyChange = (itemId: number, text: string) => {
        const qty = parseInt(text);
        if (isNaN(qty) || qty < 0) {
            const newSelected = { ...selectedItems };
            delete newSelected[itemId];
            setSelectedItems(newSelected);
        } else {
            setSelectedItems({ ...selectedItems, [itemId]: qty });
        }
    };

    const handleSubmit = async () => {
        if (!currentRepId) {
            Alert.alert('Error', 'Rep ID not found');
            return;
        }

        const itemsToReturn = Object.entries(selectedItems)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => ({ id: parseInt(id), qty }));

        if (itemsToReturn.length === 0) {
            Alert.alert('Error', 'Please select at least one item to return');
            return;
        }

        setSubmitting(true);
        try {
            for (const tItem of itemsToReturn) {
                const { error } = await supabase.rpc('return_rep_to_storekeeper', {
                    p_rep_id: currentRepId,
                    p_product_id: tItem.id,
                    p_quantity: tItem.qty,
                    p_notes: 'Rep Return to HQ'
                });

                if (error) throw error;
            }

            Alert.alert('Success', 'Stock returned to storekeeper successfully', [
                { text: 'OK', onPress: () => router.push('/rep/(tabs)/stock') }
            ]);

        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const renderItem = ({ item }: { item: StockItem }) => {
        const returnQty = selectedItems[item.id] || 0;

        return (
            <View style={styles.card}>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.stockText}>Available: {item.qty}</Text>
                </View>

                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => {
                            const newQty = Math.max(0, returnQty - 1);
                            handleQtyChange(item.id, newQty.toString());
                        }}
                    >
                        <Ionicons name="remove" size={20} color="#EF4444" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={returnQty > 0 ? returnQty.toString() : ''}
                        placeholder="0"
                        onChangeText={(text) => handleQtyChange(item.id, text)}
                    />

                    <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => {
                            const newQty = Math.min(item.qty, returnQty + 1);
                            handleQtyChange(item.id, newQty.toString());
                        }}
                    >
                        <Ionicons name="add" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Return to Storekeeper</Text>
                    <Text style={styles.subtitle}>End of Day / Damaged</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#EF4444" />
                </View>
            ) : (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <FlatList
                        data={items}
                        keyExtractor={item => item.id.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}>
                                    <Ionicons name="cube-outline" size={48} color="#94A3B8" />
                                </View>
                                <Text style={styles.emptyTitle}>No Stock Available</Text>
                                <Text style={styles.emptyText}>
                                    You don't have any floating stock to return right now.
                                    Items issued to you will appear here.
                                </Text>
                            </View>
                        }
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.submitText}>Confirm Return</Text>
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
        backgroundColor: '#F8FAFC',
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
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center'
    },
    list: {
        padding: 20,
        paddingBottom: 100
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4
    },
    stockText: {
        fontSize: 12,
        color: '#64748B'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    qtyBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center'
    },
    input: {
        width: 50,
        height: 32,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        textAlign: 'center',
        fontSize: 14,
        color: '#0F172A',
        fontWeight: '600'
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60
    },
    footer: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0'
    },
    submitBtn: {
        backgroundColor: '#EF4444',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    submitText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8
    },
    emptyText: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22
    }
});
