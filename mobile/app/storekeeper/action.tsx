import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
        let isMounted = true;

        const loadReps = async () => {
            if (type === 'ISSUE' && isMounted) {
                await fetchReps();
            }
        };

        loadReps();

        return () => {
            isMounted = false;
        };
    }, [type]);

    const fetchReps = async () => {
        try {
            console.log('Fetching representatives...');
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'rep');

            if (error) {
                console.error('Error fetching reps', error);
                return;
            }

            console.log('Fetched reps:', data);
            setReps(data || []);
        } catch (error: any) {
            // Silently handle abort errors (component unmounted)
            if (error.name !== 'AbortError') {
                console.error('Unexpected error fetching reps:', error);
            }
        }
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
                reference: reference,
                remarks: finalRemarks,
                rep_id: finalRepId,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('stock_transactions')
                .insert([transactionRecord]);

            if (error) throw error;

            // Update Stock Table logic
            const { data: stockData, error: getStockError } = await supabase
                .from('stock')
                .select('qty')
                .eq('item_id', itemId)
                .single();

            let currentStockVal = 0;
            if (stockData) {
                currentStockVal = stockData.qty;
            } else if (getStockError && getStockError.code !== 'PGRST116') {
                throw getStockError;
            }

            let newStockVal = currentStockVal;
            if (typeDb === 'IN') {
                // Add stock increases inventory
                newStockVal = currentStockVal + quantity;
            } else if (typeDb === 'OUT' || typeDb === 'RETURN') {
                // Issue and Return both decrease inventory
                // (Return removes damaged/expired items)
                newStockVal = currentStockVal - quantity;
            }

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
            case 'ADD': return 'Add New Stock';
            case 'ISSUE': return 'Issue Stock';
            case 'RETURN': return 'Return Stock';
            default: return 'Transaction';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'ADD': return 'add-circle';
            case 'ISSUE': return 'arrow-up-circle';
            case 'RETURN': return 'arrow-down-circle';
            default: return 'cube';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'ADD': return ['#4CAF50', '#45A049'];
            case 'ISSUE': return ['#2196F3', '#1976D2'];
            case 'RETURN': return ['#FF9800', '#F57C00'];
            default: return ['#4CAF50', '#45A049'];
        }
    };

    return (
        <View style={styles.container}>
            {/* Gradient Header */}
            <LinearGradient
                colors={getColor()}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Ionicons name={getIcon()} size={32} color="#FFF" />
                        <View style={styles.headerText}>
                            <Text style={styles.headerTitle}>{getTitle()}</Text>
                            <Text style={styles.headerSubtitle}>{itemName}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.formContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Quantity Input */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Quantity <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="calculator-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={qty}
                            onChangeText={setQty}
                            placeholder="Enter quantity"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                {/* Reference (ADD only) */}
                {type === 'ADD' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Reference (Invoice / GRN)</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="document-text-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={reference}
                                onChangeText={setReference}
                                placeholder="Optional reference"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>
                )}

                {/* Representative Selector (ISSUE only) */}
                {type === 'ISSUE' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Select Representative <Text style={styles.required}>*</Text>
                        </Text>
                        <TouchableOpacity
                            style={styles.selectButton}
                            onPress={() => {
                                if (reps.length === 0) {
                                    Alert.alert('No Representatives', 'No representatives found in the system.');
                                    return;
                                }

                                const buttons = reps.map(rep => ({
                                    text: rep.name,
                                    onPress: () => setRepId(rep.id)
                                }));

                                buttons.push({
                                    text: 'Cancel',
                                    style: 'cancel' as any
                                });

                                Alert.alert(
                                    'Select Representative',
                                    'Choose a representative to issue stock to:',
                                    buttons
                                );
                            }}
                        >
                            <View style={styles.selectButtonContent}>
                                <Ionicons name="person-outline" size={20} color="#6B7280" />
                                <Text style={repId ? styles.selectButtonTextSelected : styles.selectButtonText}>
                                    {repId ? reps.find(r => r.id === repId)?.name : '-- Select Representative --'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color="#6B7280" />
                        </TouchableOpacity>
                        {reps.length > 0 && (
                            <Text style={styles.helperText}>
                                {reps.length} representative{reps.length !== 1 ? 's' : ''} available
                            </Text>
                        )}
                    </View>
                )}

                {/* Reason Selector (RETURN only) */}
                {type === 'RETURN' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Reason</Text>
                        <TouchableOpacity
                            style={styles.selectButton}
                            onPress={() => {
                                const reasons = [
                                    { text: 'Damaged', value: 'Damaged' },
                                    { text: 'Expired', value: 'Expired' },
                                    { text: 'Order Error', value: 'Error' },
                                    { text: 'Other', value: 'Other' }
                                ];

                                const buttons = reasons.map(r => ({
                                    text: r.text,
                                    onPress: () => setReason(r.value)
                                }));

                                buttons.push({
                                    text: 'Cancel',
                                    style: 'cancel' as any
                                });

                                Alert.alert(
                                    'Select Reason',
                                    'Why is this stock being returned?',
                                    buttons
                                );
                            }}
                        >
                            <View style={styles.selectButtonContent}>
                                <Ionicons name="alert-circle-outline" size={20} color="#6B7280" />
                                <Text style={reason ? styles.selectButtonTextSelected : styles.selectButtonText}>
                                    {reason || 'Select Reason'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Remarks */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Remarks</Text>
                    <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                        <Ionicons name="chatbox-outline" size={20} color="#6B7280" style={styles.inputIconTop} />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            multiline
                            numberOfLines={3}
                            value={remarks}
                            onChangeText={setRemarks}
                            placeholder="Add notes..."
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={getColor()}
                        style={styles.submitGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                                <Text style={styles.submitBtnText}>Submit Transaction</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
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
        paddingBottom: 24,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8
    },
    headerContent: {
        gap: 16
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    headerText: {
        flex: 1
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.5
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 4,
        fontWeight: '600'
    },
    scrollView: {
        flex: 1
    },
    formContainer: {
        padding: 20,
        gap: 20
    },
    inputGroup: {
        gap: 8
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A2E',
        letterSpacing: 0.2,
        textTransform: 'uppercase'
    },
    required: {
        color: '#F44336'
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        minHeight: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    textAreaWrapper: {
        alignItems: 'flex-start',
        paddingTop: 14,
        minHeight: 100
    },
    inputIcon: {
        marginRight: 10
    },
    inputIconTop: {
        marginRight: 10,
        marginTop: 2
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#1A1A2E',
        fontWeight: '500'
    },
    textArea: {
        textAlignVertical: 'top',
        minHeight: 70
    },
    selectButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        minHeight: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    selectButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1
    },
    selectButtonText: {
        fontSize: 15,
        color: '#9CA3AF',
        fontWeight: '500'
    },
    selectButtonTextSelected: {
        fontSize: 15,
        color: '#1A1A2E',
        fontWeight: '600'
    },
    helperText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
        fontStyle: 'italic'
    },
    submitBtn: {
        marginTop: 12,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    submitBtnDisabled: {
        opacity: 0.6
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3
    }
});
