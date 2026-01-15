import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* 
  NOTE: This page requires Migration 13 (expenses table) to be applied to the database.
  If the table is missing, it will gracefully show an empty state or error.
*/

export default function ExpensesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Fuel');
    const [description, setDescription] = useState('');

    const categories = ['Fuel', 'Food', 'Transport', 'Maintenance', 'Other'];

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('salesman_id', user.id)
                .order('date', { ascending: false });

            if (error) {
                if (error.code === '42P01') { // undefined_table
                    console.warn('Expenses table missing');
                    // Alert.alert('Update Required', 'Please run database migration 13.');
                } else {
                    console.error('Error fetching expenses:', error);
                }
            } else {
                setExpenses(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user logged in');

            const { error } = await supabase
                .from('expenses')
                .insert([{
                    amount: parseFloat(amount),
                    category,
                    description,
                    salesman_id: user.id
                }]);

            if (error) throw error;

            Alert.alert('Success', 'Expense added successfully');
            setModalVisible(false);
            setAmount('');
            setDescription('');
            setCategory('Fuel');
            fetchExpenses();

        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add expense');
        } finally {
            setSubmitting(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.iconBox}>
                <Ionicons
                    name={
                        item.category === 'Fuel' ? 'color-fill' :
                            item.category === 'Food' ? 'restaurant' :
                                item.category === 'Transport' ? 'bus' :
                                    item.category === 'Maintenance' ? 'build' : 'receipt'
                    }
                    size={20}
                    color="#64748B"
                />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
                {item.description ? <Text style={styles.description} numberOfLines={1}>{item.description}</Text> : null}
            </View>
            <Text style={styles.amount}>- Rs.{item.amount.toLocaleString()}</Text>
        </View>
    );

    const getTotalThisMonth = () => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        return expenses.reduce((sum, item) => {
            const d = new Date(item.date);
            if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
                return sum + Number(item.amount);
            }
            return sum;
        }, 0);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Expenses</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Summary Card */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total This Month</Text>
                    <Text style={styles.summaryValue}>Rs. {getTotalThisMonth().toLocaleString()}</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={expenses}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No expenses recorded yet.</Text>
                        </View>
                    }
                />
            )}

            {/* Add Expense Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Expense</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Amount (Rs)</Text>
                            <TextInput
                                style={[styles.input, { fontSize: 20, fontWeight: '700' }]}
                                keyboardType="numeric"
                                placeholder="0.00"
                                value={amount}
                                onChangeText={setAmount}
                                autoFocus
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.categoryRow}>
                                {categories.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.catChip, category === cat && styles.catChipActive]}
                                        onPress={() => setCategory(cat)}
                                    >
                                        <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Fuel for Van 1"
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && styles.disabledBtn]}
                            onPress={handleAddExpense}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Expense</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        backgroundColor: '#fff',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2563EB', // Blue
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    summaryContainer: {
        padding: 20,
    },
    summaryCard: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#1E293B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    summaryLabel: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4
    },
    summaryValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700'
    },
    list: {
        padding: 20,
        paddingTop: 0
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    cardContent: {
        flex: 1
    },
    category: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A'
    },
    date: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2
    },
    description: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
        fontStyle: 'italic'
    },
    amount: {
        fontSize: 15,
        fontWeight: '700',
        color: '#EF4444' // Red for expense
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 14
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 450
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A'
    },
    inputGroup: {
        marginBottom: 20
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        color: '#0F172A'
    },
    categoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    catChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    catChipActive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE'
    },
    catText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500'
    },
    catTextActive: {
        color: '#2563EB',
        fontWeight: '700'
    },
    submitBtn: {
        backgroundColor: '#2563EB',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8
    },
    disabledBtn: {
        opacity: 0.7
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700'
    }
});
