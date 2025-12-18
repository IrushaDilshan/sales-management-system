import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SubmitIncomeScreen() {
    const router = useRouter();
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
            // If called from shop-owner dashboard with params
            setShopId(Array.isArray(paramShopId) ? paramShopId[0] : paramShopId);
            setShopName(Array.isArray(paramShopName) ? paramShopName[0] : paramShopName);
            setLoadingShop(false);
        } else {
            // If called from salesman dashboard, get user's shop
            fetchUserShop();
        }
    }, []);

    const fetchUserShop = async () => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            console.log('Fetching shop for user:', userEmail || 'No user');

            if (!userEmail) {
                console.warn('No authenticated user - fetching first shop');
                // For testing without auth: Get first shop
                const { data: allShops, error: shopsError } = await supabase
                    .from('shops')
                    .select('id, name')
                    .limit(1);

                console.log('Shops query result:', allShops, 'Error:', shopsError);

                if (shopsError) {
                    console.error('Error fetching shops:', shopsError);
                    Alert.alert('Database Error', `Could not fetch shops: ${shopsError.message}`);
                    router.back();
                    setLoadingShop(false);
                    return;
                }

                if (allShops && allShops.length > 0) {
                    setShopId(allShops[0].id);
                    setShopName(allShops[0].name);
                    console.log('Using first shop for testing:', allShops[0].name);
                } else {
                    console.error('No shops found in database');
                    Alert.alert('No Shops Available', 'No shops found in the database. Please add shops first.');
                    router.back();
                }
                setLoadingShop(false);
                return;
            }

            // Try to get user's assigned shop
            const { data: userRecord, error: userError } = await supabase
                .from('users')
                .select('shop_id, shops!inner(id, name)')
                .eq('email', userEmail)
                .limit(1);

            console.log('User record:', userRecord, 'Error:', userError);

            if (userRecord && userRecord.length > 0 && userRecord[0].shop_id && userRecord[0].shops) {
                setShopId(userRecord[0].shop_id);
                setShopName((userRecord[0].shops as any).name);
                console.log('Using assigned shop:', (userRecord[0].shops as any).name);
            } else {
                console.warn('No shop assigned to user, fetching first available shop');
                // Fallback to first shop
                const { data: firstShop, error: shopError } = await supabase
                    .from('shops')
                    .select('id, name')
                    .limit(1);

                if (shopError) {
                    console.error('Error fetching fallback shop:', shopError);
                }

                if (firstShop && firstShop.length > 0) {
                    setShopId(firstShop[0].id);
                    setShopName(firstShop[0].name);
                    console.log('Using fallback shop:', firstShop[0].name);
                } else {
                    Alert.alert('No Shops', 'No shops available in the system');
                    router.back();
                }
            }
        } catch (error) {
            console.error('Exception in fetchUserShop:', error);
            Alert.alert('Error', 'An unexpected error occurred while loading shop information');
            router.back();
        } finally {
            setLoadingShop(false);
        }
    };

    const handleSubmit = async () => {
        // Validation
        const total = parseFloat(totalSales);
        const cash = parseFloat(cashSales) || 0;
        const credit = parseFloat(creditSales) || 0;

        if (!totalSales || isNaN(total) || total <= 0) {
            Alert.alert('Error', 'Please enter valid total sales amount');
            return;
        }

        if (cash + credit !== total) {
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
                date: date.toISOString().split('T')[0], // YYYY-MM-DD format
                total_sales: parseFloat(totalSales),
                cash_sales: parseFloat(cashSales) || 0,
                credit_sales: parseFloat(creditSales) || 0,
                notes: notes || null,
                created_at: new Date().toISOString()
            };

            console.log('Submitting income record:', incomeRecord);

            const { error } = await supabase
                .from('daily_income')
                .insert([incomeRecord]);

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            console.log('Income submitted successfully');

            Alert.alert(
                'Success',
                'Daily income submitted successfully!',
                [{ text: 'OK', onPress: () => router.back() }]
            );

            // Reset form
            setTotalSales('');
            setCashSales('');
            setCreditSales('');
            setNotes('');
        } catch (error: any) {
            console.error('Error submitting income:', error);
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
                <Text style={{ marginTop: 10, color: '#6b7280' }}>Loading shop information...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Submit Daily Income</Text>
            </View>

            <View style={styles.shopCard}>
                <Ionicons name="storefront" size={20} color="#FF9800" />
                <Text style={styles.shopName}>{shopName}</Text>
            </View>

            <View style={styles.form}>
                {/* Date Picker */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Date *</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
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
                            keyboardType="decimal-pad"
                            value={totalSales}
                            onChangeText={setTotalSales}
                        />
                    </View>
                </View>

                {/* Cash Sales */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Cash Sales</Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.currency}>Rs.</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            value={cashSales}
                            onChangeText={setCashSales}
                        />
                    </View>
                </View>

                {/* Credit Sales */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Credit Sales</Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.currency}>Rs.</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            value={creditSales}
                            onChangeText={setCreditSales}
                        />
                    </View>
                </View>

                {/* Notes */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Notes (Optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Any additional notes..."
                        multiline
                        numberOfLines={4}
                        value={notes}
                        onChangeText={setNotes}
                    />
                </View>

                {/* Submit Button */}
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
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3
    },
    backBtn: {
        marginRight: 16,
        padding: 8
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1a1a2e'
    },
    shopCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3e0',
        padding: 16,
        margin: 20,
        borderRadius: 12,
        gap: 10
    },
    shopName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a2e'
    },
    form: {
        padding: 20
    },
    formGroup: {
        marginBottom: 20
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a2e',
        marginBottom: 8
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        gap: 12
    },
    dateText: {
        fontSize: 16,
        color: '#1a1a2e',
        fontWeight: '500'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        paddingLeft: 16
    },
    currency: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6b7280',
        marginRight: 8
    },
    input: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: '#1a1a2e',
        fontWeight: '600'
    },
    textArea: {
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        padding: 16,
        textAlignVertical: 'top',
        minHeight: 100
    },
    submitBtn: {
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 14,
        marginTop: 10,
        gap: 10,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    disabledBtn: {
        opacity: 0.6
    },
    submitBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800'
    }
});
