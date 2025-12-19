import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function InventoryScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');

    // Refresh inventory when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    useEffect(() => {
        fetchData();
    }, []);

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

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OUT': return '#F44336';
            case 'LOW': return '#FF9800';
            default: return '#4CAF50';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OUT': return 'close-circle';
            case 'LOW': return 'warning';
            default: return 'checkmark-circle';
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
            {/* Item Header */}
            <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.stockRow}>
                        <Ionicons name="cube-outline" size={16} color="#6B7280" />
                        <Text style={styles.stockText}>
                            Stock: <Text style={styles.stockValue}>{item.qty}</Text>
                        </Text>
                        <Text style={styles.minText}>Min: {item.minimum_level || 5}</Text>
                    </View>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                    <Ionicons name={getStatusIcon(item.status)} size={16} color={getStatusColor(item.status)} />
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={() => router.push({ pathname: '/storekeeper/history', params: { itemId: item.id, itemName: item.name } })}
                >
                    <Ionicons name="time-outline" size={18} color="#6B7280" />
                    <Text style={styles.historyBtnText}>History</Text>
                </TouchableOpacity>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleAction('ADD', item)}
                    >
                        <LinearGradient
                            colors={['#4CAF50', '#45A049']}
                            style={styles.actionBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="add" size={18} color="white" />
                            <Text style={styles.actionBtnText}>Add</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleAction('ISSUE', item)}
                    >
                        <LinearGradient
                            colors={['#2196F3', '#1976D2']}
                            style={styles.actionBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="arrow-up" size={18} color="white" />
                            <Text style={styles.actionBtnText}>Issue</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleAction('RETURN', item)}
                    >
                        <LinearGradient
                            colors={['#FF9800', '#F57C00']}
                            style={styles.actionBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="arrow-down" size={18} color="white" />
                            <Text style={styles.actionBtnText}>Return</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Gradient Header */}
            <LinearGradient
                colors={['#4CAF50', '#45A049', '#388E3C']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.greeting}>Inventory</Text>
                        <Text style={styles.title}>Manage Stock</Text>
                    </View>
                    <View style={styles.statsContainer}>
                        <Text style={styles.statsNumber}>{filteredItems.length}</Text>
                        <Text style={styles.statsLabel}>Items</Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search items..."
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            {/* Items List */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading inventory...</Text>
                </View>
            ) : filteredItems.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="cube-outline" size={64} color="#E5E7EB" />
                    <Text style={styles.emptyText}>
                        {searchText ? 'No items found' : 'No inventory items'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {searchText ? 'Try a different search term' : 'Add items to get started'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshing={loading}
                    onRefresh={fetchData}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    greeting: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        marginBottom: 4,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase'
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5
    },
    statsContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center'
    },
    statsNumber: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff'
    },
    statsLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1A1A2E',
        fontWeight: '500'
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        gap: 16
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600'
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 16
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 8,
        textAlign: 'center'
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
        gap: 12
    },
    itemCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        gap: 12
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12
    },
    itemInfo: {
        flex: 1,
        gap: 8
    },
    itemName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A2E',
        letterSpacing: -0.3
    },
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    stockText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500'
    },
    stockValue: {
        fontWeight: '700',
        color: '#1A1A2E'
    },
    minText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
        marginLeft: 4
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8
    },
    historyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        gap: 6
    },
    historyBtnText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600'
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center'
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3
    },
    actionBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    actionBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2
    }
});
