import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/theme';
import { Picker } from '@react-native-picker/picker';

export default function ActionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { type, itemId, itemName, currentQty } = params;

    const [loading, setLoading] = useState(false);
    const [reps, setReps] = useState<any[]>([]);

    // Form State
    const [qty, setQty] = useState('');
    const [reference, setReference] = useState('');
    const [reason, setReason] = useState('');
    const [remarks, setRemarks] = useState(type === 'ADD' ? 'Added by storekeeper' : '');
    const [repId, setRepId] = useState('');

    useEffect(() => {
        if (type === 'ISSUE') {
            fetchReps();
        }
    }, [type]);

    const fetchReps = async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'rep');
        if (data) setReps(data);
        if (error) console.error('Error fetching reps', error);
    };

    const handleSubmit = async () => {
        const quantity = parseInt(qty, 10);

        if (!quantity || quantity <= 0) {
            Alert.alert('Error', 'Please enter a valid quantity.');
            return;
        }

        try {
            setLoading(true);

            let typeDb = 'IN';
            let finalRemarks = remarks;
            let finalRepId = null;

            if (type === 'ADD') {
                typeDb = 'IN';
                finalRemarks = finalRemarks || 'Added by storekeeper';
            } else if (type === 'RETURN') {
                typeDb = 'RETURN';
                finalRemarks = `${reason ? reason + ' - ' : ''}${finalRemarks}`;
            } else if (type === 'ISSUE') {
                typeDb = 'OUT';

                // Validate stock logic
                const stock = parseInt(Array.isArray(currentQty) ? currentQty[0] : currentQty || '0', 10);
                if (stock < quantity) {
                    throw new Error(`Insufficient stock. Available: ${stock}`);
                }

                if (!repId) {
                    throw new Error('Please select a Representative.');
                }
                finalRepId = repId;

                const repName = reps.find(r => r.id === repId)?.name || 'Unknown Rep';
                finalRemarks = `Issued to ${repName} - ${finalRemarks}`;
            }

            const transactionRecord = {
                item_id: itemId,
                type: typeDb,
                qty: quantity,
                reference: reference, // This might only be relevant for 'ADD' but passing anyway logic-wise
                remarks: finalRemarks,
                rep_id: finalRepId,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('stock_transactions')
                .insert([transactionRecord]);

            if (error) throw error;

            // Update Stock Table logic
            // 1. Get current stock for this item (to be safe)
            const { data: stockData, error: getStockError } = await supabase
                .from('stock')
                .select('qty')
                .eq('item_id', itemId)
                .single(); // Use single() and handle error if null (row doesn't exist)

            let currentStockVal = 0;
            if (stockData) {
                currentStockVal = stockData.qty;
            } else if (getStockError && getStockError.code !== 'PGRST116') {
                // Real error
                throw getStockError;
            }

            let newStockVal = currentStockVal;
            if (typeDb === 'IN' || typeDb === 'RETURN') {
                newStockVal = currentStockVal + quantity;
            } else if (typeDb === 'OUT') {
                newStockVal = currentStockVal - quantity;
            }

            // 2. Upsert new stock value
            const { error: upsertError } = await supabase
                .from('stock')
                .upsert({ item_id: itemId, qty: newStockVal }, { onConflict: 'item_id' });

            if (upsertError) throw upsertError;

            Alert.alert('Success', 'Transaction recorded successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);

        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.message || 'Transaction failed.');
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'ADD': return 'Add New Stock (IN)';
            case 'ISSUE': return 'Issue Stock (OUT)';
            case 'RETURN': return 'Return Stock';
            default: return 'Transaction';
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.formCard}>
                <Text style={styles.title}>{getTitle()}</Text>
                <Text style={styles.subtitle}>Item: {itemName}</Text>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Quantity <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={qty}
                        onChangeText={setQty}
                        placeholder="Enter quantity"
                    />
                </View>

                {type === 'ADD' && (
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Reference (Invoice / GRN)</Text>
                        <TextInput
                            style={styles.input}
                            value={reference}
                            onChangeText={setReference}
                            placeholder="Optional reference"
                        />
                    </View>
                )}

                {type === 'ISSUE' && (
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Select Representative <Text style={styles.required}>*</Text></Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={repId}
                                onValueChange={(itemValue) => setRepId(itemValue)}
                                style={styles.picker}
                            >
                                <Picker.Item label="-- Select Rep --" value="" />
                                {reps.map(r => (
                                    <Picker.Item key={r.id} label={r.name} value={r.id} />
                                ))}
                            </Picker>
                        </View>
                    </View>
                )}

                {type === 'RETURN' && (
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Reason</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={reason}
                                onValueChange={(itemValue) => setReason(itemValue)}
                                style={styles.picker}
                            >
                                <Picker.Item label="Select Reason" value="" />
                                <Picker.Item label="Damaged" value="Damaged" />
                                <Picker.Item label="Expired" value="Expired" />
                                <Picker.Item label="Order Error" value="Error" />
                                <Picker.Item label="Other" value="Other" />
                            </Picker>
                        </View>
                    </View>
                )}

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Remarks</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={3}
                        value={remarks}
                        onChangeText={setRemarks}
                        placeholder="Add notes..."
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.disabledBtn]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Transaction</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        marginBottom: 40,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    formGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        color: '#444',
        marginBottom: 8,
        fontWeight: '500',
    },
    required: {
        color: 'red',
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    submitBtn: {
        backgroundColor: Colors.light.tint,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
