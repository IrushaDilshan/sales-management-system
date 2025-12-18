import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function InventoryScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .order('name');

            if (error) throw error;

            // Fetch Stock Levels directly
            const { data: stockData, error: stockError } = await supabase
                .from('stock')
                .select('*');

            if (stockError && stockError.code !== 'PGRST116') throw stockError;

            const mergedItems = (data || []).map(item => {
                const stockEntry = (stockData || []).find((s: any) => s.item_id === item.id);
                const currentQty = stockEntry ? stockEntry.qty : 0;

                let status = 'OK';
                if (currentQty === 0) status = 'OUT';
                else if (currentQty < (item.minimum_level || 5)) status = 'LOW';

                return {
                    ...item,
                    qty: currentQty,
                    status
                };
            });

            setItems(mergedItems);

        } catch (error) {
            console.error('Error fetching inventory:', error);
            Alert.alert('Error', 'Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OUT': return '#ef5350';
            case 'LOW': return '#ffa726';
            default: return '#66bb6a';
        }
    };

    const handleAction = (type: 'ADD' | 'ISSUE' | 'RETURN', item: any) => {
        router.push({
            pathname: '/storekeeper/action',
            params: { type, itemId: item.id, itemName: item.name, currentQty: item.qty }
        });
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.itemDetails}>
                <Text style={styles.stockText}>Stock: <Text style={styles.bold}>{item.qty}</Text></Text>
                <Text style={styles.minText}>Min: {item.minimum_level || 5}</Text>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.btn, styles.btnOutline]}
                    onPress={() => router.push({ pathname: '/storekeeper/history', params: { itemId: item.id, itemName: item.name } })}
                >
                    <Text style={styles.btnTextOutline}>History</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, styles.btnAdd]} onPress={() => handleAction('ADD', item)}>
                    <Text style={styles.btnTextWhite}>Add</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, styles.btnIssue]} onPress={() => handleAction('ISSUE', item)}>
                    <Text style={styles.btnTextWhite}>Issue</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, styles.btnReturn]} onPress={() => handleAction('RETURN', item)}>
                    <Text style={styles.btnTextWhite}>Return</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <IconSymbol name="magnifyingglass" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search items..."
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.light.tint} />
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshing={loading}
                    onRefresh={fetchData}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 10,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    listContent: {
        padding: 10,
        paddingBottom: 40,
    },
    itemCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    itemName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    itemDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    stockText: {
        fontSize: 16,
        color: '#555',
    },
    minText: {
        fontSize: 14,
        color: '#999',
    },
    bold: {
        fontWeight: 'bold',
        color: '#000',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    btn: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    btnOutline: {
        borderWidth: 1,
        borderColor: '#999',
        backgroundColor: 'transparent',
    },
    btnAdd: {
        backgroundColor: '#66bb6a', // Green
    },
    btnIssue: {
        backgroundColor: '#42a5f5', // Blue
    },
    btnReturn: {
        backgroundColor: '#ffa726', // Orange
    },
    btnTextWhite: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    btnTextOutline: {
        color: '#666',
        fontSize: 12,
        fontWeight: '600',
    },
});
