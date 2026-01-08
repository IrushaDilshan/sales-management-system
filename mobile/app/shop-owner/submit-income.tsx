import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SubmitIncomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const { shop_id: paramShopId, shop_name: paramShopName } = params;

    const [shopId, setShopId] = useState<string | null>(null);
    const [shopName, setShopName] = useState<string>('');
    const [loadingShop, setLoadingShop] = useState(true);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [totalSales, setTotalSales] = useState('');
    const [cashSales, setCashSales] = useState('');
    const [creditSales, setCreditSales] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (paramShopId && paramShopName) {
            setShopId(Array.isArray(paramShopId) ? paramShopId[0] : paramShopId);
            setShopName(Array.isArray(paramShopName) ? paramShopName[0] : paramShopName);
            setLoadingShop(false);
        } else {
            fetchUserShop();
        }
    }, []);

    const fetchUserShop = async () => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            if (!userEmail) {
                const { data: allShops, error: shopsError } = await supabase
                    .from('shops')
                    .select('id, name')
                    .limit(1);

                if (allShops && allShops.length > 0) {
                    setShopId(allShops[0].id);
                    setShopName(allShops[0].name);
                } else {
                    Alert.alert('No Shops Available', 'No shops found in the database. Please add shops first.');
                    router.back();
                }
                setLoadingShop(false);
                return;
            }

            const { data: userRecord, error: userError } = await supabase
                .from('users')
                .select('shop_id, shops!inner(id, name)')
                .eq('email', userEmail)
                .limit(1);

            if (userRecord && userRecord.length > 0 && userRecord[0].shop_id && userRecord[0].shops) {
                setShopId(userRecord[0].shop_id);
                setShopName((userRecord[0].shops as any).name);
            } else {
                const { data: firstShop } = await supabase
                    .from('shops')
                    .select('id, name')
                    .limit(1);

                if (firstShop && firstShop.length > 0) {
                    setShopId(firstShop[0].id);
                    setShopName(firstShop[0].name);
                } else {
                    Alert.alert('No Shops', 'No shops available in the system');
                    router.back();
                }
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred while loading shop information');
            router.back();
        } finally {
            setLoadingShop(false);
        }
    };

    const handleSubmit = async () => {
        const total = parseFloat(totalSales);
        const cash = parseFloat(cashSales) || 0;
        const credit = parseFloat(creditSales) || 0;

        if (!totalSales || isNaN(total) || total <= 0) {
            Alert.alert('Error', 'Please enter valid total sales amount');
            return;
        }

        if (cash + credit !== total && (cash > 0 || credit > 0)) {
            Alert.alert(
                'Warning',
                `Cash (${cash}) + Credit (${credit}) should equal Total Sales (${total})`,
                [
                    { text: 'Edit', style: 'cancel' },
                    { text: 'Submit Anyway', onPress: () => submitIncome() }
                ]
            );
            return;
        }

        await submitIncome();
    };

    const submitIncome = async () => {
        setLoading(true);
        try {
            const incomeRecord = {
                shop_id: shopId,
                date: date.toISOString().split('T')[0],
                total_sales: parseFloat(totalSales),
                cash_sales: parseFloat(cashSales) || 0,
                credit_sales: parseFloat(creditSales) || 0,
                notes: notes || null,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('daily_income')
                .insert([incomeRecord]);

            if (error) throw error;

            Alert.alert(
                'Success',
                'Daily income submitted successfully!',
                [{ text: 'OK', onPress: () => router.back() }]
            );

            setTotalSales('');
            setCashSales('');
            setCreditSales('');
            setNotes('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit income');
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    if (loadingShop) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Daily Income</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Shop Banner */}
                <View style={styles.shopCard}>
                    <View style={styles.shopIconContainer}>
                        <Ionicons name="storefront" size={20} color="#F59E0B" />
                    </View>
                    <Text style={styles.shopName}>{shopName}</Text>
                </View>

                {/* Date Selection */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Date *</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color="#64748B" />
                        <Text style={styles.dateText}>
                            {date.toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                    />
                )}

                {/* Total Sales */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Total Sales *</Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.currency}>Rs.</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            placeholderTextColor="#94A3B8"
                            keyboardType="decimal-pad"
                            value={totalSales}
                            onChangeText={setTotalSales}
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    {/* Cash Sales */}
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Cash Sales</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.currency}>Rs.</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor="#94A3B8"
                                keyboardType="decimal-pad"
                                value={cashSales}
                                onChangeText={setCashSales}
                            />
                        </View>
                    </View>

                    {/* Credit Sales */}
                    <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Credit Sales</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.currency}>Rs.</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor="#94A3B8"
                                keyboardType="decimal-pad"
                                value={creditSales}
                                onChangeText={setCreditSales}
                            />
                        </View>
                    </View>
                </View>

                {/* Notes */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Notes (Optional)</Text>
                    <TextInput
                        style={[styles.inputContainer, styles.textArea]}
                        placeholder="Any additional notes..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={4}
                        value={notes}
                        onChangeText={setNotes}
                    />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.disabledBtn]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={24} color="white" />
                            <Text style={styles.submitBtnText}>Submit Income</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF'
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
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center'
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100
    },
    shopCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        gap: 12,
        borderWidth: 1,
        borderColor: '#FEF3C7'
    },
    shopIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shopName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#B45309'
    },
    formGroup: {
        marginBottom: 20
    },
    row: {
        flexDirection: 'row',
        marginBottom: 8
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
        textTransform: 'uppercase'
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12
    },
    dateText: {
        fontSize: 15,
        color: '#0F172A',
        fontWeight: '500'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        height: 52
    },
    currency: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
        marginRight: 8
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '600'
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
        paddingTop: 16,
        paddingBottom: 16
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        padding: 20,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    submitBtn: {
        backgroundColor: '#4CAF50', // Green
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 10,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    disabledBtn: {
        backgroundColor: '#94A3B8',
        shadowOpacity: 0
    },
    submitBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700'
    }
});
