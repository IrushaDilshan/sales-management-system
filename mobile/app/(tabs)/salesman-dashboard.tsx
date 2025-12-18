import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function SalesmanDashboard() {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/login' as any);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Welcome Back!</Text>
                    <Text style={styles.title}>Salesman Dashboard</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Actions Grid */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <View style={styles.actionsGrid}>
                    {/* New Sales Request */}
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: '#2196F3' }]}
                        onPress={() => router.push('/shops')}
                    >
                        <Ionicons name="cart-outline" size={40} color="white" />
                        <Text style={styles.actionTitle}>New Sales Request</Text>
                        <Text style={styles.actionSubtitle}>Create order</Text>
                    </TouchableOpacity>

                    {/* Submit Daily Income */}
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: '#4CAF50' }]}
                        onPress={() => router.push('/shop-owner/submit-income')}
                    >
                        <Ionicons name="cash-outline" size={40} color="white" />
                        <Text style={styles.actionTitle}>Submit Daily Income</Text>
                        <Text style={styles.actionSubtitle}>Record sales</Text>
                    </TouchableOpacity>

                    {/* View Income History */}
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: '#9C27B0' }]}
                        onPress={() => router.push('/salesman/income-history')}
                    >
                        <Ionicons name="bar-chart-outline" size={40} color="white" />
                        <Text style={styles.actionTitle}>Income History</Text>
                        <Text style={styles.actionSubtitle}>View records</Text>
                    </TouchableOpacity>

                    {/* View Request History */}
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: '#FF9800' }]}
                        onPress={() => router.push('/salesman/request-history')}
                    >
                        <Ionicons name="receipt-outline" size={40} color="white" />
                        <Text style={styles.actionTitle}>Request History</Text>
                        <Text style={styles.actionSubtitle}>View requests</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#2196F3',
        padding: 20,
        paddingTop: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    greeting: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 4
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff'
    },
    logoutBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)'
    },
    scrollView: {
        flex: 1
    },
    content: {
        padding: 20
    },
    actionsGrid: {
        gap: 16
    },
    actionCard: {
        padding: 24,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        alignItems: 'center',
        minHeight: 160,
        justifyContent: 'center'
    },
    actionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: 'white',
        marginTop: 16,
        textAlign: 'center'
    },
    actionSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 8,
        textAlign: 'center'
    }
});
