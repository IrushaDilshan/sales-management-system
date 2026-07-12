import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, StatusBar, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart, BarChart } from 'react-native-chart-kit';

export default function AnalyticsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [salesData, setSalesData] = useState<{ labels: string[], datasets: { data: number[] }[] } | null>(null);
    const [topItems, setTopItems] = useState<any[]>([]);
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        totalSales: 0,
        mostSoldItem: 'N/A'
    });
    const [period, setPeriod] = useState<'week' | 'month'>('week');

    const screenWidth = Dimensions.get('window').width;

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            // 1. Fetch Sales Data (Last 7 days or 30 days) for THIS salesman
            const days = period === 'week' ? 7 : 30;
            const today = new Date();
            const pastDate = new Date();
            pastDate.setDate(today.getDate() - days);

            // Query sales specifically for this salesman (using created_by)
            const { data: sales, error } = await supabase
                .from('sales')
                .select('created_at, total_amount')
                .eq('created_by', user.id)
                .gte('created_at', pastDate.toISOString())
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Sales fetch error:', error);
                // Don't throw, just show empty
            }

            // Process Sales Graph Data
            const chartLabels: string[] = [];
            const chartDataPoints: number[] = [];
            let revenue = 0;

            // Map dates to values to ensure we fill in gaps (days with 0 sales)
            const salesMap = new Map<string, number>();

            // Initialize map with all dates in range
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
                salesMap.set(dateKey, 0);
            }

            // Fill with actual data
            if (sales && sales.length > 0) {
                sales.forEach(sale => {
                    const dateKey = new Date(sale.created_at).toISOString().split('T')[0];
                    const amount = Number(sale.total_amount) || 0;
                    revenue += amount;

                    if (salesMap.has(dateKey)) {
                        salesMap.set(dateKey, (salesMap.get(dateKey) || 0) + amount);
                    }
                });
            }

            // Convert back to arrays for the chart
            let index = 0;
            salesMap.forEach((value, key) => {
                chartDataPoints.push(value);

                // Add label logic (don't show every single label for 30 days)
                const dateObj = new Date(key);
                const label = dateObj.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue...
                const dayNum = dateObj.getDate();

                if (period === 'week') {
                    // Show all labels for week
                    chartLabels.push(label);
                } else {
                    // Show label every 5 days for month
                    if (index % 5 === 0) {
                        chartLabels.push(`${dayNum}/${dateObj.getMonth() + 1}`);
                    } else {
                        chartLabels.push('');
                    }
                }
                index++;
            });

            setSalesData({
                labels: chartLabels,
                datasets: [{
                    data: chartDataPoints.length > 0 ? chartDataPoints : [0, 0, 0, 0, 0, 0, 0]
                }]
            });

            setSummary(prev => ({
                ...prev,
                totalRevenue: revenue,
                totalSales: sales?.length || 0
            }));


        } catch (error) {
            console.error('Analytics Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchAnalytics();
    };


    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Analytics</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Period Selector */}
                <View style={styles.periodSelector}>
                    <TouchableOpacity
                        style={[styles.periodBtn, period === 'week' && styles.periodBtnActive]}
                        onPress={() => setPeriod('week')}
                    >
                        <Text style={[styles.periodText, period === 'week' && styles.periodTextActive]}>This Week</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.periodBtn, period === 'month' && styles.periodBtnActive]}
                        onPress={() => setPeriod('month')}
                    >
                        <Text style={[styles.periodText, period === 'month' && styles.periodTextActive]}>Last 30 Days</Text>
                    </TouchableOpacity>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Total Revenue</Text>
                        <Text style={styles.summaryValue}>Rs.{summary.totalRevenue.toLocaleString()}</Text>
                        <View style={[styles.trendBadge, { backgroundColor: '#DCFCE7' }]}>
                            <Ionicons name="trending-up" size={14} color="#16A34A" />
                            <Text style={[styles.trendText, { color: '#16A34A' }]}> +12%</Text>
                        </View>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Total Sales</Text>
                        <Text style={styles.summaryValue}>{summary.totalSales}</Text>
                        <View style={[styles.trendBadge, { backgroundColor: '#F1F5F9' }]}>
                            <Text style={[styles.trendText, { color: '#64748B' }]}>Orders</Text>
                        </View>
                    </View>
                </View>

                {/* Sales Chart */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Sales Trend</Text>
                    {loading ? (
                        <ActivityIndicator style={{ height: 220 }} color="#2563EB" />
                    ) : (
                        <LineChart
                            data={salesData || { labels: [], datasets: [{ data: [0] }] }}
                            width={screenWidth - 48} // card padding
                            height={220}
                            yAxisLabel="Rs"
                            yAxisSuffix="k"
                            yAxisInterval={1}
                            chartConfig={{
                                backgroundColor: "#ffffff",
                                backgroundGradientFrom: "#ffffff",
                                backgroundGradientTo: "#ffffff",
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                                style: {
                                    borderRadius: 16
                                },
                                propsForDots: {
                                    r: "4",
                                    strokeWidth: "2",
                                    stroke: "#2563EB"
                                }
                            }}
                            bezier
                            style={{
                                marginVertical: 8,
                                borderRadius: 16
                            }}
                        />
                    )}
                </View>

                <View style={[styles.chartCard, { marginBottom: 40 }]}>
                    <Text style={styles.chartTitle}>Performance Insight</Text>
                    <View style={styles.insightRow}>
                        <Ionicons name="bulb-outline" size={24} color="#F59E0B" />
                        <Text style={styles.insightText}>
                            Your sales peak on <Text style={{ fontWeight: '700' }}>Weekends</Text>. Try stocking up on Friday.
                        </Text>
                    </View>
                </View>

            </ScrollView>
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    scrollContent: {
        padding: 20,
    },
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 4,
        borderRadius: 12,
        marginBottom: 20
    },
    periodBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    periodBtnActive: {
        backgroundColor: '#EEF2FF',
    },
    periodText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B'
    },
    periodTextActive: {
        color: '#2563EB'
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    summaryLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 8,
        fontWeight: '600'
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    trendText: {
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 4
    },
    chartCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        alignItems: 'center' // center chart
    },
    chartTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 16,
        alignSelf: 'flex-start'
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 12
    },
    insightText: {
        flex: 1,
        fontSize: 13,
        color: '#B45309',
        lineHeight: 18
    }
});
