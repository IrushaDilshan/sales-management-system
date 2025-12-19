import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#2196F3',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                    paddingTop: 0,
                    paddingHorizontal: 16,
                    elevation: 0,
                    position: 'absolute',
                },
                tabBarBackground: () => (
                    <View style={{
                        flex: 1,
                        overflow: 'hidden',
                    }}>
                        {/* Glass Effect Container */}
                        <View style={{
                            position: 'absolute',
                            bottom: 12,
                            left: 20,
                            right: 20,
                            height: Platform.OS === 'ios' ? 64 : 56,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 32,
                            shadowColor: '#2196F3',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.15,
                            shadowRadius: 20,
                            elevation: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.8)',
                        }}>
                            {/* Subtle top gradient shine */}
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 0.3 }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '50%',
                                    borderTopLeftRadius: 32,
                                    borderTopRightRadius: 32,
                                }}
                            />
                        </View>
                    </View>
                ),
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '700',
                    marginTop: 6,
                    marginBottom: 2,
                    letterSpacing: 0.5,
                },
                tabBarIconStyle: {
                    marginTop: 8,
                    marginBottom: 2,
                },
                tabBarItemStyle: {
                    paddingVertical: 6,
                    gap: 4,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            position: 'relative',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            {focused && (
                                // Animated Indicator at Top
                                <View style={{
                                    position: 'absolute',
                                    top: -8,
                                    width: 40,
                                    height: 4,
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                }}>
                                    <LinearGradient
                                        colors={['#2196F3', '#1976D2']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                        }}
                                    />
                                </View>
                            )}

                            <View style={{
                                width: 50,
                                height: 50,
                                borderRadius: 25,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: focused ? 'rgba(33, 150, 243, 0.12)' : 'transparent',
                            }}>
                                {focused ? (
                                    <LinearGradient
                                        colors={['#2196F3', '#1976D2']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={{
                                            width: 46,
                                            height: 46,
                                            borderRadius: 23,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Ionicons
                                            name="home"
                                            size={24}
                                            color="#FFFFFF"
                                        />
                                    </LinearGradient>
                                ) : (
                                    <Ionicons
                                        name="home-outline"
                                        size={24}
                                        color={color}
                                    />
                                )}
                            </View>
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            position: 'relative',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            {focused && (
                                // Animated Indicator at Top
                                <View style={{
                                    position: 'absolute',
                                    top: -8,
                                    width: 40,
                                    height: 4,
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                }}>
                                    <LinearGradient
                                        colors={['#2196F3', '#1976D2']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                        }}
                                    />
                                </View>
                            )}

                            <View style={{
                                width: 50,
                                height: 50,
                                borderRadius: 25,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: focused ? 'rgba(33, 150, 243, 0.12)' : 'transparent',
                            }}>
                                {focused ? (
                                    <LinearGradient
                                        colors={['#2196F3', '#1976D2']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={{
                                            width: 46,
                                            height: 46,
                                            borderRadius: 23,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Ionicons
                                            name="settings"
                                            size={24}
                                            color="#FFFFFF"
                                        />
                                    </LinearGradient>
                                ) : (
                                    <Ionicons
                                        name="settings-outline"
                                        size={24}
                                        color={color}
                                    />
                                )}
                            </View>
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}
