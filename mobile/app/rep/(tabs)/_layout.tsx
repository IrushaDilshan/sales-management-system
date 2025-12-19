import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';

export default function RepTabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#2196F3',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 0,
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                    paddingTop: 8,
                    position: 'absolute',
                    left: 16,
                    right: 16,
                    bottom: 16,
                    borderRadius: 24,
                    overflow: 'hidden'
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '700',
                    letterSpacing: 0.3
                },
                tabBarItemStyle: {
                    paddingVertical: 4
                },
                tabBarIconStyle: {
                    marginTop: 4
                }
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: focused ? '#E3F2FD' : 'transparent'
                        }}>
                            {focused && (
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 3,
                                    borderRadius: 2,
                                    background: 'linear-gradient(90deg, #2196F3 0%, #1976D2 100%)',
                                    backgroundColor: '#2196F3'
                                }} />
                            )}
                            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
                        </View>
                    )
                }}
            />
            <Tabs.Screen
                name="shops"
                options={{
                    title: 'Shops',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: focused ? '#E3F2FD' : 'transparent'
                        }}>
                            {focused && (
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 3,
                                    borderRadius: 2,
                                    background: 'linear-gradient(90deg, #2196F3 0%, #1976D2 100%)',
                                    backgroundColor: '#2196F3'
                                }} />
                            )}
                            <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={24} color={color} />
                        </View>
                    )
                }}
            />
            <Tabs.Screen
                name="stock"
                options={{
                    title: 'Stock',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: focused ? '#E3F2FD' : 'transparent'
                        }}>
                            {focused && (
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 3,
                                    borderRadius: 2,
                                    background: 'linear-gradient(90deg, #2196F3 0%, #1976D2 100%)',
                                    backgroundColor: '#2196F3'
                                }} />
                            )}
                            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={24} color={color} />
                        </View>
                    )
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: focused ? '#E3F2FD' : 'transparent'
                        }}>
                            {focused && (
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 3,
                                    borderRadius: 2,
                                    background: 'linear-gradient(90deg, #2196F3 0%, #1976D2 100%)',
                                    backgroundColor: '#2196F3'
                                }} />
                            )}
                            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
                        </View>
                    )
                }}
            />
        </Tabs>
    );
}
