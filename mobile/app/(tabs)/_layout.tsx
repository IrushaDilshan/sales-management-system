import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, Platform, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const CustomCenterButton = ({ children, onPress }: any) => (
    <View style={{
        width: 70,
        height: 70,
        marginTop: -35, // Push it up by half its height to float
        alignItems: 'center',
        justifyContent: 'center',
    }}>
        <TouchableOpacity
            style={styles.centerButton}
            onPress={onPress}
            activeOpacity={0.9}
        >
            {children}
        </TouchableOpacity>
    </View>
);

export default function TabLayout() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Responsive height calculation
    const tabBarHeight = Platform.OS === 'ios' ? 60 + insets.bottom : 60 + insets.bottom + 10;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#64748B',
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    height: tabBarHeight,
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    paddingTop: 8,
                    paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    marginTop: 2
                }
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="accounts"
                options={{
                    title: 'Accounts',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} />
                    ),
                }}
            />

            {/* Center Action Button */}
            <Tabs.Screen
                name="scan"
                options={{
                    title: '',
                    tabBarIcon: ({ focused }) => (
                        <Ionicons name="qr-code-outline" size={26} color="#FFFFFF" />
                    ),
                    tabBarButton: (props) => (
                        <CustomCenterButton {...props} onPress={() => router.push('/salesman/submit-sale')}>
                            <Ionicons name="qr-code-outline" size={26} color="#FFFFFF" />
                        </CustomCenterButton>
                    ),
                    tabBarLabelStyle: { display: 'none' } // Hide label for center button
                }}
                listeners={() => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        router.push('/salesman/submit-sale');
                    },
                })}
            />

            <Tabs.Screen
                name="history"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'More',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    centerButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#2563EB', // Blue
        justifyContent: 'center',
        alignItems: 'center',
        // White border to separate from bar background
        borderWidth: 4,
        borderColor: '#F3F4F6', // Match app background or white
        shadowColor: '#2563EB',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    }
});
