import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RepTabsLayout() {
    const insets = useSafeAreaInsets();

    // Responsive height calculation similar to Salesman dashboard
    const tabBarHeight = Platform.OS === 'ios' ? 60 + insets.bottom : 60 + insets.bottom + 10;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: '#2563EB', // Blue to match Salesman
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
                name="shops"
                options={{
                    title: 'Shops',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "storefront" : "storefront-outline"} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="stock"
                options={{
                    title: 'Stock',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "cube" : "cube-outline"} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "settings" : "settings-outline"} size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
